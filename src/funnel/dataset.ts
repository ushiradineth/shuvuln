/** The public program dump shuvuln ranks from. Pinned, so a rerank sees the same data. */
export const DATASET = {
  repository: "arkadiyt/bounty-targets-data",
  commit: "c144723c84ea8035271c21e5dca3cd9e1b0eb037",
  platforms: ["bugcrowd", "hackerone", "intigriti", "yeswehack"],
} as const

export type Platform = (typeof DATASET.platforms)[number]

export interface Repository {
  host: "github.com" | "gitlab.com"
  owner: string
  /** Repository name, or "*" when a whole organisation is in scope. */
  repo: string
  url: string
}

/** One program with at least one source repository in scope. */
export interface Program {
  platform: Platform
  name: string
  url: string
  /** Highest reward the program advertises, in US dollars, when it says. */
  maxPayoutUsd?: number
  paysBounties: boolean
  launchedAt?: string
  /** In-scope entries of every kind, to tell a component from a whole product. */
  scopeSize: number
  repositories: Repository[]
}

const HOSTS = { "github.com": "github.com", "gitlab.com": "gitlab.com" } as const
const REPOSITORY =
  /^(?:https?:\/\/)?(?:www\.)?(github\.com|gitlab\.com)\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/i
/** Path segments of a host that are not repositories. */
const NOT_A_REPOSITORY = new Set([
  "issues",
  "pulls",
  "releases",
  "tree",
  "blob",
  "wiki",
  "settings",
  "orgs",
  "users",
  "marketplace",
  "topics",
  "search",
  "about",
])

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function money(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

/** In-scope entries of one program, across the four platforms' spellings. */
function scopes(program: Record<string, unknown>): Record<string, unknown>[] {
  const targets = record(program.targets)
  const nested = list(targets.in_scope)
  const direct = Array.isArray(program.targets) ? list(program.targets) : []
  return [...nested, ...list(program.scopes), ...direct].map(record)
}

/** The repository an in-scope entry names, or null when it names none. */
export function repositoryOf(identifier: string): Repository | null {
  const match = REPOSITORY.exec(identifier.trim())
  if (!match) return null
  const host = HOSTS[(match[1] ?? "").toLowerCase() as keyof typeof HOSTS]
  const owner = match[2] ?? ""
  const repo = match[3]?.replace(/\.git$/i, "") ?? "*"
  if (host === undefined || NOT_A_REPOSITORY.has(repo.toLowerCase())) return null
  return {
    host,
    owner,
    repo,
    url: `https://${host}/${owner}${repo === "*" ? "" : `/${repo}`}`,
  }
}

export function parseProgram(platform: Platform, raw: unknown): Program | null {
  const program = record(raw)
  const name = text(program.name) || text(program.handle)
  const url =
    text(program.url) ||
    (platform === "yeswehack" ? `https://yeswehack.com/programs/${text(program.id)}` : "")
  if (!name || !url) return null
  const entries = scopes(program)
  const repositories = new Map<string, Repository>()
  for (const entry of entries) {
    const identifier =
      text(entry.asset_identifier) || text(entry.target) || text(entry.uri) || text(entry.endpoint)
    const repository = repositoryOf(identifier)
    if (repository) repositories.set(repository.url, repository)
  }
  if (repositories.size === 0) return null
  const maxPayoutUsd = money(program.max_payout) ?? money(program.max_bounty)
  const paysBounties =
    platform === "hackerone"
      ? program.offers_bounties === true || program.offers_bounties === "True"
      : (maxPayoutUsd ?? 0) > 0
  const launchedAt = text(program.launch_date).slice(0, 10)
  return {
    platform,
    name,
    url,
    ...(maxPayoutUsd !== undefined ? { maxPayoutUsd } : {}),
    paysBounties,
    ...(launchedAt ? { launchedAt } : {}),
    scopeSize: entries.length,
    repositories: [...repositories.values()],
  }
}

/** Reads one platform's dump. A dump that is not a list of programs is an error, not an empty list. */
export function readDump(platform: Platform, json: string): Program[] {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch (error) {
    throw new Error(
      `${platform} dump is not JSON: ${error instanceof Error ? error.message : error}`
    )
  }
  if (!Array.isArray(raw)) throw new Error(`${platform} dump is not a list`)
  return raw
    .map((entry) => parseProgram(platform, entry))
    .filter((program): program is Program => program !== null)
}
