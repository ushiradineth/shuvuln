#!/usr/bin/env node
// A stand-in for shuvuln's Pi in the gateway's tests. The requested model names the behaviour.
import { setInterval as every } from "node:timers"

const model = process.argv[process.argv.indexOf("--model") + 1] ?? ""
const header = JSON.stringify({
  type: "session",
  version: 3,
  id: "fake",
  timestamp: "2026-11-24T00:00:00.000Z",
  cwd: process.cwd(),
})
const reply = (text: string) =>
  JSON.stringify({
    type: "message_end",
    message: {
      role: "assistant",
      content: [{ type: "text", text }],
      stopReason: "stop",
      usage: {
        input: 10,
        output: 2,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 12,
        cost: { total: 0 },
      },
    },
  })

let prompt = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk: string) => {
  prompt += chunk
})
process.stdin.on("end", () => {
  switch (model) {
    case "fake/pong":
      process.stdout.write(
        [
          header,
          reply(`pong:${prompt.trim()}`),
          JSON.stringify({ type: "agent_settled", aborted: false }),
        ].join("\n") + "\n"
      )
      return
    case "fake/refuses":
      process.stdout.write(header + "\n")
      process.stderr.write("No API key found for fake.\n")
      process.exit(1)
      return
    case "fake/not-json":
      process.stdout.write(header + "\nthis is not json\n")
      return
    case "fake/sleeps":
      every(() => {}, 1000)
      return
    default:
      process.stderr.write(`fake-pi: unknown model ${model}\n`)
      process.exit(64)
  }
})
