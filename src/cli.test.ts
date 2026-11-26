import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { after, before, describe, it } from "node:test"
import { readSecret, secretPath, secretStatus, writeSecret } from "./secrets.ts"

const CLI = fileURLToPath(new URL("./cli.ts", import.meta.url))

/** Runs the command line with a Pi and an OpenHack that do not exist, so no provider is contacted. */
function cli(args: string[], env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    timeout: 20_000,
    input: env.input ?? "",
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      SHUVULN_PI: "/nonexistent/pi",
      SHUVULN_OPENHACK: "/nonexistent/openhack",
      ...env,
    },
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

describe("secrets", () => {
  const previous = process.env.SHUVULN_HOME
  let home = ""
  before(() => {
    home = mkdtempSync(join(tmpdir(), "shuvuln-secrets-"))
    process.env.SHUVULN_HOME = home
  })
  after(() => {
    if (previous !== undefined) process.env.SHUVULN_HOME = previous
    else delete process.env.SHUVULN_HOME
    rmSync(home, { recursive: true, force: true })
  })

  it("stores a token as a private one-line file and reports presence only", () => {
    assert.deepEqual(secretStatus(), [{ name: "hexbrain", present: false }])
    writeSecret("hexbrain", "  abc123 \n")
    assert.equal(readSecret("hexbrain"), "abc123")
    assert.equal(statSync(secretPath("hexbrain")).mode & 0o777, 0o600)
    assert.deepEqual(secretStatus(), [{ name: "hexbrain", present: true }])
    assert.ok(!JSON.stringify(secretStatus()).includes("abc123"))
  })

  it("refuses empty, multi-line, oversized and unknown secrets", () => {
    for (const bad of ["", "   ", "two words", "line\nline"]) {
      assert.throws(() => writeSecret("hexbrain", bad), Error, JSON.stringify(bad))
    }
    assert.throws(() => writeSecret("hexbrain", "x".repeat(513)), Error)
    assert.throws(() => secretPath("other"), /Unknown secret/)
  })
})

describe("the command line", () => {
  const home = mkdtempSync(join(tmpdir(), "shuvuln-cli-"))

  it("prints usage with no arguments and for --help", () => {
    for (const args of [[], ["--help"]]) {
      const run = cli(args, { SHUVULN_HOME: home })
      assert.equal(run.status, 0)
      assert.match(run.stdout, /^shuvuln: authorised bug bounty research harness/)
    }
  })

  it("rejects an unknown command and an unknown option with status 2", () => {
    assert.equal(cli(["bogus"], { SHUVULN_HOME: home }).status, 2)
    const run = cli(["gateway", "ping", "--model", "zai/glm-5.4", "--wat"], { SHUVULN_HOME: home })
    assert.equal(run.status, 2)
    assert.match(run.stderr, /unknown option --wat/)
  })

  it("reads a valued option in both spellings and reports a missing Pi as status 1", () => {
    for (const args of [
      ["gateway", "ping", "--model", "zai/glm-5.4"],
      ["gateway", "ping", "--model=zai/glm-5.4"],
    ]) {
      const run = cli(args, { SHUVULN_HOME: home })
      assert.equal(run.status, 1, args.join(" "))
      assert.match(run.stderr, /Pi could not start/)
    }
    const json = cli(["gateway", "ping", "--model", "zai/glm-5.4", "--json"], {
      SHUVULN_HOME: home,
    })
    assert.equal(json.status, 1)
    assert.match(json.stdout, /Pi could not start/)
  })

  it("uses the stage model when ping names none", () => {
    const run = cli(["gateway", "ping", "--json"], { SHUVULN_HOME: home })
    assert.equal(run.status, 1)
    assert.match(run.stdout, /"model": "zai\/glm-5.4"/)
  })

  it("treats a value-less or invalid option as a usage error", () => {
    for (const args of [
      ["gateway", "ping", "--model"],
      ["gateway", "ping", "--model", "--json"],
      ["hunt", "scan", ".", "--workers", "0"],
      ["hunt", "scan", ".", "--steps", "two"],
    ]) {
      const run = cli(args, { SHUVULN_HOME: home })
      assert.equal(run.status, 2, args.join(" "))
    }
  })

  it("reports a missing OpenHack as status 1 for a scan", () => {
    const run = cli(["hunt", "scan", ".", "--workers", "1", "--steps=2"], { SHUVULN_HOME: home })
    assert.equal(run.status, 1)
    assert.match(run.stderr, /OpenHack could not start/)
  })

  it("stores a secret from piped input and never prints it back", () => {
    const set = cli(["secret", "set", "hexbrain"], { SHUVULN_HOME: home, input: "s3cret-token\n" })
    assert.equal(set.status, 0)
    assert.ok(!`${set.stdout}${set.stderr}`.includes("s3cret-token"))
    assert.equal(readFileSync(join(home, "secrets", "hexbrain.token"), "utf8"), "s3cret-token\n")
    const status = cli(["secret", "status"], { SHUVULN_HOME: home })
    assert.equal(status.status, 0)
    assert.match(status.stdout, /hexbrain: present/)
    assert.equal(cli(["secret", "set", "nope"], { SHUVULN_HOME: home, input: "x\n" }).status, 2)
    writeFileSync(join(home, "secrets", "hexbrain.token"), "")
  })
})
