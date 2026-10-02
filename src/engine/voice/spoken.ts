/**
 * Captions and the voice can differ: the caption shows "ħ = h / 2π", the voice says "h-bar
 * equals h over two pi". Word timings come from the spoken words; this maps them back onto the
 * caption's tokens so highlighting and word anchors follow the caption.
 */
import type { WordTiming } from "./schema";
import { normWord, tokenize } from "./words";

/** How symbols are usually read aloud, so "π" in the caption can meet "pi" in the voice. */
export const SYMBOL_READINGS: Readonly<Record<string, readonly string[]>> = {
  "π": ["pi"],
  "ħ": ["hbar", "h-bar", "bar"],
  "=": ["equals", "is"],
  "≈": ["approximately", "about", "roughly"],
  "≠": ["not"],
  "×": ["times"],
  "÷": ["over", "divided"],
  "/": ["over", "per"],
  "+": ["plus"],
  "−": ["minus"],
  "-": ["minus"],
  "²": ["squared"],
  "³": ["cubed"],
  "√": ["root"],
  "∞": ["infinity"],
  "∑": ["sum"],
  "∫": ["integral"],
  "Δ": ["delta", "change"],
  "λ": ["lambda"],
  "μ": ["mu", "micro"],
  "ν": ["nu"],
  "ω": ["omega"],
  "θ": ["theta"],
  "α": ["alpha"],
  "β": ["beta"],
  "γ": ["gamma"],
  "ψ": ["psi"],
  "φ": ["phi"],
  "σ": ["sigma"],
  "%": ["percent"],
};

/** Does caption token `c` plausibly correspond to spoken word `s`? */
const matches = (c: string, s: string): boolean => {
  const cn = normWord(c);
  const sn = normWord(s);
  if (cn && cn === sn) return true;
  // A caption token is matched by its digits ("9.8" ↔ "nine"…) only loosely: its symbols or leading letter.
  for (const ch of [...c]) if (SYMBOL_READINGS[ch]?.includes(sn)) return true;
  return !!cn && !!sn && cn.length > 1 && (cn.startsWith(sn) || sn.startsWith(cn)) && Math.min(cn.length, sn.length) >= 3;
};

/**
 * Spoken word timings → caption tokens. Pairs are found by a longest common subsequence; a run of
 * caption tokens with no partner shares the time between its matched neighbours.
 */
export const mapSpokenToCaption = (caption: string, spoken: readonly WordTiming[], durationMs: number): WordTiming[] => {
  const cap = tokenize(caption).map((t) => t.text);
  const n = cap.length;
  const m = spoken.length;
  if (!n) return [];
  if (!m) return cap.map((text, i) => ({ text, startMs: Math.round((i * durationMs) / n), endMs: Math.round(((i + 1) * durationMs) / n) }));
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i]![j] = matches(cap[i]!, spoken[j]!.text) ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const pair: (number | undefined)[] = new Array(n).fill(undefined);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (matches(cap[i]!, spoken[j]!.text) && L[i]![j] === L[i + 1]![j + 1]! + 1) pair[i++] = j++;
    else if (L[i + 1]![j]! >= L[i]![j + 1]!) i++;
    else j++;
  }
  const out: WordTiming[] = [];
  let i = 0;
  while (i < n) {
    const j = pair[i];
    if (j !== undefined) {
      // A matched token runs until the next matched spoken word (so a token absorbs the words read for its symbols).
      let k = i + 1;
      while (k < n && pair[k] === undefined) k++;
      const nextSpoken = k < n ? pair[k]! : m;
      const end = k === i + 1 && nextSpoken > j + 1 ? spoken[nextSpoken - 1]!.endMs : spoken[j]!.endMs;
      out.push({ text: cap[i]!, startMs: spoken[j]!.startMs, endMs: end });
      i++;
      continue;
    }
    // Unmatched run [i, k): spread over the gap between neighbours' spoken words.
    let k = i;
    while (k < n && pair[k] === undefined) k++;
    const prevJ = i > 0 ? pair[i - 1] : undefined;
    const from = prevJ !== undefined ? spoken[Math.min(m - 1, prevJ + 1)]!.startMs : i === 0 ? spoken[0]!.startMs : out[out.length - 1]!.endMs;
    const to = k < n ? spoken[pair[k]!]!.startMs : spoken[m - 1]!.endMs;
    const lo = Math.min(from, to);
    const hi = Math.max(lo, to);
    for (let q = i; q < k; q++) out.push({ text: cap[q]!, startMs: Math.round(lo + ((hi - lo) * (q - i)) / (k - i)), endMs: Math.round(lo + ((hi - lo) * (q - i + 1)) / (k - i)) });
    i = k;
  }
  for (let q = 0; q < out.length - 1; q++) out[q]!.endMs = Math.max(out[q]!.startMs, Math.min(out[q]!.endMs, out[q + 1]!.startMs));
  return out;
};
