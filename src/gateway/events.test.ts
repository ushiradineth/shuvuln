import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { PiEventReader } from "./events.ts"

const HEADER = {
  type: "session",
  version: 3,
  id: "uuid",
  timestamp: "2026-11-24T00:00:00.000Z",
  cwd: "/tmp",
}
const USAGE = {
  input: 120,
  output: 5,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 125,
  cost: { total: 0.001 },
}

function assistant(stopReason: string, extra: Record<string, unknown> = {}) {
  return {
    type: "message_end",
    message: {
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
      stopReason,
      usage: USAGE,
      ...extra,
    },
  }
}

function stream(...events: unknown[]) {
  const reader = new PiEventReader()
  for (const event of events) reader.push(JSON.stringify(event) + "\r\n")
  return reader.finish()
}

describe("PiEventReader", () => {
  it("reads a clean run", () => {
    const run = stream(
      HEADER,
      { type: "agent_start" },
      { type: "message_end", message: { role: "user", content: "hi" } },
      assistant("stop"),
      { type: "agent_end", messages: [], willRetry: false },
      { type: "agent_settled", aborted: false }
    )
    assert.equal(run.text, "Hello")
    assert.equal(run.stopReason, "stop")
    assert.equal(run.usage.input, 120)
    assert.equal(run.usage.cost.total, 0.001)
    assert.equal(run.error, null)
    assert.equal(run.settled, true)
  })

  it("keeps a run clean when a retry followed a failed attempt", () => {
    const run = stream(
      HEADER,
      { type: "auto_retry_start", attempt: 1, maxAttempts: 3, delayMs: 2000, errorMessage: "429" },
      assistant("error", { errorMessage: "429 rate limit" }),
      { type: "auto_retry_end", success: true, attempt: 2 },
      assistant("stop"),
      { type: "agent_settled", aborted: false }
    )
    assert.equal(run.retries, 1)
    assert.equal(run.text, "Hello")
    assert.equal(run.error, null)
  })

  it("reports an exhausted retry together with the model's own error", () => {
    const run = stream(
      HEADER,
      { type: "auto_retry_end", success: false, attempt: 3, finalError: "429 rate limit" },
      assistant("error", { errorMessage: "no credentials" }),
      { type: "agent_settled", aborted: false }
    )
    assert.equal(run.retries, 0)
    assert.match(run.error ?? "", /stopped retrying: 429 rate limit/)
    assert.match(run.error ?? "", /reported an error: no credentials/)
    assert.match(run.error ?? "", /stopped with error/)
  })

  it("treats any tool execution as a violation", () => {
    const run = stream(
      HEADER,
      { type: "tool_execution_start", toolCallId: "c1", toolName: "bash", args: { command: "ls" } },
      assistant("stop"),
      { type: "agent_settled", aborted: false }
    )
    assert.equal(run.toolExecutions, 1)
    assert.match(run.error ?? "", /although tools were disabled/)
  })

  it("requires the session header first", () => {
    assert.throws(() => stream({ type: "agent_start" }), /session header/)
  })

  it("rejects output that is not JSON", () => {
    const reader = new PiEventReader()
    assert.throws(() => reader.push("not json"), /not JSON/)
  })

  it("flags a run that never settled", () => {
    const run = stream(HEADER, assistant("stop"))
    assert.match(run.error ?? "", /before the run settled/)
  })

  it("flags a truncated answer", () => {
    const run = stream(HEADER, assistant("length"), { type: "agent_settled", aborted: false })
    assert.match(run.error ?? "", /stopped with length/)
  })

  it("flags a run Pi aborted even when a message arrived", () => {
    const run = stream(HEADER, assistant("stop"), { type: "agent_settled", aborted: true })
    assert.equal(run.settled, true)
    assert.match(run.error ?? "", /aborted the run/)
  })
})
