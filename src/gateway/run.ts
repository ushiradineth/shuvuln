import { spawn } from "node:child_process"
import { piArgs, type GatewayRequest } from "./args.ts"
import { PiEventReader, type GatewayOutcome } from "./events.ts"
import { gatewayEnvironment } from "./environment.ts"
import { withTempDir } from "./tempdir.ts"

export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000
export const MAX_STDOUT_BYTES = 32 * 1024 * 1024
export const STDERR_TAIL_CHARS = 2000

export interface RunOptions extends GatewayRequest {
  prompt: string
  /** Absolute path to shuvuln's Pi. Defaults to SHUVULN_PI. */
  command?: string
  /** Pi agent directory that holds the provider logins. */
  agentDir: string
  signal?: AbortSignal
  timeoutMs?: number
}

export interface GatewayRun extends GatewayOutcome {
  exitCode: number | null
  /** The last part of Pi's stderr. */
  stderr: string
}

export function piCommand(explicit?: string): string {
  const command = explicit ?? process.env.SHUVULN_PI
  if (!command) {
    throw new Error("SHUVULN_PI is not set. Run inside `nix develop` so shuvuln uses its own Pi.")
  }
  return command
}

/**
 * One prompt in, one result out. The prompt travels on stdin, never on the command line.
 * A run that cannot be trusted has `error` set. Only a missing Pi rejects.
 */
export async function runPi(options: RunOptions): Promise<GatewayRun> {
  const command = piCommand(options.command)
  const args = piArgs(options)
  return withTempDir("shuvuln-gateway-", (cwd) => {
    return new Promise<GatewayRun>((resolve) => {
      const reader = new PiEventReader()
      const child = spawn(command, args, {
        cwd,
        env: gatewayEnvironment(process.env, options.agentDir),
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
      })
      let pending = ""
      let stderr = ""
      let stdoutBytes = 0
      let stopped: string | undefined
      let done = false
      let escalation: ReturnType<typeof setTimeout> | undefined

      const killGroup = (signal: NodeJS.Signals) => {
        try {
          if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal)
          else child.kill(signal)
        } catch {
          // The child has already exited.
        }
      }
      /** Ends the run for a reason outside the model's control and takes the process down. */
      const stop = (reason: string) => {
        if (stopped !== undefined) return
        stopped = reason
        killGroup("SIGTERM")
        escalation = setTimeout(() => killGroup("SIGKILL"), 1000)
      }
      const feed = (line: string) => {
        try {
          reader.push(line.replace(/\r$/, ""))
        } catch (error) {
          stop(error instanceof Error ? error.message : "Pi emitted an unreadable event.")
        }
      }
      const aborted = () => stop("The gateway call was cancelled.")
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
      const deadline = setTimeout(
        () => stop(`Pi did not finish within ${timeoutMs} ms.`),
        timeoutMs
      )
      const finish = (code: number | null) => {
        if (done) return
        done = true
        clearTimeout(deadline)
        clearTimeout(escalation)
        options.signal?.removeEventListener("abort", aborted)
        const outcome = reader.finish()
        const exit =
          code === 0 ? [] : [`Pi exited with status ${code}.`, stderr.trim().replace(/\s+/g, " ")]
        const reasons = [stopped, ...exit, outcome.error].filter(
          (reason): reason is string => reason !== undefined && reason !== null && reason.length > 0
        )
        resolve({
          ...outcome,
          exitCode: code,
          stderr,
          error: reasons.length > 0 ? reasons.join(" ") : null,
        })
      }

      options.signal?.addEventListener("abort", aborted, { once: true })
      if (options.signal?.aborted) aborted()

      child.stdout.setEncoding("utf8")
      child.stderr.setEncoding("utf8")
      child.stdout.on("data", (chunk: string) => {
        stdoutBytes += Buffer.byteLength(chunk)
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          stop("Pi produced more output than the gateway accepts.")
          return
        }
        pending += chunk
        const lines = pending.split("\n")
        pending = lines.pop() ?? ""
        for (const line of lines) feed(line)
      })
      child.stderr.on("data", (chunk: string) => {
        stderr = (stderr + chunk).slice(-STDERR_TAIL_CHARS)
      })
      child.on("error", (error) => {
        // A child that never spawned has no exit to wait for.
        if (!child.pid) {
          stop(`Pi could not start: ${error.message}`)
          finish(null)
        }
      })
      child.stdin.on("error", () => {
        // A closed stdin shows up as the child's exit status.
      })
      child.on("close", (code) => {
        if (pending.trim()) feed(pending)
        if (stopped !== undefined) killGroup("SIGKILL")
        finish(code)
      })
      child.stdin.end(options.prompt)
    })
  })
}
