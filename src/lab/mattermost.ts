import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const MATTERMOST_IMAGE = "mattermost/mattermost-team-edition:12.1.0"
const POSTGRES_IMAGE = "postgres:16-alpine"
export const PLUGIN_BUNDLE =
  "https://github.com/mattermost/mattermost-plugin-msteams-meetings/releases/download/v3.0.0/mattermost-plugin-msteams-meetings-v3.0.0-linux-amd64.tar.gz"
export const PLUGIN_ID = "com.mattermost.msteamsmeetings"

const NETWORK = "shuvuln-lab"
const CONTAINER = "shuvuln-mattermost"
const DATABASE = "shuvuln-postgres"
/** The lab's own accounts. They exist only inside the container's data volume. */
const PASSWORD = "shuvuln-lab-password-1"

export interface LabAccount {
  email: string
  username: string
  password: string
}

export const ACCOUNTS = {
  admin: { email: "admin@lab.example", username: "admin", password: PASSWORD },
  attacker: { email: "attacker@lab.example", username: "attacker", password: PASSWORD },
  victim: { email: "victim@lab.example", username: "victim", password: PASSWORD },
} satisfies Record<string, LabAccount>

function docker(args: string[]): string {
  const run = spawnSync("docker", args, { encoding: "utf8", timeout: 600_000 })
  if (run.status !== 0) throw new Error(`docker ${args[0]} failed: ${run.stderr.trim()}`)
  return run.stdout.trim()
}

/** Starts Mattermost on a network with no way out, and returns the address the host can reach. */
export function startMattermost(): string {
  const existing = spawnSync("docker", ["network", "inspect", NETWORK], { encoding: "utf8" })
  if (existing.status !== 0) docker(["network", "create", "--internal", NETWORK])
  docker(["rm", "-f", DATABASE])
  docker([
    "run",
    "-d",
    "--name",
    DATABASE,
    "--network",
    NETWORK,
    "-e",
    "POSTGRES_USER=mmuser",
    "-e",
    "POSTGRES_PASSWORD=mostpass",
    "-e",
    "POSTGRES_DB=mattermost_test",
    POSTGRES_IMAGE,
  ])
  const ready = Date.now() + 180_000
  while (spawnSync("docker", ["exec", DATABASE, "pg_isready", "-U", "mmuser"]).status !== 0) {
    if (Date.now() > ready) throw new Error("postgres did not become ready")
    spawnSync("sleep", ["2"])
  }
  docker(["rm", "-f", CONTAINER])
  docker([
    "run",
    "-d",
    "--name",
    CONTAINER,
    "--platform",
    "linux/amd64",
    "--network",
    NETWORK,
    "-e",
    "MM_SERVICESETTINGS_SITEURL=http://mattermost-lab:8065",
    "-e",
    "MM_SERVICESETTINGS_ENABLEDEVELOPER=true",
    "-e",
    "MM_TEAMSETTINGS_ENABLEOPENSERVER=true",
    "-e",
    "MM_EMAILSETTINGS_REQUIREEMAILVERIFICATION=false",
    "-e",
    "MM_EMAILSETTINGS_SENDEMAILNOTIFICATIONS=false",
    "-e",
    "MM_PLUGINSETTINGS_ENABLEUPLOADS=true",
    "-e",
    "MM_PLUGINSETTINGS_ENABLE=true",
    "-e",
    "MM_SQLSETTINGS_DRIVERNAME=postgres",
    "-e",
    `MM_SQLSETTINGS_DATASOURCE=postgres://mmuser:mostpass@${DATABASE}:5432/mattermost_test?sslmode=disable&connect_timeout=10`,
    MATTERMOST_IMAGE,
    "/mattermost/bin/mattermost",
    "server",
  ])
  const ip = docker([
    "inspect",
    "-f",
    "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
    CONTAINER,
  ])
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) throw new Error(`no address for the lab container: ${ip}`)
  return `http://${ip}:8065`
}

export function stopMattermost(): void {
  docker(["rm", "-f", CONTAINER])
  spawnSync("docker", ["rm", "-f", DATABASE])
}

/** Downloads the plugin release once and returns its bytes. */
export async function pluginBundle(): Promise<Buffer> {
  const cache = join(tmpdir(), "shuvuln-plugin-bundles")
  const file = join(cache, PLUGIN_BUNDLE.split("/").pop() ?? "bundle.tar.gz")
  try {
    return readFileSync(file)
  } catch {
    const response = await fetch(PLUGIN_BUNDLE, { signal: AbortSignal.timeout(300_000) })
    if (!response.ok) throw new Error(`plugin bundle: GitHub answered ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    mkdirSync(cache, { recursive: true, mode: 0o700 })
    writeFileSync(file, bytes, { mode: 0o600 })
    return bytes
  }
}

export class Mattermost {
  readonly base: string
  private token: string | null = null

  constructor(base: string) {
    this.base = base
  }

  /** The session token, for the event stream's authentication. */
  sessionToken(): string {
    return this.token ?? ""
  }

  static async login(base: string, account: LabAccount): Promise<Mattermost> {
    const mm = new Mattermost(base)
    await mm.request("POST", "/api/v4/users/login", {
      login_id: account.email,
      password: account.password,
    })
    return mm
  }

  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(this.base + path, {
      method,
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(60_000),
    })
    const token = response.headers.get("token")
    if (token) this.token = token
    const text = await response.text()
    const data: unknown = text ? JSON.parse(text) : null
    if (!response.ok)
      throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data).slice(0, 300)}`)
    return data
  }

  async installPlugin(bytes: Buffer): Promise<void> {
    const form = new FormData()
    form.append("plugin", new Blob([bytes]), "plugin.tar.gz")
    form.append("force", "true")
    const response = await fetch(this.base + "/api/v4/plugins", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
      signal: AbortSignal.timeout(300_000),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`plugin install: ${response.status} ${text.slice(0, 300)}`)
    // The plugin will not activate without OAuth settings. The lab has no way out, so
    // placeholder values are enough: the candidate under test runs before any Microsoft call.
    await this.request("PUT", "/api/v4/config/patch", {
      PluginSettings: {
        Plugins: {
          [PLUGIN_ID]: {
            oauth2authority: "https://login.microsoftonline.com/lab-tenant",
            oauth2clientid: "lab-client",
            oauth2clientsecret: "lab-secret",
            encryptionkey: "lab placeholder, never a real key",
          },
        },
      },
    })
    await this.request("POST", `/api/v4/plugins/${PLUGIN_ID}/enable`)
  }
}

/** Waits until Mattermost answers, up to the emulation's slow start. */
export async function waitForMattermost(base: string, seconds = 300): Promise<void> {
  const deadline = Date.now() + seconds * 1000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base + "/api/v4/system/ping", {
        signal: AbortSignal.timeout(5_000),
      })
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  throw new Error(`Mattermost did not answer at ${base} within ${seconds} seconds`)
}

export interface Lab {
  base: string
  teamId: string
  channelId: string
}

/** Creates the three accounts, a team and a channel, and installs the plugin. */
export async function provision(base: string): Promise<Lab> {
  const anonymous = new Mattermost(base)
  const first = (await anonymous.request("POST", "/api/v4/users", {
    email: ACCOUNTS.admin.email,
    username: ACCOUNTS.admin.username,
    password: PASSWORD,
  })) as { id: string }
  const admin = await Mattermost.login(base, ACCOUNTS.admin)
  await admin
    .request("POST", "/api/v4/system/complete-onboarding", { adminUserId: first.id })
    .catch(() => null)
  for (const account of [ACCOUNTS.attacker, ACCOUNTS.victim])
    await admin.request("POST", "/api/v4/users", {
      email: account.email,
      username: account.username,
      password: PASSWORD,
    })
  const team = (await admin.request("POST", "/api/v4/teams", {
    name: "lab",
    display_name: "Lab",
    type: "O",
  })) as { id: string }
  const channel = (await admin.request("POST", "/api/v4/channels", {
    team_id: team.id,
    name: "meetings",
    display_name: "Meetings",
    type: "O",
  })) as { id: string }
  for (const account of [ACCOUNTS.attacker, ACCOUNTS.victim]) {
    const user = (await admin.request("GET", `/api/v4/users/username/${account.username}`)) as {
      id: string
    }
    await admin.request("POST", `/api/v4/teams/${team.id}/members`, {
      team_id: team.id,
      user_id: user.id,
    })
    await admin.request("POST", `/api/v4/channels/${channel.id}/members`, {
      user_id: user.id,
    })
  }
  await admin.installPlugin(await pluginBundle())
  return { base, teamId: team.id, channelId: channel.id }
}

export function saveLab(lab: Lab): void {
  const file = join(process.env.SHUVULN_HOME ?? "", "lab.json")
  writeFileSync(file, JSON.stringify(lab), { mode: 0o600 })
}

export function loadLab(): Lab | null {
  try {
    return JSON.parse(readFileSync(join(process.env.SHUVULN_HOME ?? "", "lab.json"), "utf8")) as Lab
  } catch {
    return null
  }
}

export function forgetLab(): void {
  rmSync(join(process.env.SHUVULN_HOME ?? "", "lab.json"), { force: true })
}

/** One event of the Mattermost event stream. */
export interface StreamEvent {
  event?: string
  data?: { post?: string; channel_id?: string }
}

export function parsePosted(event: StreamEvent): {
  user_id: string
  channel_id: string
  props: Record<string, unknown>
} | null {
  // Ephemeral posts, which only their recipient sees, arrive as their own event.
  if (
    (event.event !== "posted" && event.event !== "ephemeral_message") ||
    typeof event.data?.post !== "string"
  )
    return null
  try {
    const post = JSON.parse(event.data.post) as {
      user_id?: string
      channel_id?: string
      props?: Record<string, unknown>
    }
    return {
      user_id: post.user_id ?? "",
      channel_id: post.channel_id ?? "",
      props: post.props ?? {},
    }
  } catch {
    return null
  }
}

export interface Watch {
  /** Resolves once the stream has accepted the account, so a command can be run. */
  ready: Promise<void>
  /** The first post that passes the test, or a rejection after the time limit. */
  found: Promise<ReturnType<typeof parsePosted>>
}

/** Opens one account's event stream and waits for one post that satisfies the test. */
export async function watchFor(
  lab: Lab,
  account: LabAccount,
  withinSeconds: number,
  test: (post: NonNullable<ReturnType<typeof parsePosted>>) => boolean
): Promise<Watch> {
  const session = await Mattermost.login(lab.base, account)
  const socket = new WebSocket(lab.base.replace("http", "ws") + "/api/v4/websocket")
  let markReady: () => void = () => {}
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve
    setTimeout(() => reject(new Error("the event stream did not accept the account")), 20_000)
  })
  const found = new Promise<ReturnType<typeof parsePosted>>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    socket.addEventListener("message", (message) => {
      const event = JSON.parse(String(message.data)) as StreamEvent & { status?: string }
      if (event.status === "OK" && timer === undefined) {
        timer = setTimeout(() => {
          socket.close()
          reject(new Error(`no matching post within ${withinSeconds} seconds`))
        }, withinSeconds * 1000)
        markReady()
      }
      const post = parsePosted(event)
      if (post && test(post)) {
        clearTimeout(timer)
        socket.close()
        resolve(post)
      }
    })
    socket.addEventListener("error", () => reject(new Error("event stream failed")))
    socket.addEventListener("open", () =>
      socket.send(
        JSON.stringify({
          seq: 1,
          action: "authentication_challenge",
          data: { token: session.sessionToken() },
        })
      )
    )
  })
  return { ready, found }
}

/** A watch that reports a timeout as no post, for the control run. */
export function nothingWithin(watch: Watch): Promise<ReturnType<typeof parsePosted> | null> {
  return watch.found.catch((error: Error) => {
    if (error.message.includes("no matching")) return null
    throw error
  })
}
