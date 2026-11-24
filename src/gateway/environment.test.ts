import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { gatewayEnvironment } from "./environment.ts"

describe("gatewayEnvironment", () => {
  it("keeps only operating-system locations and Pi's own directory", () => {
    const env = gatewayEnvironment(
      {
        PATH: "/bin",
        HOME: "/home/shu",
        TMPDIR: "/tmp",
        OPENAI_API_KEY: "sk-secret",
        ZAI_API_KEY: "plan-secret",
        PI_PROVIDER: "zai",
        PI_MODEL: "glm-5.4",
        SHUVULN_HOME: "/elsewhere",
      },
      "/agents/pi"
    )
    assert.equal(env.PATH, "/bin")
    assert.equal(env.HOME, "/home/shu")
    assert.equal(env.OPENAI_API_KEY, undefined)
    assert.equal(env.ZAI_API_KEY, undefined)
    assert.equal(env.PI_PROVIDER, undefined)
    assert.equal(env.PI_MODEL, undefined)
    assert.equal(env.SHUVULN_HOME, undefined)
    assert.equal(env.PI_CODING_AGENT_DIR, "/agents/pi")
    assert.equal(env.PI_SKIP_VERSION_CHECK, "1")
    assert.equal(env.PI_TELEMETRY, "0")
  })

  it("sets the agent directory even when the source has none", () => {
    const env = gatewayEnvironment({ PATH: "/bin" }, "/agents/pi")
    assert.equal(env.PI_CODING_AGENT_DIR, "/agents/pi")
    assert.equal(env.HOME, undefined)
  })
})
