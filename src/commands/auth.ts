import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gatewayEnvironment } from "../gateway/environment.ts"
import { PROVIDERS, parseReadiness, type Provider, type Readiness } from "../gateway/readiness.ts"
import { piCommand } from "../gateway/run.ts"

const CHECK_TIMEOUT_MS = 30_000
const LOGIN_FLAGS = [
  "--no-extensions",
  "--no-skills",
  "--no-prompt-templates",
  "--no-context-files",
  "--no-mcp",
]

function inTempDir<T>(run: (cwd: string) => T): T {
  const cwd = mkdtempSync(join(tmpdir(), "shuvuln-auth-"))
  try {
    return run(cwd)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

/** Asks shuvuln's own Pi whether each provider is logged in. Prints no credentials. */
export function checkProviders(agentDir: string, command = piCommand()): Readiness[] {
  return inTempDir((cwd) =>
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
export function openLogin(agentDir: string, command = piCommand()): number | null {
  console.log("Opening shuvuln's own Pi. Run /login, choose z.ai or OpenAI, finish, then /exit.")
  return inTempDir((cwd) => {
    const result = spawnSync(command, LOGIN_FLAGS, {
      cwd,
      env: gatewayEnvironment(process.env, agentDir),
      stdio: "inherit",
    })
    return result.status
  })
}

export type { Provider }
