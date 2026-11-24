import { homedir } from "node:os"
import { join } from "node:path"

/** Root for run data. Lives outside the repository so nothing from a hunt can be committed. */
export function shuvulnHome(): string {
  return process.env.SHUVULN_HOME ?? join(homedir(), ".local", "share", "shuvuln")
}

/** Agent directory of shuvuln's own Pi. pkgs/pi.nix applies the same default. */
export function piAgentDir(): string {
  return process.env.SHUVULN_PI_AGENT_DIR ?? join(shuvulnHome(), "pi-agent")
}
