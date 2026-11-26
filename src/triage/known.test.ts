import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { indexKnown, keywords, matchKnown, parseAdvisoryFeed } from "./known.ts"

const FEED = [
  {
    issue_id: "MMSA-2024-00350",
    details:
      "(CWE-284) Fixed an issue where a user could delete an\n\t arbitrary post based on the post's ID via the Playbooks /ignore-thread endpoint. Thanks to Jesse",
    fix_release_date: "2024-09-26T00:00:00Z",
  },
  {
    issue_id: "MMSA-2022-00115,CVE-2022-XXXX",
    details:
      "(Denial of Service)  Fixed an issue where a specifically crafted GIF file upload could cause resource exhaustion.",
    fix_release_date: "2022-08-16",
  },
  { issue_id: "", details: "no id" },
  { issue_id: "MMSA-2020-0001", details: "   " },
  { issue_id: "MMSA-2020-0002", details: "odd date", fix_release_date: "Fix " },
]

describe("known fixes", () => {
  it("reads the vendor feed and drops entries without an id or text", () => {
    const fixes = parseAdvisoryFeed(FEED)
    assert.deepEqual(
      fixes.map((f) => f.id),
      ["MMSA-2024-00350", "MMSA-2022-00115", "MMSA-2020-0002"]
    )
    assert.equal(fixes[0]?.date, "2024-09-26")
    assert.equal(fixes[1]?.date, "2022-08-16")
    assert.equal(fixes[2]?.date, undefined)
    assert.match(
      fixes[0]?.text ?? "",
      /^\(CWE-284\) Fixed an issue where a user could delete an arbitrary post/
    )
    assert.deepEqual(parseAdvisoryFeed({ no: "list" }), [])
  })

  it("keeps topic words only and folds plurals", () => {
    assert.deepEqual(
      keywords("Users can delete arbitrary posts through the ignore-thread endpoint."),
      new Set(["user", "delete", "arbitrary", "post", "ignore", "thread", "endpoint"])
    )
  })

  it("pairs a finding with the fix that covers it and leaves the rest alone", () => {
    const index = indexKnown(parseAdvisoryFeed(FEED))
    const hit = matchKnown(
      {
        title: "Authenticated users can delete arbitrary posts through the keyword-ignore endpoint",
      },
      index
    )
    assert.equal(hit?.fix.id, "MMSA-2024-00350")
    assert.ok((hit?.score ?? 0) >= 0.8)
    assert.equal(
      matchKnown({ title: "Prometheus metrics endpoint is exposed without authentication" }, index),
      null
    )
    assert.equal(matchKnown({ title: "" }, index), null)
  })
})
