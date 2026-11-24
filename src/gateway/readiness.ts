export const PROVIDERS = ["zai", "openai"] as const
export type Provider = (typeof PROVIDERS)[number]

export type ReadinessStatus = "ready" | "not_ready" | "invalid" | "unknown"

export interface Readiness {
  provider: Provider
  status: ReadinessStatus
  exitCode: number | null
  detail: string
}

const STATUSES: readonly string[] = ["ready", "not_ready", "invalid"]
const BY_EXIT_CODE: Record<number, ReadinessStatus> = { 0: "ready", 1: "not_ready", 2: "invalid" }

function reportedStatus(stdout: string): ReadinessStatus | undefined {
  try {
    const parsed: unknown = JSON.parse(stdout)
    const status = record(parsed)?.status
    return typeof status === "string" && STATUSES.includes(status)
      ? (status as ReadinessStatus)
      : undefined
  } catch {
    return undefined
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined
}

/**
 * `pi auth check --json` prints `{"status": ...}` and exits 0 for ready, 1 for not ready and
 * 2 for invalid. The printed status wins; the exit status stands in when Pi printed nothing.
 */
export function parseReadiness(
  provider: Provider,
  stdout: string,
  exitCode: number | null,
  stderr = "",
  spawnError?: Error
): Readiness {
  if (spawnError) {
    const detail = `Pi did not run: ${spawnError.message}`
    return { provider, status: "unknown", exitCode, detail: detail.slice(0, 400) }
  }
  const trimmed = stdout.trim()
  const status =
    reportedStatus(trimmed) ??
    (exitCode !== null ? (BY_EXIT_CODE[exitCode] ?? "unknown") : "unknown")
  return { provider, status, exitCode, detail: (trimmed || stderr.trim()).slice(0, 400) }
}
