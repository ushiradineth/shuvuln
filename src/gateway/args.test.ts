import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ISOLATION_FLAGS, isThinkingLevel, modelRef, piArgs } from "./args.ts"

const FORBIDDEN = ["--tools", "-t", "--skill", "--extension", "-e", "--approve", "-a", "-c", "-r"]

describe("piArgs", () => {
  it("adds every isolation flag to each call", () => {
    const requests = [
      { model: "zai/glm-5.4" },
      { model: "openai/gpt-6.2", thinking: "high" as const, systemPrompt: "You review source." },
    ]
    for (const request of requests) {
      const args = piArgs(request)
      for (const flag of ISOLATION_FLAGS) assert.ok(args.includes(flag), `${flag} missing`)
      assert.equal(args[args.indexOf("--mode") + 1], "json")
    }
  })

  it("never enables tools, resources, sessions or project files", () => {
    const args = piArgs({ model: "zai/glm-5.4", systemPrompt: "@/etc/passwd --tools bash" })
    for (const arg of args) {
      assert.ok(!FORBIDDEN.includes(arg), `${arg} would widen the call`)
    }
    assert.deepEqual(
      args.filter((arg) => arg.startsWith("@")),
      ["@/etc/passwd --tools bash"]
    )
  })

  it("passes thinking and the system prompt only when set", () => {
    assert.deepEqual(piArgs({ model: "zai/glm-5.4" }).slice(0, 2), ["--model", "zai/glm-5.4"])
    const full = piArgs({ model: "zai/glm-5.4", thinking: "low", systemPrompt: "Be brief." })
    assert.deepEqual(full.slice(0, 6), [
      "--model",
      "zai/glm-5.4",
      "--thinking",
      "low",
      "--system-prompt",
      "Be brief.",
    ])
  })

  it("rejects anything that is not a plain provider/model reference", () => {
    assert.deepEqual(modelRef("zai/glm-5.4"), { provider: "zai", id: "glm-5.4" })
    for (const bad of [
      "glm-5.4",
      "zai/glm/5.4",
      "/glm-5.4",
      "zai/",
      "zai/glm 5.4",
      "zai/glm:high",
      "--model",
      "zai/-x",
    ]) {
      assert.throws(() => modelRef(bad), Error, bad)
      assert.throws(() => piArgs({ model: bad }), Error, bad)
    }
  })

  it("recognises thinking levels", () => {
    assert.ok(isThinkingLevel("xhigh"))
    assert.ok(!isThinkingLevel("ultra"))
  })
})
