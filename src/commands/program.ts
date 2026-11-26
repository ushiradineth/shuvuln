import { loadPrograms } from "../program/policy.ts"

/** Lists every program file and whether it is valid and approved. Exit 1 when one is not. */
export async function checkPrograms(json: boolean): Promise<number> {
  const loaded = await loadPrograms("programs")
  if (json) {
    console.log(
      JSON.stringify(
        loaded.map((entry) =>
          entry.ok
            ? {
                program: entry.program,
                file: entry.file,
                approved_by: entry.policy.approved_by,
                approved_on: entry.policy.approved_on,
                live_testing: entry.policy.live_testing,
                targets: entry.policy.targets.length,
              }
            : entry
        ),
        null,
        2
      )
    )
  } else if (loaded.length === 0) {
    console.log("no program files under programs/")
  } else {
    for (const entry of loaded) {
      if (!entry.ok) {
        console.log(`${entry.program}: invalid`)
        for (const problem of entry.problems) console.log(`  - ${problem}`)
        continue
      }
      const { policy } = entry
      console.log(
        `${entry.program}: approved by ${policy.approved_by} on ${policy.approved_on}; live testing ${policy.live_testing}; ${policy.targets.length} targets; ${policy.ineligible.length} ineligible; ${policy.known_issues.length} known issues`
      )
    }
  }
  return loaded.length > 0 && loaded.every((entry) => entry.ok) ? 0 : 1
}
