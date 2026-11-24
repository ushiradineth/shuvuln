import { spawnSync } from "node:child_process"
import { gatewayEnvironment } from "../gateway/environment.ts"
import { PROVIDERS, parseReadiness, type Readiness } from "../gateway/readiness.ts"
import { piCommand } from "../gateway/run.ts"
import { withTempDir } from "../gateway/tempdir.ts"

const CHECK_TIMEOUT_MS = 30_000
const LOGIN_FLAGS = [
  "--no-extensions",
  "--no-skills",
  "--no-prompt-templates",
  "--no-context-files",
  "--no-mcp",
]

/** Asks shuvuln's own Pi whether each provider is logged in. Prints no credentials. */
export function checkProviders(agentDir: string, command = piCommand()): Promise<Readiness[]> {
  return withTempDir("shuvuln-auth-", async (cwd) =>
    PROVIDERS.map((provider) => {
      const result = spawnSync(command, ["auth", "check", "--provider", provider, "--json"], {
        cwd,
        env: gatewayEnvironment(process.env, agentDir),
        encoding: "utf8",
        timeout: CHECK_TIMEOUT_MS,
      })
      return parseReadiness(
        provider,
        result.stdout ?? "",
        result.status,
        result.stderr ?? "",
        result.error ?? undefined
      )
    })
  )
}

/** Opens shuvuln's own Pi so /login can store the z.ai and OpenAI logins in its agent directory. */
export function openLogin(agentDir: string, command = piCommand()): Promise<number | null> {
  console.log("Opening shuvuln's own Pi. Run /login, choose z.ai or OpenAI, finish, then /exit.")
  return withTempDir("shuvuln-auth-", async (cwd) => {
    const result = spawnSync(command, LOGIN_FLAGS, {
      cwd,
      env: gatewayEnvironment(process.env, agentDir),
      stdio: "inherit",
    })
    return result.status
  })
}
