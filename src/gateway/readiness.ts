export const PROVIDERS = ["zai", "openai"] as const
export type Provider = (typeof PROVIDERS)[number]

export type ReadinessStatus = "ready" | "not_ready" | "invalid" | "unknown"

export interface Readiness {
  provider: Provider
  status: ReadinessStatus
  exitCode: number | null
  detail: string
}

const BY_EXIT_CODE: Record<number, ReadinessStatus> = { 0: "ready", 1: "not_ready", 2: "invalid" }

function findStatus(value: unknown, depth = 0): ReadinessStatus | undefined {
  if (depth > 4 || value === null || typeof value !== "object") return undefined
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string" && ["ready", "not_ready", "invalid"].includes(entry)) {
      if (key === "status" || key === "state" || key === "result") return entry as ReadinessStatus
    }
    if (typeof entry === "boolean" && key === "ready") return entry ? "ready" : "not_ready"
    const nested = findStatus(entry, depth + 1)
    if (nested) return nested
  }
  return undefined
}

/** `pi auth check` prints ready, not_ready or invalid and exits 0, 1 or 2. */
export function parseReadiness(
  provider: Provider,
  stdout: string,
  exitCode: number | null,
  stderr = "",
  spawnError?: Error
): Readiness {
  const trimmed = stdout.trim()
  let status: ReadinessStatus = "unknown"
  let detail = trimmed || stderr.trim()
  if (spawnError) {
    detail = `Pi could not start: ${spawnError.message}`
  } else {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      const found = findStatus(parsed)
      if (found) status = found
      else detail = JSON.stringify(parsed)
    } catch {
      const word = /\b(ready|not_ready|invalid)\b/.exec(trimmed)?.[1]
      if (word) status = word as ReadinessStatus
    }
    if (status === "unknown" && exitCode !== null && BY_EXIT_CODE[exitCode]) {
      status = BY_EXIT_CODE[exitCode] ?? "unknown"
    }
  }
  return { provider, status, exitCode, detail: detail.slice(0, 400) }
}
