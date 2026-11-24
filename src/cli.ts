#!/usr/bin/env node
import { checkProviders, openLogin } from "./commands/auth.ts"
import { ping } from "./commands/gateway.ts"
import { piAgentDir } from "./paths.ts"

const USAGE = `shuvuln: authorised bug bounty research harness

Usage:
  shuvuln auth status [--json]     Check that shuvuln's own Pi can reach z.ai and OpenAI
  shuvuln auth login               Open shuvuln's own Pi to run /login
  shuvuln gateway ping --model <provider/model> [--json]
                                   Send one tiny prompt through the model gateway
  shuvuln --help                   Show this text
`

interface Arguments {
  words: string[]
  flags: Set<string>
  values: Map<string, string>
}

function parseArguments(argv: string[]): Arguments | string {
  const words: string[] = []
  const flags = new Set<string>()
  const values = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === undefined) continue
    if (!arg.startsWith("--")) {
      words.push(arg)
      continue
    }
    const [name, inline] = arg.slice(2).split("=", 2)
    if (name === "json" || name === "help") {
      flags.add(name)
      continue
    }
    if (name === "model") {
      const value = inline ?? argv[i + 1]
      if (value === undefined || value.startsWith("--")) return "--model needs a value"
      values.set(name, value)
      i += inline === undefined ? 1 : 0
      continue
    }
    return `unknown option ${arg}`
  }
  return { words, flags, values }
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArguments(argv)
  if (typeof parsed === "string") {
    console.error(`${parsed}\n\n${USAGE}`)
    return 2
  }
  const { words, flags, values } = parsed
  const [group, command] = words
  if (flags.has("help") || words.length === 0) {
    console.log(USAGE)
    return 0
  }
  const agentDir = piAgentDir()
  if (group === "auth" && command === "status" && words.length === 2) {
    const readiness = checkProviders(agentDir)
    if (flags.has("json")) {
      console.log(JSON.stringify(readiness, null, 2))
    } else {
      for (const item of readiness) console.log(`${item.provider}: ${item.status} (${item.detail})`)
    }
    return readiness.every((item) => item.status === "ready") ? 0 : 1
  }
  if (group === "auth" && command === "login" && words.length === 2) {
    return openLogin(agentDir) ?? 1
  }
  if (group === "gateway" && command === "ping" && words.length === 2) {
    const model = values.get("model")
    if (!model) {
      console.error(`gateway ping needs --model provider/model\n\n${USAGE}`)
      return 2
    }
    return ping(model, agentDir, flags.has("json"))
  }
  console.error(`unknown command ${words.join(" ")}\n\n${USAGE}`)
  return 2
}

process.exitCode = await main(process.argv.slice(2))
