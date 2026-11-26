import { saveReport, scanSource, type ScanReport } from "../hunt/openhack.ts"

function describe(report: ScanReport): void {
  console.log(`state:  ${report.state}${report.error ? ` (${report.error})` : ""}`)
  console.log(
    `usage:  ${report.usage.input} in, ${report.usage.output} out, ${report.usage.requests} calls`
  )
  const counted = new Map<string, number>()
  for (const finding of report.findings) {
    counted.set(finding.validation, (counted.get(finding.validation) ?? 0) + 1)
  }
  console.log(
    `found:  ${report.findings.length} candidates` +
      [...counted].map(([state, count]) => `, ${count} ${state}`).join("")
  )
  for (const finding of report.findings) {
    if (finding.validation === "validated") {
      console.log(
        `  [${finding.severity}] ${finding.cwe} ${finding.file}:${finding.line} ${finding.title}`
      )
    }
  }
}

/** One OpenHack scan through shuvuln's own Pi. Exit 0 only when OpenHack completed every task. */
export async function scan(
  directory: string,
  options: { model?: string; workers?: number; steps?: number; json?: boolean }
): Promise<number> {
  try {
    const report = await scanSource({ directory, ...options })
    const saved = saveReport(report)
    if (options.json) {
      console.log(JSON.stringify({ ...report, saved }, null, 2))
    } else {
      describe(report)
      console.log(`report: ${saved}`)
    }
    return report.state === "complete" ? 0 : 1
  } catch (error) {
    console.error(`error:  ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
}
