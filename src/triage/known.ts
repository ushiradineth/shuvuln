/** A fix the vendor has published, with the text that describes it. */
export interface KnownFix {
  id: string
  text: string
  /** Day the fix was released, as YYYY-MM-DD, when the vendor states it. */
  date?: string
}

export interface KnownMatch {
  fix: KnownFix
  /** Shared keywords over the smaller keyword set, from 0 to 1. */
  score: number
}

export interface IndexedFix {
  fix: KnownFix
  words: Set<string>
}

const STOP_WORDS = new Set(
  `also with that this from into their without through using other issue fixed mattermost when
  where then them they which would could should able allows allow allowing attacker attackers
  authenticated`.split(/\s+/)
)

const MIN_SCORE = 0.5
const MIN_WORDS = 5

/** Mattermost's advisory feed: a JSON list of issues with an id, a description and a fix date. */
export function parseAdvisoryFeed(raw: unknown): KnownFix[] {
  if (!Array.isArray(raw)) return []
  const fixes: KnownFix[] = []
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    const id =
      String(record.issue_id ?? "")
        .split(",")[0]
        ?.trim() ?? ""
    const text = String(record.details ?? "")
      .replace(/\s+/g, " ")
      .trim()
    const date = String(record.fix_release_date ?? "").slice(0, 10)
    if (id && text) fixes.push({ id, text, ...(DATE.test(date) ? { date } : {}) })
  }
  return fixes
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Words of four or more letters, singularised, without words that carry no topic. */
export function keywords(text: string): Set<string> {
  const words = new Set<string>()
  for (const word of text.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) ?? []) {
    const singular = word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word
    if (!STOP_WORDS.has(singular)) words.add(singular)
  }
  return words
}

export function indexKnown(known: KnownFix[]): IndexedFix[] {
  return known.map((fix) => ({ fix, words: keywords(fix.text) }))
}

/**
 * The published fix that already covers a finding, when one is close enough to be the same bug.
 * Scored on the title alone: a summary adds enough words to drown the overlap.
 */
export function matchKnown(finding: { title: string }, index: IndexedFix[]): KnownMatch | null {
  const words = keywords(finding.title)
  let best: KnownMatch | null = null
  for (const entry of index) {
    const [small, large] =
      words.size <= entry.words.size ? [words, entry.words] : [entry.words, words]
    if (small.size === 0) continue
    let shared = 0
    for (const word of small) if (large.has(word)) shared++
    const score = shared / small.size
    if (shared >= MIN_WORDS && score >= MIN_SCORE && (best === null || score > best.score)) {
      best = { fix: entry.fix, score }
    }
  }
  return best
}
