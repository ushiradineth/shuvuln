import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseReadiness } from "./readiness.ts"

describe("parseReadiness", () => {
  it("reads the JSON Pi 1.6.0 prints", () => {
    const notReady = '{"status":"not_ready","provider":"zai","reason":"credentials_not_configured"}'
    const result = parseReadiness("zai", notReady + "\n", 1)
    assert.equal(result.status, "not_ready")
    assert.equal(result.detail, notReady)
    assert.equal(result.exitCode, 1)
    assert.equal(
      parseReadiness("openai", '{"status":"ready","provider":"openai"}', 0).status,
      "ready"
    )
    assert.equal(parseReadiness("openai", '{"status":"invalid"}', 2).status, "invalid")
  })

  it("trusts the printed status over the exit code", () => {
    assert.equal(parseReadiness("zai", '{"status":"ready"}', 1).status, "ready")
  })

  it("falls back to the exit status when Pi printed nothing usable", () => {
    assert.equal(parseReadiness("openai", "", 1, "provider unknown").status, "not_ready")
    assert.equal(parseReadiness("openai", "something unexpected", 1).status, "not_ready")
    assert.equal(parseReadiness("openai", "something unexpected", 7, "boom").status, "unknown")
    assert.equal(parseReadiness("openai", "", 1, "boom").detail, "boom")
  })

  it("reports a Pi that did not run", () => {
    const result = parseReadiness("zai", "", null, "", new Error("ENOENT"))
    assert.equal(result.status, "unknown")
    assert.match(result.detail, /did not run: ENOENT/)
  })
})
