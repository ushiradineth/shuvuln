import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Program } from "./dataset.ts"
import { score } from "./score.ts"
import { parseTriage, triagePrompt } from "./triage.ts"

const program: Program = {
  platform: "bugcrowd",
  name: "Acme",
  url: "https://example.com",
  paysBounties: true,
  maxPayoutUsd: 2000,
  scopeSize: 3,
  repositories: [],
}
const repository = {
  host: "github.com" as const,
  owner: "acme",
  repo: "acme-plugin",
  url: "https://github.com/acme/acme-plugin",
}

describe("tier 2 triage", () => {
  it("reads the verdict from a reply, with or without fences and preamble", () => {
    const usage = { input: 10, output: 5 }
    const clean = parseTriage(
      '{"keep": true, "kind": "plugin", "attack_surface": "Routes.", "reason": "Has handlers."}',
      "zai/x",
      usage
    )
    assert.deepEqual(clean, {
      keep: true,
      kind: "plugin",
      attackSurface: "Routes.",
      reason: "Has handlers.",
      model: "zai/x",
      usage,
    })
    assert.equal(
      parseTriage(
        'Here it is:\n```json\n{"keep": false, "kind": "docs", "attack_surface": "None", "reason": "Documentation only."}\n```',
        "zai/x",
        usage
      )?.keep,
      false
    )
    assert.equal(parseTriage('{"keep": "yes", "kind": "plugin"}', "zai/x", usage), null)
    assert.equal(parseTriage("no json here", "zai/x", usage), null)
  })

  it("describes the pair and caps the README in the prompt", () => {
    const candidate = score(
      program,
      repository,
      { sizeKb: 900, language: "Go", description: "Acme calls plugin" },
      new Date("2026-11-26")
    )
    const prompt = triagePrompt(candidate, "# Acme plugin\n".repeat(50))
    assert.match(prompt, /Program: Acme on bugcrowd, pays up to \$2000/)
    assert.match(prompt, /Repository: https:\/\/github\.com\/acme\/acme-plugin/)
    assert.match(prompt, /Language: Go/)
    assert.match(prompt, /README, first 700 characters/)
    assert.match(triagePrompt(candidate, undefined), /\(no README found\)/)
  })
})
