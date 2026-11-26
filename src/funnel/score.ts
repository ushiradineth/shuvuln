import type { Program, Repository } from "./dataset.ts"

/** What the GitHub API says about a repository. Absent until `funnel enrich` has run. */
export interface RepoFacts {
  sizeKb?: number
  pushedAt?: string
  language?: string
  archived?: boolean
  defaultBranch?: string
  description?: string
  missing?: boolean
}

export interface Candidate {
  program: Program
  repository: Repository
  facts?: RepoFacts
  score: number
  reasons: string[]
}

/** A component of a larger product, which is where line scanners do worst. */
const COMPONENT = /(plugin|extension|addon|add-on|integration|connector|module|adapter|bridge)/i

export function factsKey(repository: Repository): string {
  return `${repository.host}/${repository.owner}/${repository.repo}`
}

function daysAgo(day: string | undefined, today: Date): number | undefined {
  if (day === undefined) return undefined
  const then = Date.parse(day)
  return Number.isNaN(then) ? undefined : (today.getTime() - then) / 86_400_000
}

/** Points and their reasons for one program-repo pair. No model involved. */
export function score(
  program: Program,
  repository: Repository,
  facts: RepoFacts | undefined,
  today = new Date()
): Candidate {
  const reasons: string[] = []
  let points = 0
  const add = (amount: number, reason: string): void => {
    points += amount
    reasons.push(`${reason} (${amount > 0 ? "+" : ""}${amount})`)
  }

  if (!program.paysBounties) add(-3, "pays no bounty")
  else if (program.maxPayoutUsd === undefined) add(1, "pays, amount not stated")
  else if (program.maxPayoutUsd >= 10_000) add(4, `pays up to $${program.maxPayoutUsd}`)
  else if (program.maxPayoutUsd >= 5_000) add(3, `pays up to $${program.maxPayoutUsd}`)
  else if (program.maxPayoutUsd >= 1_000) add(2, `pays up to $${program.maxPayoutUsd}`)
  else add(1, `pays up to $${program.maxPayoutUsd}`)

  if (program.platform === "hackerone") add(-2, "HackerOne, many researchers")
  if (repository.repo === "*") add(-1, "whole organisation in scope")
  else if (COMPONENT.test(repository.repo)) add(2, "a component of a larger product")
  if (program.repositories.length >= 5) add(1, "one of many repositories")

  if (facts !== undefined) {
    if (facts.archived) add(-4, "archived, so nothing gets fixed")
    if (facts.sizeKb !== undefined) {
      if (facts.sizeKb <= 1_000) add(3, `small, ${facts.sizeKb} KB`)
      else if (facts.sizeKb <= 10_000) add(2, `medium, ${facts.sizeKb} KB`)
      else if (facts.sizeKb <= 50_000) add(1, `large, ${facts.sizeKb} KB`)
      else add(-1, `very large, ${facts.sizeKb} KB`)
    }
    const pushed = daysAgo(facts.pushedAt, today)
    if (pushed !== undefined) {
      if (pushed <= 90) add(1, "changes in the last 90 days")
      else if (pushed > 365) add(-2, "no change for over a year")
    }
  }
  const launched = daysAgo(program.launchedAt, today)
  if (launched !== undefined && launched <= 365) add(2, "program under a year old")

  return { program, repository, ...(facts ? { facts } : {}), score: points, reasons }
}

/** Every program-repo pair, best first. Pies order by payout, then name, so a rerank is stable. */
export function rank(
  programs: Program[],
  facts: ReadonlyMap<string, RepoFacts>,
  today = new Date()
): Candidate[] {
  const candidates = programs.flatMap((program) =>
    program.repositories.map((repository) =>
      score(program, repository, facts.get(factsKey(repository)), today)
    )
  )
  return candidates.sort(
    (a, b) =>
      b.score - a.score ||
      (b.program.maxPayoutUsd ?? 0) - (a.program.maxPayoutUsd ?? 0) ||
      a.program.name.localeCompare(b.program.name) ||
      a.repository.url.localeCompare(b.repository.url)
  )
}
