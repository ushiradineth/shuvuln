#!/usr/bin/env node
import { checkProviders, openLogin } from "./commands/auth.ts"
import { ping } from "./commands/gateway.ts"
import { scan } from "./commands/hunt.ts"
import { setSecret, showSecrets } from "./commands/secrets.ts"
import { STAGE_MODEL } from "./models.ts"
import { piAgentDir } from "./paths.ts"

const USAGE = `shuvuln: authorised bug bounty research harness

Usage:
  shuvuln auth status [--json]        Check that shuvuln's own Pi can reach z.ai and OpenAI
  shuvuln auth login                  Open shuvuln's own Pi to run /login
  shuvuln secret set <name>           Store a token where only you can read it (known: hexbrain)
  shuvuln secret status [--json]      Say which secrets exist, without printing them
  shuvuln gateway ping [--model <provider/model>] [--json]
                                      Send one tiny prompt through a shuvuln stage model
  shuvuln hunt scan <directory> [--model <provider/model>] [--workers N] [--steps N] [--json]
                                      Run OpenHack on a directory, through shuvuln's own Pi
  shuvuln --help                      Show this text
`

type Options = { flags: Set<string>; values: Map<string, string> }
type Arguments = ({ ok: true; words: string[] } & Options) | { ok: false; message: string }

/** Options that take a value, in both the `--name value` and `--name=value` spellings. */
const VALUED = new Set(["model", "workers", "steps"])

function parseArguments(argv: string[]): Arguments {
  const words: string[] = []
  const flags = new Set<string>()
  const values = new Map<string, string>()
  const consumed = new Set<number>()
  for (const [index, arg] of argv.entries()) {
    if (consumed.has(index)) continue
    if (!arg.startsWith("--")) {
      words.push(arg)
      continue
    }
    const [name, inline] = arg.slice(2).split("=", 2)
    if (name === "json" || name === "help") {
      flags.add(name)
      continue
    }
    if (name !== undefined && VALUED.has(name)) {
      const next = argv[index + 1]
      if (inline !== undefined) {
        values.set(name, inline)
        continue
      }
      if (next !== undefined && !next.startsWith("--")) {
        values.set(name, next)
        consumed.add(index + 1)
        continue
      }
    }
    return {
      ok: false,
      message:
        name !== undefined && VALUED.has(name)
          ? `--${name} needs a value`
          : `unknown option ${arg}`,
    }
  }
  return { ok: true, words, flags, values }
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  name: string
): number | string {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return `--${name} needs a positive whole number`
  return parsed
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArguments(argv)
  if (!parsed.ok) {
    console.error(`${parsed.message}\n\n${USAGE}`)
    return 2
  }
  const { words, flags, values } = parsed
  const [group, command, argument] = words
  if (flags.has("help") || words.length === 0) {
    console.log(USAGE)
    return 0
  }
  const agentDir = piAgentDir()
  if (group === "auth" && command === "status" && words.length === 2) {
    const readiness = await checkProviders(agentDir)
    if (flags.has("json")) {
      console.log(JSON.stringify(readiness, null, 2))
    } else {
      for (const item of readiness) console.log(`${item.provider}: ${item.status} (${item.detail})`)
    }
    return readiness.every((item) => item.status === "ready") ? 0 : 1
  }
  if (group === "auth" && command === "login" && words.length === 2) {
    return (await openLogin(agentDir)) ?? 1
  }
  if (group === "secret" && command === "set" && words.length === 3) {
    return setSecret(argument ?? "")
  }
  if (group === "secret" && command === "status" && words.length === 2) {
    return showSecrets(flags.has("json"))
  }
  if (group === "gateway" && command === "ping" && words.length === 2) {
    const model = values.get("model") ?? STAGE_MODEL
    return ping(model, agentDir, flags.has("json"))
  }
  if (group === "hunt" && command === "scan" && words.length === 3) {
    const workers = positiveInteger(values.get("workers"), 2, "workers")
    if (typeof workers === "string") {
      console.error(`${workers}\n\n${USAGE}`)
      return 2
    }
    const steps = positiveInteger(values.get("steps"), 6, "steps")
    if (typeof steps === "string") {
      console.error(`${steps}\n\n${USAGE}`)
      return 2
    }
    const model = values.get("model")
    return scan(argument ?? "", {
      ...(model ? { model } : {}),
      workers,
      steps,
      json: flags.has("json"),
    })
  }
  console.error(`unknown command ${words.join(" ")}\n\n${USAGE}`)
  return 2
}

process.exitCode = await main(process.argv.slice(2))
