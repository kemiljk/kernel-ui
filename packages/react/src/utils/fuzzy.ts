/**
 * A small ranked fuzzy matcher for filtering lists as someone types
 * (Combobox, CommandPalette). The query's characters have to appear in the
 * text in order, not necessarily together ("nwfl" finds "New file"), and
 * the matches are scored so the most plausible results rise to the top:
 *
 * - a match at the very start of the text scores highest;
 * - a match at the start of a word (after a space, `-`, `_`, `.`, `/`, or a
 *   lowercase→uppercase step in camelCase) scores high;
 * - each character continuing a run of consecutive matches scores extra;
 * - every skipped character between two matches costs a little, and
 *   skipped characters before the first match cost less;
 * - a text that starts with the whole query, or equals it, gets a bonus.
 *
 * Case and diacritics are ignored on both sides (`normalize("NFD")` with
 * combining marks dropped), so "creme" finds "Crème brûlée". Whitespace in
 * the query is ignored. The best-scoring alignment is found by dynamic
 * programming, not greedily, so "fb" in "foo bar" highlights the "b" of
 * "bar" rather than any earlier "b".
 *
 * `ranges` are `[start, end)` offsets into the *original* text, ready to
 * wrap in `<mark>` — see `fuzzySegments`.
 */
export interface FuzzyMatch {
  /** Higher is better. Only meaningful relative to other scores. */
  score: number;
  /** Matched character spans as `[start, end)` offsets into the original text. */
  ranges: Array<[number, number]>;
}

const SCORE_MATCH = 1;
const BONUS_PREFIX = 8;
const BONUS_WORD_START = 6;
const BONUS_CONSECUTIVE = 4;
const PENALTY_GAP = 0.5;
const PENALTY_LEADING = 0.1;
const BONUS_STARTS_WITH = 10;
const BONUS_EXACT = 20;

interface NormalizedChar {
  char: string;
  /** Offset of the source character in the original string. */
  start: number;
  end: number;
  wordStart: boolean;
}

const COMBINING = /[̀-ͯ]/g;
const SEPARATOR = /[\s\-_./\\:,()[\]]/;

function foldChar(value: string): string {
  return value.normalize("NFD").replace(COMBINING, "").toLowerCase();
}

function normalizeText(text: string): NormalizedChar[] {
  const out: NormalizedChar[] = [];
  let offset = 0;
  let previous = "";
  for (const source of text) {
    const folded = foldChar(source);
    const wordStart =
      offset === 0 ||
      SEPARATOR.test(previous) ||
      (previous !== "" && previous === previous.toLowerCase() && previous !== previous.toUpperCase() &&
        source !== source.toLowerCase());
    let first = true;
    for (const char of folded) {
      out.push({ char, start: offset, end: offset + source.length, wordStart: wordStart && first });
      first = false;
    }
    previous = source;
    offset += source.length;
  }
  return out;
}

/** Normalizes a query the same way texts are: case, diacritics and
 * whitespace dropped. */
export function normalizeFuzzyQuery(query: string): string {
  return foldChar(query).replace(/\s+/g, "");
}

/** Scores `text` against `query`; `null` when the query's characters don't
 * all appear in order. An empty query matches everything with score 0. */
export function fuzzyScore(query: string, text: string): FuzzyMatch | null {
  const q = normalizeFuzzyQuery(query);
  if (q === "") return { score: 0, ranges: [] };
  const t = normalizeText(text);
  const m = q.length;
  const n = t.length;
  if (m > n) return null;

  // best[i][j]: best score with q[i] matched at t[j]; -Infinity if impossible.
  const best: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(n).fill(-Infinity);
    const back = new Int32Array(n).fill(-1);
    // Running max over k < j - 1 of best[i-1][k] + PENALTY_GAP * k, so the
    // gap cost (j - k - 1) * PENALTY_GAP is applied in O(1) per cell.
    let runMax = -Infinity;
    let runArg = -1;
    for (let j = 0; j < n; j++) {
      if (i > 0 && j >= 2) {
        const k = j - 2;
        const candidate = best[i - 1]![k]! + PENALTY_GAP * k;
        if (candidate > runMax) {
          runMax = candidate;
          runArg = k;
        }
      }
      const cell = t[j]!;
      if (cell.char !== q[i]) continue;
      let charScore = SCORE_MATCH;
      if (j === 0) charScore += BONUS_PREFIX;
      else if (cell.wordStart) charScore += BONUS_WORD_START;

      if (i === 0) {
        row[j] = charScore - PENALTY_LEADING * j;
        continue;
      }
      let prevBest = -Infinity;
      let prevArg = -1;
      const adjacent = j > 0 ? best[i - 1]![j - 1]! : -Infinity;
      if (adjacent > -Infinity) {
        prevBest = adjacent + BONUS_CONSECUTIVE;
        prevArg = j - 1;
      }
      if (runArg >= 0) {
        const gapped = runMax - PENALTY_GAP * (j - 1);
        if (gapped > prevBest) {
          prevBest = gapped;
          prevArg = runArg;
        }
      }
      if (prevArg < 0) continue;
      row[j] = prevBest + charScore;
      back[j] = prevArg;
    }
    best.push(row);
    from.push(back);
  }

  let endJ = -1;
  let score = -Infinity;
  const last = best[m - 1]!;
  for (let j = 0; j < n; j++) {
    if (last[j]! > score) {
      score = last[j]!;
      endJ = j;
    }
  }
  if (endJ < 0) return null;

  const folded = t.map((cell) => cell.char).join("");
  if (folded === q) score += BONUS_EXACT;
  else if (folded.startsWith(q)) score += BONUS_STARTS_WITH;

  const matched: number[] = [];
  for (let i = m - 1, j = endJ; i >= 0; i--) {
    matched.push(j);
    j = from[i]![j]!;
  }
  matched.reverse();

  const ranges: Array<[number, number]> = [];
  for (const index of matched) {
    const { start, end } = t[index]!;
    const previous = ranges[ranges.length - 1];
    if (previous && previous[1] >= start) previous[1] = Math.max(previous[1], end);
    else ranges.push([start, end]);
  }
  return { score, ranges };
}

export interface FuzzyResult<T> extends FuzzyMatch {
  item: T;
  /** The item's position in the input list. */
  index: number;
  /** Which of the item's texts matched best (0 for the first, e.g. a label,
   * then any keywords). `ranges` index into that text. */
  field: number;
}

/**
 * Filters and ranks `items` by `query`: matches only, best first, ties
 * broken by shorter text and then by original order (so equally good
 * results keep the order they were given in). `getText` returns one string
 * or several (a label plus keywords); the best one counts. An empty query
 * returns every item, unranked.
 */
export function fuzzyFilter<T>(
  items: readonly T[],
  query: string,
  getText: (item: T) => string | readonly string[],
): Array<FuzzyResult<T>> {
  const results: Array<FuzzyResult<T> & { length: number }> = [];
  items.forEach((item, index) => {
    const raw = getText(item);
    const texts = typeof raw === "string" ? [raw] : raw;
    let bestMatch: (FuzzyMatch & { field: number; length: number }) | null = null;
    texts.forEach((text, field) => {
      const match = fuzzyScore(query, text);
      if (match && (!bestMatch || match.score > bestMatch.score)) {
        bestMatch = { ...match, field, length: text.length };
      }
    });
    if (bestMatch) results.push({ item, index, ...(bestMatch as FuzzyMatch & { field: number; length: number }) });
  });
  if (normalizeFuzzyQuery(query) !== "") {
    results.sort((a, b) => b.score - a.score || a.length - b.length || a.index - b.index);
  }
  return results.map(({ length: _length, ...result }) => result);
}

/** Splits `text` into plain and matched segments for rendering, e.g. as
 * `<mark>` around each matched span. */
export function fuzzySegments(
  text: string,
  ranges: ReadonlyArray<readonly [number, number]>,
): Array<{ text: string; match: boolean }> {
  const segments: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
