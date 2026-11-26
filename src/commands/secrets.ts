import * as readline from "node:readline"
import { readSecret, SECRET_NAMES, secretStatus, writeSecret } from "../secrets.ts"

/** Reads one line without echoing it when the terminal allows that. */
async function readHidden(prompt: string): Promise<string> {
  const input = process.stdin
  if (!input.isTTY) {
    const lines = readline.createInterface({ input })
    try {
      return await new Promise<string>((resolve) => lines.once("line", resolve))
    } finally {
      lines.close()
    }
  }
  process.stdout.write(prompt)
  input.setRawMode(true)
  input.resume()
  let value = ""
  return new Promise((resolve) => {
    const finish = () => {
      input.setRawMode(false)
      input.pause()
      input.off("data", onData)
      process.stdout.write("\n")
      resolve(value)
    }
    const onData = (chunk: Buffer) => {
      for (const key of chunk.toString()) {
        if (key === "\r" || key === "\n") {
          if (value) finish()
        } else if (key === "\u0003") {
          input.setRawMode(false)
          process.exit(130)
        } else if (key === "\u007f" || key === "\b") {
          value = value.slice(0, -1)
        } else {
          value += key
        }
      }
    }
    input.on("data", onData)
  })
}

/** Stores a secret typed by the user. The value is never printed, logged or returned. */
export async function setSecret(name: string): Promise<number> {
  if (!(SECRET_NAMES as readonly string[]).includes(name)) {
    console.error(`Unknown secret "${name}". Known secrets: ${SECRET_NAMES.join(", ")}.`)
    return 2
  }
  if (readSecret(name) !== undefined) console.log(`Replacing the stored ${name} token.`)
  const value = await readHidden(`Paste the ${name} token, then press Enter: `)
  try {
    writeSecret(name, value)
  } catch (error) {
    console.error(`error:  ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
  console.log(`Stored. Nothing prints it back. Check with: shuvuln secret status`)
  return 0
}

export function showSecrets(json: boolean): number {
  const status = secretStatus()
  if (json) console.log(JSON.stringify(status, null, 2))
  else
    for (const item of status) console.log(`${item.name}: ${item.present ? "present" : "missing"}`)
  return 0
}
