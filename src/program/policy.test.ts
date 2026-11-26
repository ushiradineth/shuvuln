import assert from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import mattermost from "../../programs/mattermost.ts"
import { loadPrograms, requireApprovedProgram, validateProgram } from "./policy.ts"

const MINIMAL = {
  program: "acme",
  platform: "bugcrowd",
  brief: "https://bugcrowd.com/engagements/acme",
  brief_last_updated: "2026-11-01",
  approved_by: "shu",
  approved_on: "2026-11-02",
  live_testing: "unapproved",
  local_installation: "allowed",
  safe_harbor: "full",
  identity_verification_required: false,
  disclosure: "coordinated",
  rating: "VRT",
  rewards_usd: { P1: 1000 },
  accounts: { email_domain: "bugcrowdninja.com", signup: "https://example.com", roles: ["Member"] },
  targets: [{ name: "acme-plugin", source: "https://github.com/acme/acme-plugin" }],
  out_of_scope: [],
  ineligible: [],
  known_issues: [],
  ai_policy: "not addressed",
  submission_stop: { after_consecutive_not_applicable_or_informative: 3 },
}

describe("program policy", () => {
  it("accepts the Mattermost brief and a minimal file", () => {
    const real = validateProgram(mattermost)
    assert.equal(real.ok, true)
    assert.equal(validateProgram(MINIMAL).ok, true)
  })

  it("lists every problem at once", () => {
    const result = validateProgram({
      ...MINIMAL,
      approved_by: "",
      live_testing: "maybe",
      brief: "http://x",
      targets: [],
      submission_stop: { after_consecutive_not_applicable_or_informative: 0 },
    })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.deepEqual(result.problems, [
      "brief must be an https address",
      "approved_by must be non-empty text",
      "live_testing must be one of unapproved, approved",
      "targets must be a list with a name each",
      "submission_stop.after_consecutive_not_applicable_or_informative must be at least 1",
    ])
  })

  it("loads program files by their file name and refuses unapproved work", async () => {
    const dir = mkdtempSync(join(tmpdir(), "shuvuln-programs-"))
    try {
      writeFileSync(join(dir, "acme.ts"), `export default ${JSON.stringify(MINIMAL)}`)
      writeFileSync(
        join(dir, "wrong.ts"),
        `export default ${JSON.stringify({ ...MINIMAL, program: "other" })}`
      )
      writeFileSync(join(dir, "notes.txt"), "not a program")
      const loaded = await loadPrograms(dir)
      assert.deepEqual(
        loaded.map((l) => [l.program, l.ok]),
        [
          ["acme", true],
          ["wrong", false],
        ]
      )
      assert.match(
        loaded[1]?.ok === false ? (loaded[1].problems[0] ?? "") : "",
        /program must be "wrong"/
      )
      assert.equal(requireApprovedProgram(loaded, "acme").program, "acme")
      assert.throws(() => requireApprovedProgram(loaded, "wrong"), /wrong is invalid/)
      assert.throws(() => requireApprovedProgram(loaded, "nobody"), /no program file for nobody/)
      assert.deepEqual(await loadPrograms(join(dir, "missing")), [])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
