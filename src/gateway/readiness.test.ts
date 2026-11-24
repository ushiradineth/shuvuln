import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseReadiness } from "./readiness.ts"

describe("parseReadiness", () => {
  it("reads the plain status words", () => {
    assert.equal(parseReadiness("zai", "ready\n", 0).status, "ready")
    assert.equal(parseReadiness("zai", " not_ready \n", 1).status, "not_ready")
    assert.equal(parseReadiness("openai", "invalid\n", 2).status, "invalid")
  })

  it("reads a structured status and keeps the detail", () => {
    const result = parseReadiness("zai", '{"provider":"zai","status":"ready"}', 0)
    assert.equal(result.status, "ready")
    assert.equal(result.detail, '{"provider":"zai","status":"ready"}')
  })

  it("reads the exact JSON Pi 1.6.0 prints before any login", () => {
    const output = '{"status":"not_ready","provider":"zai","reason":"credentials_not_configured"}'
    const result = parseReadiness("zai", output, 1)
    assert.equal(result.status, "not_ready")
    assert.equal(result.detail, output)
    assert.equal(
      parseReadiness("openai", '{"status":"ready","provider":"openai"}', 0).status,
      "ready"
    )
  })

  it("falls back to the exit status when the output says nothing", () => {
    assert.equal(parseReadiness("openai", "something unexpected", 1).status, "not_ready")
    assert.equal(parseReadiness("openai", "something unexpected", 7, "boom").status, "unknown")
    assert.equal(parseReadiness("openai", "", 1, "boom").detail, "boom")
  })

  it("reports a Pi that could not start", () => {
    const result = parseReadiness("zai", "", null, "", new Error("ENOENT"))
    assert.equal(result.status, "unknown")
    assert.match(result.detail, /could not start: ENOENT/)
  })
})
