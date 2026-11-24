export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  cost: { total: number }
}

export type StopReason = "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred"

export interface GatewayOutcome {
  /** Text blocks of the final assistant message. */
  text: string
  stopReason: StopReason | null
  usage: Usage
  retries: number
  toolExecutions: number
  settled: boolean
  /** Null when the run finished cleanly. Otherwise every reason its output cannot be trusted. */
  error: string | null
}

const STOP_REASONS: readonly string[] = [
  "stop",
  "length",
  "toolUse",
  "error",
  "aborted",
  "deferred",
]

export function emptyUsage(): Usage {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { total: 0 } }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0
}

function readUsage(value: Record<string, unknown> | undefined): Usage {
  const cost = record(value?.cost)
  return {
    input: count(value?.input),
    output: count(value?.output),
    cacheRead: count(value?.cacheRead),
    cacheWrite: count(value?.cacheWrite),
    totalTokens: count(value?.totalTokens),
    cost: { total: count(cost?.total) },
  }
}

/** Reads Pi's JSON event stream and keeps only what a caller may rely on. */
export class PiEventReader {
  private text = ""
  private stopReason: StopReason | null = null
  private usage = emptyUsage()
  private retries = 0
  private toolExecutions = 0
  private settled = false
  private sawHeader = false
  private readonly failures: string[] = []

  push(line: string): void {
    if (!line.trim()) return
    let event: unknown
    try {
      event = JSON.parse(line)
    } catch {
      throw new Error(`Pi emitted a line that is not JSON: ${line.slice(0, 120)}`)
    }
    const item = record(event)
    if (!item || typeof item.type !== "string") {
      throw new Error("Pi emitted an event without a type.")
    }
    if (!this.sawHeader) {
      if (item.type !== "session")
        throw new Error("Pi did not start its output with a session header.")
      this.sawHeader = true
      return
    }
    this.consume(item)
  }

  private consume(event: Record<string, unknown>): void {
    switch (event.type) {
      case "message_end": {
        const message = record(event.message)
        if (message?.role === "assistant") this.readAssistant(message)
        return
      }
      case "tool_execution_start":
        this.toolExecutions += 1
        return
      case "auto_retry_start":
        this.retries += 1
        return
      case "auto_retry_end":
        if (event.success === false) {
          this.failures.push(
            `Pi stopped retrying: ${text(event.finalError) ?? "the provider kept failing"}`
          )
        }
        return
      case "agent_settled":
        this.settled = true
        if (event.aborted === true) this.failures.push("Pi aborted the run.")
        return
      default:
        return
    }
  }

  private readAssistant(message: Record<string, unknown>): void {
    const blocks = Array.isArray(message.content) ? message.content : []
    this.text = blocks
      .map(record)
      .filter((block) => block?.type === "text")
      .map((block) => text(block?.text))
      .filter((part): part is string => part !== undefined)
      .join("")
    const reason = text(message.stopReason)
    this.stopReason = reason && STOP_REASONS.includes(reason) ? (reason as StopReason) : null
    this.usage = readUsage(record(message.usage))
    const errorMessage = text(message.errorMessage)
    if (errorMessage) this.failures.push(`Pi reported an error: ${errorMessage}`)
  }

  finish(): GatewayOutcome {
    const problems = [...this.failures]
    if (!this.settled) problems.push("Pi exited before the run settled.")
    if (this.toolExecutions > 0) {
      problems.push(`Pi executed ${this.toolExecutions} tool call(s) although tools were disabled.`)
    }
    if (this.stopReason !== "stop") {
      problems.push(`Pi stopped with ${this.stopReason ?? "no assistant message"}.`)
    }
    return {
      text: this.text,
      stopReason: this.stopReason,
      usage: this.usage,
      retries: this.retries,
      toolExecutions: this.toolExecutions,
      settled: this.settled,
      error: problems.length > 0 ? problems.join(" ") : null,
    }
  }
}
