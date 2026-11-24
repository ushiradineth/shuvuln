import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const CLI = fileURLToPath(new URL("./cli.ts", import.meta.url))

/** Runs the command line with a Pi that does not exist, so no provider is ever contacted. */
function cli(args: string[], env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    timeout: 20_000,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      SHUVULN_PI: "/nonexistent/pi",
      ...env,
    },
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

describe("the command line", () => {
  it("prints usage with no arguments and for --help", () => {
    for (const args of [[], ["--help"]]) {
      const run = cli(args)
      assert.equal(run.status, 0)
      assert.match(run.stdout, /^shuvuln: authorised bug bounty research harness/)
    }
  })

  it("rejects an unknown command and an unknown option with status 2", () => {
    assert.equal(cli(["bogus"]).status, 2)
    const run = cli(["gateway", "ping", "--model", "zai/glm-5.4", "--wat"])
    assert.equal(run.status, 2)
    assert.match(run.stderr, /unknown option --wat/)
  })

  it("reads --model in both spellings and reports a missing Pi as status 1", () => {
    for (const args of [
      ["gateway", "ping", "--model", "zai/glm-5.4"],
      ["gateway", "ping", "--model=zai/glm-5.4"],
    ]) {
      const run = cli(args)
      assert.equal(run.status, 1, args.join(" "))
      assert.match(run.stderr, /Pi could not start/)
    }
    const json = cli(["gateway", "ping", "--model", "zai/glm-5.4", "--json"])
    assert.equal(json.status, 1)
    assert.match(json.stdout, /Pi could not start/)
  })

  it("treats a value-less --model as a usage error", () => {
    for (const args of [
      ["gateway", "ping", "--model"],
      ["gateway", "ping", "--model", "--json"],
      ["gateway", "ping"],
    ]) {
      const run = cli(args)
      assert.equal(run.status, 2, args.join(" "))
    }
  })
})
