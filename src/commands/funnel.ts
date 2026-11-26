import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  DATASET,
  type Platform,
  type Program,
  type Repository,
  readDump,
} from "../funnel/dataset.ts"
import { type Candidate, type RepoFacts, factsKey, rank } from "../funnel/score.ts"
import {
  TRIAGE_VERSION,
  type Triage,
  parseTriage,
  readReadme,
  triagePrompt,
} from "../funnel/triage.ts"
import { runPi } from "../gateway/run.ts"
import { STAGE_MODEL } from "../models.ts"
import { piAgentDir } from "../paths.ts"
import { shuvulnHome } from "../paths.ts"
import { readSecret } from "../secrets.ts"

interface Targets {
  dataset: { repository: string; commit: string }
  fetchedAt: string
  programs: Program[]
}

function funnelDir(): string {
  return join(shuvulnHome(), "funnel")
}

function dumpDir(): string {
  return join(funnelDir(), "dump", DATASET.commit)
}

function targetsPath(): string {
  return join(funnelDir(), "targets.json")
}

function factsPath(): string {
  return join(funnelDir(), "repos.json")
}

function triagePath(): string {
  return join(funnelDir(), "triage.json")
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function defined(value: object): RepoFacts {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as RepoFacts
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined
}

async function download(platform: Platform): Promise<string> {
  const url = `https://raw.githubusercontent.com/${DATASET.repository}/${DATASET.commit}/data/${platform}_data.json`
  const response = await fetch(url, {
    headers: { "User-Agent": "shuvuln" },
    signal: AbortSignal.timeout(180_000),
  })
  if (!response.ok) throw new Error(`${platform} dump: GitHub answered ${response.status}`)
  return response.text()
}

/** Downloads the pinned dumps once, then writes the programs with source in scope. */
export async function fetchTargets(): Promise<number> {
  try {
    mkdirSync(dumpDir(), { recursive: true })
    const programs: Program[] = []
    const counts: Partial<Record<Platform, number>> = {}
    for (const platform of DATASET.platforms) {
      const file = join(dumpDir(), `${platform}_data.json`)
      let json: string
      if (existsSync(file)) json = readFileSync(file, "utf8")
      else {
        json = await download(platform)
        writeFileSync(file, json, { mode: 0o600 })
      }
      const parsed = readDump(platform, json)
      counts[platform] = parsed.length
      programs.push(...parsed)
    }
    const targets: Targets = {
      dataset: { repository: DATASET.repository, commit: DATASET.commit },
      fetchedAt: new Date().toISOString(),
      programs,
    }
    mkdirSync(funnelDir(), { recursive: true })
    writeFileSync(targetsPath(), JSON.stringify(targets), { mode: 0o600 })
    const perPlatform = DATASET.platforms.map((p) => `${p} ${counts[p] ?? 0}`).join(", ")
    console.log(`dataset: ${DATASET.repository} at ${DATASET.commit}`)
    console.log(`programs with source in scope: ${programs.length} (${perPlatform})`)
    return 0
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}

function loadTargets(): Targets {
  if (!existsSync(targetsPath())) throw new Error("no targets yet. Run: shuvuln funnel fetch")
  return JSON.parse(readFileSync(targetsPath(), "utf8")) as Targets
}

function loadFacts(): Map<string, RepoFacts> {
  if (!existsSync(factsPath())) return new Map()
  return new Map(
    Object.entries(JSON.parse(readFileSync(factsPath(), "utf8")) as Record<string, RepoFacts>)
  )
}

/** Tier 1: every program-repo pair with a source repository in scope, best first. */
export function rankTargets(options: { limit: number; json: boolean }): number {
  try {
    const targets = loadTargets()
    const ranked = rank(targets.programs, loadFacts())
    const shown = ranked.slice(0, options.limit)
    if (options.json) {
      console.log(JSON.stringify(shown, null, 2))
    } else {
      const enriched = ranked.filter((c) => c.facts !== undefined).length
      console.log(
        `ranked ${ranked.length} program-repo pairs from ${targets.programs.length} programs; ${enriched} with repository facts`
      )
      for (const c of shown) {
        const payout = c.program.maxPayoutUsd === undefined ? "-" : `$${c.program.maxPayoutUsd}`
        const size = c.facts?.sizeKb === undefined ? "-" : `${c.facts.sizeKb} KB`
        console.log(
          `${String(c.score).padStart(3)}  ${c.program.platform.padEnd(10)} ${payout.padStart(8)} ${size.padStart(11)}  ${c.program.name} → ${c.repository.owner}/${c.repository.repo}`
        )
        console.log(`      ${c.reasons.join(", ")}`)
      }
    }
    return 0
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}

/** Fetches what the GitHub API says about each repository, cached, stopping at its rate limit. */
export async function enrich(options: { limit: number }): Promise<number> {
  try {
    const targets = loadTargets()
    const facts = loadFacts()
    const pending = new Map<string, Repository>()
    for (const program of targets.programs)
      for (const repository of program.repositories)
        if (
          repository.repo !== "*" &&
          repository.host === "github.com" &&
          !facts.has(factsKey(repository))
        )
          pending.set(factsKey(repository), repository)
    const token = readSecret("github")
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "shuvuln",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    let fetched = 0
    for (const [key, repository] of pending) {
      if (fetched >= options.limit) break
      const response = await fetch(
        `https://api.github.com/repos/${repository.owner}/${repository.repo}`,
        {
          headers,
          signal: AbortSignal.timeout(30_000),
        }
      )
      if (response.status === 404) {
        facts.set(key, { missing: true })
      } else if (response.status === 403 || response.status === 429) {
        const reset = response.headers.get("x-ratelimit-reset")
        const at = reset ? new Date(Number(reset) * 1000).toISOString() : "unknown"
        console.error(`error:  GitHub's rate limit stopped the run; it resets at ${at}`)
        break
      } else if (!response.ok) {
        console.error(`error:  GitHub answered ${response.status} for ${key}`)
        break
      } else {
        const body = (await response.json()) as Record<string, unknown>
        facts.set(
          key,
          defined({
            sizeKb: typeof body.size === "number" ? body.size : undefined,
            pushedAt: optionalText(body.pushed_at),
            language: optionalText(body.language),
            archived: body.archived === true,
            defaultBranch: optionalText(body.default_branch),
            description: optionalText(body.description),
          })
        )
      }
      fetched++
      writeFileSync(factsPath(), JSON.stringify(Object.fromEntries(facts)), { mode: 0o600 })
    }
    console.log(
      `repository facts: ${fetched} fetched, ${facts.size} cached, ${pending.size - fetched} still missing${token ? "" : ", without a GitHub token"}`
    )
    return 0
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}

function loadTriages(): Map<string, Triage> {
  if (!existsSync(triagePath())) return new Map()
  return new Map(
    Object.entries(JSON.parse(readFileSync(triagePath(), "utf8")) as Record<string, Triage>)
  )
}

/** Tier 2: one short model call per candidate that reads the README. Run on the stage model. */
export async function triageTargets(options: { limit: number; json: boolean }): Promise<number> {
  try {
    const targets = loadTargets()
    const facts = loadFacts()
    const triages = loadTriages()
    const candidates = rank(targets.programs, facts)
      .filter((c) => c.repository.repo !== "*" && c.facts !== undefined && !c.facts.missing)
      .slice(0, options.limit)
    const agentDir = piAgentDir()
    let calls = 0
    const usage = { input: 0, output: 0 }
    for (const candidate of candidates) {
      const key = factsKey(candidate.repository)
      const cached = triages.get(key)
      if (cached?.version === TRIAGE_VERSION) continue
      triages.delete(key)
      const readme = await readReadme(candidate.repository)
      const run = await runPi({
        model: STAGE_MODEL,
        thinking: "low",
        prompt: triagePrompt(candidate, readme),
        agentDir,
        timeoutMs: 180_000,
      })
      calls++
      usage.input += run.usage.input
      usage.output += run.usage.output
      const triage = run.error === null ? parseTriage(run.text, STAGE_MODEL, run.usage) : undefined
      if (triage) {
        triages.set(key, triage)
        writeFileSync(triagePath(), JSON.stringify(Object.fromEntries(triages)), { mode: 0o600 })
      } else console.error(`warn:   no verdict for ${key}${run.error ? `: ${run.error}` : ""}`)
    }
    const shown = candidates.map((c) => ({
      ...c,
      triage: triages.get(factsKey(c.repository)) ?? null,
    }))
    if (options.json) console.log(JSON.stringify(shown, null, 2))
    else {
      console.log(
        `triaged ${calls} of ${candidates.length} candidates on ${STAGE_MODEL}; ${usage.input} tokens in, ${usage.output} out`
      )
      for (const c of shown) {
        const t = c.triage
        console.log(
          `${String(c.score).padStart(3)}  ${t ? (t.keep ? "keep" : "drop") : "    "}  ${c.program.name} → ${c.repository.owner}/${c.repository.repo}  ${t ? `[${t.kind}] ${t.reason}` : "(no verdict)"}`
        )
      }
    }
    return 0
  } catch (error) {
    console.error(`error:  ${message(error)}`)
    return 1
  }
}
