import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parsePosted } from "./mattermost.ts"

describe("event stream posts", () => {
  const post = JSON.stringify({
    user_id: "bot",
    channel_id: "c1",
    props: { type: "custom_mstmeetings", meeting_link: "https://x" },
  })

  it("reads posts from the posted event and from ephemeral posts, which arrive as their own event", () => {
    assert.deepEqual(parsePosted({ event: "posted", data: { post } }), {
      user_id: "bot",
      channel_id: "c1",
      props: { type: "custom_mstmeetings", meeting_link: "https://x" },
    })
    assert.equal(parsePosted({ event: "ephemeral_message", data: { post } })?.user_id, "bot")
  })

  it("ignores other events, malformed posts and missing fields", () => {
    assert.equal(parsePosted({ event: "status_change", data: { post } }), null)
    assert.equal(parsePosted({ event: "posted", data: { post: "{" } }), null)
    assert.equal(parsePosted({ event: "posted", data: {} }), null)
    assert.deepEqual(
      parsePosted({ event: "posted", data: { post: JSON.stringify({ props: null }) } }),
      { user_id: "", channel_id: "", props: {} }
    )
  })
})
