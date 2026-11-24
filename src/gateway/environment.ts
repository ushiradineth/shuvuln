/**
 * Only operating-system locations cross into Pi. Provider logins stay in Pi's own agent
 * directory, so no key or token is ever placed in a child's environment by shuvuln.
 */
export function gatewayEnvironment(source: NodeJS.ProcessEnv, agentDir: string): NodeJS.ProcessEnv {
  const keys = ["PATH", "HOME", "USER", "LOGNAME", "TMPDIR", "LANG", "LC_ALL", "LC_CTYPE"]
  const env: NodeJS.ProcessEnv = {}
  for (const key of keys) {
    if (source[key] !== undefined) env[key] = source[key]
  }
  return {
    ...env,
    PI_CODING_AGENT_DIR: agentDir,
    PI_SKIP_VERSION_CHECK: "1",
    PI_TELEMETRY: "0",
    NO_COLOR: "1",
    TERM: "dumb",
  }
}
