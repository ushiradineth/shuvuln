import type { Repository } from "./dataset.ts"
import type { Candidate } from "./score.ts"

/** Tier 2's verdict on one program-repo pair. */
export interface Triage {
  keep: boolean
  kind: string
  attackSurface: string
  reason: string
  model: string
  usage: { input: number; output: number }
  version?: number
}

const README_BYTES = 12_000

/** Bumped whenever the question changes, so older verdicts are not reused. */
export const TRIAGE_VERSION = 2

/** README text from the default branch, capped; raw files are outside the GitHub API's limit. */
export async function readReadme(repository: Repository): Promise<string | undefined> {
  const base = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/HEAD/`
  for (const name of ["README.md", "readme.md", "README.rst", "README"]) {
    try {
      const response = await fetch(base + name, {
        headers: { "User-Agent": "shuvuln" },
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) continue
      const text = await response.text()
      return text.slice(0, README_BYTES)
    } catch {
      continue
    }
  }
  return undefined
}

/** What Tier 2 is asked, per pair. The answer must be one JSON object. */
export function triagePrompt(candidate: Candidate, readme: string | undefined): string {
  const { program, repository, facts } = candidate
  return `You triage bug bounty targets for deep, static source review. The review reads code to find access-control, input-handling and business-logic flaws. It does not run the software.

Program: ${program.name} on ${program.platform}${program.maxPayoutUsd === undefined ? "" : `, pays up to $${program.maxPayoutUsd}`}.
Repository: https://${repository.host}/${repository.owner}/${repository.repo}
${facts?.description ? `Description: ${facts.description}\n` : ""}${facts?.language ? `Language: ${facts.language}\n` : ""}${facts?.sizeKb !== undefined ? `Size: ${facts.sizeKb} KB\n` : ""}
README, first ${readme?.length ?? 0} characters:
${readme ?? "(no README found)"}

Decide whether this repository deserves a deep review aimed at a paid report. Keep it when it is an application, service, plugin or extension with its own attack surface: routes, handlers, permissions, stored data. Drop documentation, examples, test suites, design assets, and thin SDK or client wrappers whose logic runs on someone else's machine.

The review reads Go, TypeScript, JavaScript, Python, PHP, Ruby and Java application logic well. It reads C, C++, Rust, Solidity, Move and Sui Move poorly, so drop a repository whose security rests on memory safety, cryptography, protocol parsing or on-chain value flows unless most of its logic is application code in the first group.

Answer with one JSON object and nothing else:
{"keep": true, "kind": "plugin", "attack_surface": "one sentence", "reason": "one sentence"}
kind is one of: plugin, application, library, sdk, docs, examples, other.`
}

function firstObject(text: string): string | undefined {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  return start === -1 || end <= start ? undefined : text.slice(start, end + 1)
}

/** The verdict in a reply, or null when the reply is not the expected object. */
export function parseTriage(text: string, model: string, usage: Triage["usage"]): Triage | null {
  const json = firstObject(text)
  if (json === undefined) return null
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof value !== "object" || value === null) return null
  const record = value as Record<string, unknown>
  const sentence = (key: string): string | undefined =>
    typeof record[key] === "string" && record[key] !== "" ? record[key] : undefined
  const kind = sentence("kind")
  const attackSurface = sentence("attack_surface")
  const reason = sentence("reason")
  if (typeof record.keep !== "boolean" || !kind || !attackSurface || !reason) return null
  return { keep: record.keep, kind, attackSurface, reason, model, usage, version: TRIAGE_VERSION }
}
