import { runPi } from "../gateway/run.ts"

const PING_PROMPT = "Reply with exactly the word pong and nothing else."

/** One tiny model call through shuvuln's own Pi. Exits 0 only for a clean, correct answer. */
export async function ping(model: string, agentDir: string, json = false): Promise<number> {
  try {
    const run = await runPi({ model, agentDir, prompt: PING_PROMPT })
    if (json) {
      console.log(JSON.stringify({ model, ...run }, null, 2))
    } else {
      console.log(`model:  ${model}`)
      console.log(`text:   ${JSON.stringify(run.text)}`)
      console.log(
        `usage:  ${run.usage.input} in, ${run.usage.output} out, ${run.usage.cacheRead} cached, $${run.usage.cost.total}`
      )
      console.log(`retry:  ${run.retries}`)
    }
    if (run.error) {
      console.error(`error:  ${run.error}`)
      return 1
    }
    if (run.text.trim().toLowerCase() !== "pong") {
      console.error("error:  the model did not answer with the expected word")
      return 1
    }
    return 0
  } catch (error) {
    console.error(`error:  ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
}
