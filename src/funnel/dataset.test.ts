import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseProgram, readDump, repositoryOf } from "./dataset.ts"

describe("program dump", () => {
  it("reads a repository from an in-scope entry, whichever form it takes", () => {
    assert.deepEqual(repositoryOf("https://github.com/mattermost/mattermost-plugin-playbooks"), {
      host: "github.com",
      owner: "mattermost",
      repo: "mattermost-plugin-playbooks",
      url: "https://github.com/mattermost/mattermost-plugin-playbooks",
    })
    assert.equal(repositoryOf("https://github.com/Aiven-Open")?.repo, "*")
    assert.equal(repositoryOf("gitlab.com/group/project.git")?.repo, "project")
    assert.equal(repositoryOf("https://github.com/owner/issues"), null)
    assert.equal(repositoryOf("https://mattermost.com/download/"), null)
  })

  it("keeps programs with source in scope and reads each platform's fields", () => {
    const bugcrowd = parseProgram("bugcrowd", {
      name: "Mattermost",
      url: "https://bugcrowd.com/engagements/mattermost",
      max_payout: "2000",
      targets: {
        in_scope: [
          { target: "https://bugcrowd-*.cloud.mattermost.com/", type: "other" },
          { target: "github.com/mattermost/mattermost-plugin-playbooks", type: "other" },
        ],
      },
    })
    assert.deepEqual(bugcrowd, {
      platform: "bugcrowd",
      name: "Mattermost",
      url: "https://bugcrowd.com/engagements/mattermost",
      maxPayoutUsd: 2000,
      paysBounties: true,
      scopeSize: 2,
      repositories: [
        {
          host: "github.com",
          owner: "mattermost",
          repo: "mattermost-plugin-playbooks",
          url: "https://github.com/mattermost/mattermost-plugin-playbooks",
        },
      ],
    })
    const hackerone = parseProgram("hackerone", {
      handle: "omarchy",
      url: "https://hackerone.com/omarchy",
      offers_bounties: "True",
      targets: {
        in_scope: [
          { asset_identifier: "https://github.com/omacom/omarchy", asset_type: "SOURCE_CODE" },
        ],
      },
    })
    assert.equal(hackerone?.name, "omarchy")
    assert.equal(hackerone?.paysBounties, true)
    assert.equal(hackerone?.maxPayoutUsd, undefined)
    const intigriti = parseProgram("intigriti", {
      name: "X",
      url: "https://app.intigriti.com/x",
      max_bounty: 500,
      targets: { in_scope: [{ endpoint: "https://github.com/x/y", type: "source_code" }] },
    })
    assert.equal(intigriti?.maxPayoutUsd, 500)
    assert.equal(
      parseProgram("yeswehack", {
        name: "URL only",
        url: "https://yeswehack.com/x",
        targets: { in_scope: [{ target: "https://x.com", type: "url" }] },
      }),
      null
    )
  })

  it("reads a dump and refuses one that is not a list", () => {
    const programs = readDump(
      "bugcrowd",
      JSON.stringify([
        { name: "A", url: "https://a", targets: { in_scope: [{ target: "github.com/a/b" }] } },
        { name: "B", url: "https://b" },
      ])
    )
    assert.equal(programs.length, 1)
    assert.throws(() => readDump("bugcrowd", "{}"), /bugcrowd dump is not a list/)
    assert.throws(() => readDump("bugcrowd", "not json"), /bugcrowd dump is not JSON/)
  })
})
