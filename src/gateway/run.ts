import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { piArgs, type GatewayRequest } from "./args.ts"
import { PiEventReader, type GatewayOutcome } from "./events.ts"
import { gatewayEnvironment } from "./environment.ts"

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
  stderr: string
}

/** A run that ended for a reason outside the model's control, such as a deadline or bad output. */
export class GatewayFailure extends Error {
  readonly run: GatewayRun

  constructor(message: string, run: GatewayRun) {
    super(message)
    this.name = "GatewayFailure"
    this.run = run
  }
}

export function piCommand(explicit?: string): string {
  const command = explicit ?? process.env.SHUVULN_PI
  if (!command) {
    throw new Error("SHUVULN_PI is not set. Run inside `nix develop` so shuvuln uses its own Pi.")
  }
  return command
}

/** One prompt in, one parsed result out. The prompt travels on stdin, never on the command line. */
export async function runPi(options: RunOptions): Promise<GatewayRun> {
  const command = piCommand(options.command)
  const args = piArgs(options)
  const cwd = await mkdtemp(join(tmpdir(), "shuvuln-gateway-"))
  try {
    return await new Promise<GatewayRun>((resolve, reject) => {
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
      let failure: Error | undefined
      let exitCode: number | null = null
      let escalation: ReturnType<typeof setTimeout> | undefined

      const killGroup = (signal: NodeJS.Signals) => {
        try {
          if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal)
          else child.kill(signal)
        } catch {
          // The child has already exited.
        }
      }
      const stop = (error: Error) => {
        if (failure) return
        failure = error
        killGroup("SIGTERM")
        escalation = setTimeout(() => killGroup("SIGKILL"), 1000)
      }
      const feed = (line: string) => {
        try {
          reader.push(line.replace(/\r$/, ""))
        } catch (error) {
          stop(error instanceof Error ? error : new Error("Pi emitted an unreadable event."))
        }
      }
      const aborted = () => stop(new Error("The gateway call was cancelled."))
      options.signal?.addEventListener("abort", aborted, { once: true })
      if (options.signal?.aborted) aborted()
      const deadline = setTimeout(
        () =>
          stop(
            new Error(`Pi did not finish within ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS} ms.`)
          ),
        options.timeoutMs ?? DEFAULT_TIMEOUT_MS
      )

      child.stdout.setEncoding("utf8")
      child.stderr.setEncoding("utf8")
      child.stdout.on("data", (chunk: string) => {
        stdoutBytes += Buffer.byteLength(chunk)
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          stop(new Error("Pi produced more output than the gateway accepts."))
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
        failure ??= new Error(`Pi could not start: ${error.message}`)
      })
      child.stdin.on("error", () => {
        // A closed stdin is reported through the child's exit status.
      })
      child.on("close", (code) => {
        clearTimeout(deadline)
        clearTimeout(escalation)
        options.signal?.removeEventListener("abort", aborted)
        if (pending.trim()) feed(pending)
        const outcome = reader.finish()
        const run: GatewayRun = { ...outcome, exitCode: code, stderr }
        if (failure) {
          killGroup("SIGKILL")
          reject(new GatewayFailure(failure.message, run))
          return
        }
        if (code !== 0) {
          // Pi's own explanation on stderr is the useful part, so it comes first.
          run.error = [
            `Pi exited with status ${code}.`,
            stderr.trim().replace(/\s+/g, " "),
            run.error,
          ]
            .filter(Boolean)
            .join(" ")
        }
        resolve(run)
      })
      child.stdin.end(options.prompt)
    })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
}
