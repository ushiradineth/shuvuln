import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Program } from "./dataset.ts"
import { rank, score } from "./score.ts"

const TODAY = new Date("2026-11-26T00:00:00Z")

function program(overrides: Partial<Program> & Pick<Program, "name" | "repositories">): Program {
  return {
    platform: "bugcrowd",
    url: "https://example.com",
    paysBounties: true,
    maxPayoutUsd: 1000,
    scopeSize: 1,
    ...overrides,
  }
}

const plugin = {
  host: "github.com" as const,
  owner: "acme",
  repo: "acme-plugin-calls",
  url: "https://github.com/acme/acme-plugin-calls",
}
const server = {
  host: "github.com" as const,
  owner: "acme",
  repo: "server",
  url: "https://github.com/acme/server",
}

describe("tier 1 score", () => {
  it("prefers a paying component over a crowded HackerOne monorepo, with reasons", () => {
    const small = program({ name: "Acme", repositories: [plugin], maxPayoutUsd: 5000 })
    const big: Program = {
      ...program({ name: "Big", repositories: [server] }),
      platform: "hackerone",
      maxPayoutUsd: 20000,
    }
    const ranked = rank(
      [big, small],
      new Map([["github.com/acme/server", { sizeKb: 900_000, pushedAt: "2024-01-01T00:00:00Z" }]]),
      TODAY
    )
    assert.equal(ranked[0]?.program.name, "Acme")
    assert.ok((ranked[0]?.score ?? 0) > (ranked[1]?.score ?? 0))
    assert.ok(ranked[0]?.reasons.some((r) => r.startsWith("a component of a larger product")))
    assert.ok(ranked[1]?.reasons.includes("HackerOne, many researchers (-2)"))
    assert.ok(ranked[1]?.reasons.includes("no change for over a year (-2)"))
  })

  it("scores repository facts, payout and age", () => {
    const fresh = score(
      program({ name: "A", repositories: [server], launchedAt: "2026-06-01" }),
      server,
      { sizeKb: 500, pushedAt: "2026-11-01T00:00:00Z" },
      TODAY
    )
    assert.ok(
      fresh.reasons.includes("small, 500 KB (+3)") &&
        fresh.reasons.includes("changes in the last 90 days (+1)") &&
        fresh.reasons.includes("program under a year old (+2)")
    )
    const dead = score(
      program({ name: "B", repositories: [server] }),
      server,
      { sizeKb: 300, archived: true },
      TODAY
    )
    assert.ok(dead.reasons.includes("archived, so nothing gets fixed (-4)"))
    const unpaid = score(
      program({ name: "C", repositories: [server], paysBounties: false }),
      server,
      undefined,
      TODAY
    )
    assert.ok(unpaid.reasons.includes("pays no bounty (-3)"))
    const org = score(
      program({ name: "D", repositories: [{ ...server, repo: "*" }] }),
      { ...server, repo: "*" },
      undefined,
      TODAY
    )
    assert.ok(org.reasons.includes("whole organisation in scope (-1)"))
  })

  it("breaks ties by payout, then name, so a rerank is stable", () => {
    const a = program({ name: "Zed", repositories: [server], maxPayoutUsd: 1000 })
    const b = program({
      name: "Ay",
      repositories: [{ ...server, owner: "other", url: "https://github.com/other/server" }],
      maxPayoutUsd: 5000,
    })
    assert.deepEqual(
      rank([a, b], new Map(), TODAY).map((c) => c.program.name),
      ["Ay", "Zed"]
    )
  })
})
