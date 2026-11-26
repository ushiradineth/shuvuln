import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { OPENHACK_MODEL } from "../models.ts"
import { shuvulnHome } from "../paths.ts"

export interface ScanOptions {
  directory: string
  model?: string
  workers?: number
  steps?: number
  /** Absolute path to the patched OpenHack. Defaults to SHUVULN_OPENHACK. */
  command?: string
}

/** The parts of an OpenHack report that shuvuln reads. Other fields pass through. */
export interface ScanReport {
  id: string
  state: "running" | "complete" | "cancelled" | "failed" | "partial"
  error?: string
  usage: { input: number; output: number; requests: number }
  findings: {
    id: string
    title: string
    severity: string
    cwe: string
    file: string
    line: number
    validation: "pending" | "validated" | "rejected" | "uncertain"
  }[]
  [key: string]: unknown
}

export function openhackCommand(explicit?: string): string {
  const command = explicit ?? process.env.SHUVULN_OPENHACK
  if (!command) {
    throw new Error("SHUVULN_OPENHACK is not set. Run inside `nix develop`.")
  }
  return command
}

/** One OpenHack scan through shuvuln's own Pi. Resolves with the report, also when the scan is partial. */
export function scanSource(options: ScanOptions): Promise<ScanReport> {
  const args = [
    "scan",
    options.directory,
    "--provider",
    "pi",
    "--model",
    options.model ?? OPENHACK_MODEL,
    "--workers",
    String(options.workers ?? 2),
    "--steps",
    String(options.steps ?? 6),
    "--json",
  ]
  return new Promise((resolve, reject) => {
    const child = spawn(openhackCommand(options.command), args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000)
    })
    child.on("error", (error) => reject(new Error(`OpenHack could not start: ${error.message}`)))
    child.on("close", (code) => {
      let report: ScanReport
      try {
        report = JSON.parse(stdout) as ScanReport
      } catch {
        reject(new Error(`OpenHack printed no report (exit ${code}). ${stderr.trim()}`))
        return
      }
      resolve(report)
    })
  })
}

/** Keeps every scan report under shuvuln's home, outside the repository. */
export function saveReport(report: ScanReport): string {
  const runs = join(shuvulnHome(), "runs")
  mkdirSync(runs, { recursive: true, mode: 0o700 })
  const path = join(runs, `${report.id}.json`)
  writeFileSync(path, JSON.stringify(report, null, 2), { mode: 0o600 })
  return path
}
