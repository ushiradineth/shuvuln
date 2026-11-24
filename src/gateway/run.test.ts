import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { runPi } from "./run.ts"

const FAKE_PI = fileURLToPath(new URL("./fixtures/fake-pi.ts", import.meta.url))
const AGENT_DIR = "/unused-by-the-fake"

describe("runPi", () => {
  it("returns the final text and usage from a clean run", async () => {
    const run = await runPi({
      command: FAKE_PI,
      model: "fake/pong",
      agentDir: AGENT_DIR,
      prompt: "  hello  ",
    })
    assert.equal(run.text, "pong:hello")
    assert.equal(run.error, null)
    assert.equal(run.exitCode, 0)
    assert.equal(run.usage.input, 10)
    assert.equal(run.stopReason, "stop")
  })

  it("reports a refusal with Pi's own explanation first", async () => {
    const run = await runPi({
      command: FAKE_PI,
      model: "fake/refuses",
      agentDir: AGENT_DIR,
      prompt: "hi",
    })
    assert.match(run.error ?? "", /^Pi exited with status 1\. No API key found for fake\./)
    assert.equal(run.exitCode, 1)
    assert.equal(run.text, "")
  })

  it("treats output that is not JSON as untrusted", async () => {
    const run = await runPi({
      command: FAKE_PI,
      model: "fake/not-json",
      agentDir: AGENT_DIR,
      prompt: "hi",
    })
    assert.match(run.error ?? "", /^Pi emitted a line that is not JSON/)
  })

  it("stops a run at its deadline", async () => {
    const started = Date.now()
    const run = await runPi({
      command: FAKE_PI,
      model: "fake/sleeps",
      agentDir: AGENT_DIR,
      prompt: "hi",
      timeoutMs: 300,
    })
    assert.match(run.error ?? "", /^Pi did not finish within 300 ms/)
    assert.ok(Date.now() - started < 5000, "the deadline must end the run promptly")
  })

  it("stops a run when cancelled", async () => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 300)
    const run = await runPi({
      command: FAKE_PI,
      model: "fake/sleeps",
      agentDir: AGENT_DIR,
      prompt: "hi",
      signal: controller.signal,
    })
    assert.match(run.error ?? "", /^The gateway call was cancelled/)
  })

  it("fails fast when Pi cannot start", async () => {
    const started = Date.now()
    const run = await runPi({
      command: "/nonexistent/pi",
      model: "fake/pong",
      agentDir: AGENT_DIR,
      prompt: "hi",
      timeoutMs: 8000,
    })
    assert.match(run.error ?? "", /^Pi could not start/)
    assert.ok(Date.now() - started < 3000)
  })

  it("refuses to run without a Pi to call", async () => {
    const saved = process.env.SHUVULN_PI
    delete process.env.SHUVULN_PI
    try {
      await assert.rejects(
        runPi({ model: "fake/pong", agentDir: AGENT_DIR, prompt: "hi" }),
        /SHUVULN_PI/
      )
    } finally {
      if (saved !== undefined) process.env.SHUVULN_PI = saved
    }
  })
})
