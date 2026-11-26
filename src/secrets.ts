import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { shuvulnHome } from "./paths.ts"

export const SECRET_NAMES = ["hexbrain"] as const
export type SecretName = (typeof SECRET_NAMES)[number]

/** Secrets live outside the repository, in files only the user can read. */
export function secretsDir(): string {
  return join(shuvulnHome(), "secrets")
}

export function secretPath(name: string): string {
  if (!(SECRET_NAMES as readonly string[]).includes(name)) {
    throw new Error(`Unknown secret "${name}". Known secrets: ${SECRET_NAMES.join(", ")}.`)
  }
  return join(secretsDir(), `${name}.token`)
}

/** Says which secrets exist. It never reads a value. */
export function secretStatus(): { name: SecretName; present: boolean }[] {
  return SECRET_NAMES.map((name) => ({ name, present: existsSync(secretPath(name)) }))
}

/** Stores a secret as one line that only the user can read. It never returns or logs the value. */
export function writeSecret(name: string, value: string): void {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) throw new Error("A secret is one line without spaces.")
  if (trimmed.length > 512) throw new Error("A secret is at most 512 characters.")
  mkdirSync(secretsDir(), { recursive: true, mode: 0o700 })
  writeFileSync(secretPath(name), `${trimmed}\n`, { mode: 0o600 })
}

export function readSecret(name: string): string | undefined {
  try {
    return readFileSync(secretPath(name), "utf8").trim() || undefined
  } catch {
    return undefined
  }
}
