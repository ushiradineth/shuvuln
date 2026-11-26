import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { shuvulnHome } from "../paths.ts"
import { indexKnown, matchKnown, parseAdvisoryFeed } from "../triage/known.ts"

interface Finding {
  id: string
  severity: string
  validation: string
  title: string
  file: string
  line: number
}

interface LabelledFinding extends Finding {
  known: { id: string; date?: string; score: number } | null
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}

function runPath(run: string): string {
  return run.endsWith(".json") || run.includes("/")
    ? run
    : join(shuvulnHome(), "runs", `${run}.json`)
}

function describe(findings: LabelledFinding[]): void {
  console.log(
    `findings: ${findings.length}, ${findings.filter((f) => f.known).length} already fixed`
  )
  for (const finding of findings) {
    console.log(
      `  [${finding.severity}] ${finding.validation.padEnd(9)} ${finding.file}:${finding.line}  ${finding.title}`
    )
    const known = finding.known
    console.log(
      `            known: ${known ? `${known.id}${known.date ? ` ${known.date}` : ""} (overlap ${known.score})` : "none"}`
    )
  }
}

/** Label each finding of a saved scan with the vendor fix that already covers it, if any. */
export function triage(run: string, options: { advisories: string; json?: boolean }): number {
  const path = runPath(run)
  if (!existsSync(path)) {
    console.error(`error:  no scan report at ${path}`)
    return 1
  }
  const report = readJson(path) as { id?: string; findings?: Finding[] }
  const index = indexKnown(parseAdvisoryFeed(readJson(options.advisories)))
  const findings = (report.findings ?? []).map((finding): LabelledFinding => {
    const match = matchKnown({ title: finding.title }, index)
    return {
      ...finding,
      known: match
        ? {
            id: match.fix.id,
            ...(match.fix.date ? { date: match.fix.date } : {}),
            score: Math.round(match.score * 100) / 100,
          }
        : null,
    }
  })
  if (options.json) {
    console.log(JSON.stringify({ run: report.id ?? path, findings }, null, 2))
  } else {
    describe(findings)
  }
  return 0
}
