export interface Target {
  name: string
  source?: string
  location?: string
  install?: string
  known_issues?: number
}

/** One program's engagement policy, written from its brief and approved by Shu. */
export interface ProgramPolicy {
  program: string
  platform: string
  brief: string
  brief_last_updated: string
  approved_by: string
  approved_on: string
  live_testing: "unapproved" | "approved"
  local_installation: "allowed" | "forbidden"
  safe_harbor: string
  identity_verification_required: boolean
  disclosure: string
  rating: string
  rewards_usd: Record<string, number>
  average_payout_usd_last_3_months?: number
  vulnerabilities_rewarded?: number
  triage?: { validation_within_days: number; percent_decided_within_10_days: number }
  accounts: { email_domain: string; signup: string; roles: string[]; note?: string }
  targets: Target[]
  out_of_scope: string[]
  ineligible: string[]
  known_issues: string[]
  n_day_policy?: string
  automation?: { unconfirmed_scanner_reports: string; excluded: string[]; note?: string }
  ai_policy: string
  submission_stop: { after_consecutive_not_applicable_or_informative: number }
}

export type Loaded =
  | { program: string; file: string; ok: true; policy: ProgramPolicy }
  | { program: string; file: string; ok: false; problems: string[] }

const DATE = /^\d{4}-\d{2}-\d{2}$/

type Raw = Record<string, unknown>

function record(value: unknown): Raw {
  return typeof value === "object" && value !== null ? (value as Raw) : {}
}

/** Checks one program file's data. Every problem is listed, so one edit can fix them all. */
export function validateProgram(
  raw: unknown
): { ok: true; policy: ProgramPolicy } | { ok: false; problems: string[] } {
  const data = record(raw)
  const problems: string[] = []
  const text = (key: string): string => {
    const value = data[key]
    if (typeof value === "string" && value.trim() !== "") return value
    problems.push(`${key} must be non-empty text`)
    return ""
  }
  const oneOf = <T extends string>(key: string, allowed: readonly T[]): T | undefined => {
    const value = data[key]
    if (typeof value === "string" && (allowed as readonly string[]).includes(value))
      return value as T
    problems.push(`${key} must be one of ${allowed.join(", ")}`)
    return undefined
  }
  const strings = (key: string): string[] => {
    const value = data[key]
    if (Array.isArray(value) && value.every((item) => typeof item === "string" && item !== ""))
      return value as string[]
    problems.push(`${key} must be a list of non-empty text`)
    return []
  }

  text("program")
  text("platform")
  const brief = text("brief")
  if (brief && !brief.startsWith("https://")) problems.push("brief must be an https address")
  for (const key of ["brief_last_updated", "approved_on"]) {
    const value = data[key]
    if (typeof value !== "string" || !DATE.test(value))
      problems.push(`${key} must be a date, YYYY-MM-DD`)
  }
  text("approved_by")
  oneOf("live_testing", ["unapproved", "approved"] as const)
  oneOf("local_installation", ["allowed", "forbidden"] as const)
  text("safe_harbor")
  text("disclosure")
  text("rating")
  text("ai_policy")
  if (typeof data.identity_verification_required !== "boolean")
    problems.push("identity_verification_required must be true or false")
  const rewards = record(data.rewards_usd)
  if (
    Object.keys(rewards).length === 0 ||
    !Object.values(rewards).every((v) => typeof v === "number" && v >= 0)
  )
    problems.push("rewards_usd must map priorities to amounts")
  const targets = Array.isArray(data.targets) ? data.targets.map(record) : []
  if (targets.length === 0 || !targets.every((t) => typeof t.name === "string" && t.name !== ""))
    problems.push("targets must be a list with a name each")
  for (const key of ["out_of_scope", "ineligible", "known_issues"]) strings(key)
  const accounts = record(data.accounts)
  if (typeof accounts.email_domain !== "string" || typeof accounts.signup !== "string")
    problems.push("accounts must name an email domain and a signup address")
  if (!Array.isArray(accounts.roles) || accounts.roles.length === 0)
    problems.push("accounts.roles must not be empty")
  const stop = record(data.submission_stop).after_consecutive_not_applicable_or_informative
  if (typeof stop !== "number" || stop < 1)
    problems.push(
      "submission_stop.after_consecutive_not_applicable_or_informative must be at least 1"
    )

  if (problems.length > 0) return { ok: false, problems }
  return { ok: true, policy: raw as ProgramPolicy }
}

/** Loads every `programs/<name>.ts`. Each exports one policy as its default. */
export async function loadPrograms(directory: string): Promise<Loaded[]> {
  const { readdir } = await import("node:fs/promises")
  const { join } = await import("node:path")
  const { pathToFileURL } = await import("node:url")
  let files: string[]
  try {
    files = (await readdir(directory)).filter((file) => file.endsWith(".ts")).sort()
  } catch {
    return []
  }
  const loaded: Loaded[] = []
  for (const file of files) {
    const path = join(directory, file)
    const program = file.replace(/\.ts$/, "")
    try {
      const module = (await import(pathToFileURL(path).href)) as { default?: unknown }
      const result = validateProgram(module.default)
      if (result.ok && result.policy.program !== program)
        loaded.push({
          program,
          file,
          ok: false,
          problems: [`program must be "${program}", the file's name`],
        })
      else if (result.ok) loaded.push({ program, file, ok: true, policy: result.policy })
      else loaded.push({ program, file, ok: false, problems: result.problems })
    } catch (error) {
      loaded.push({
        program,
        file,
        ok: false,
        problems: [error instanceof Error ? error.message : String(error)],
      })
    }
  }
  return loaded
}

/** The policy of an approved program, or an error that says why work on it may not start. */
export function requireApprovedProgram(loaded: Loaded[], program: string): ProgramPolicy {
  const entry = loaded.find((item) => item.program === program)
  if (entry === undefined) throw new Error(`no program file for ${program}`)
  if (!entry.ok) throw new Error(`${program} is invalid: ${entry.problems.join("; ")}`)
  return entry.policy
}
