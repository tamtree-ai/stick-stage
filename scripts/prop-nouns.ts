/**
 * Counts nouns in skit files, eval reports, and t-shoot copy, then maps them
 * through prop aliases. pnpm props:nouns writes planning/2026-09-28-props/prop-ranking.md
 * and reprints the table. The ideas and hooks tables are not in this checkout.
 */
import fs from "node:fs";
import path from "node:path";
import { catalog } from "../src/data";
import { normWord } from "../src/engine/voice/words";

const repo = path.resolve(import.meta.dirname, "..");
const root = path.resolve(repo, "..");
const outFile = path.join(root, "planning/2026-09-28-props/prop-ranking.md");

const walk = (dir: string, ext: RegExp): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
        const abs = path.join(dir, ent.name);
        if (ent.isDirectory()) return ent.name === "node_modules" || ent.name === ".git" ? [] : walk(abs, ext);
        return ext.test(ent.name) ? [abs] : [];
      })
    : [];

const files = [
  ...walk(path.join(repo, "public/skits"), /\.json$/),
  ...walk(path.join(repo, "eval-reports"), /\.json$/),
  ...walk(path.join(root, "tamshoot/eval-reports"), /\.json$/),
];

const TEXT_KEYS = new Set(["topic", "description", "line", "text", "logline", "pov", "slam", "card", "hook"]);
const spoken: string[] = [];
const takeText = (value: unknown, key?: string) => {
  if (typeof value === "string") {
    if (!key || TEXT_KEYS.has(key)) spoken.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child) => takeText(child, key));
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) takeText(child, childKey);
  }
};
for (const file of files) {
  if (file.endsWith(`${path.sep}voice.json`)) continue;
  const raw = fs.readFileSync(file, "utf8");
  if (!file.endsWith(".json")) {
    spoken.push(raw);
    continue;
  }
  try {
    takeText(JSON.parse(raw));
  } catch {
    spoken.push(raw);
  }
}
const blob = spoken.join("\n").toLowerCase();
const counts = new Map<string, number>();
for (const raw of blob.split(/[^\p{L}\p{N}]+/u)) {
  const word = normWord(raw);
  if (word.length < 3) continue;
  counts.set(word, (counts.get(word) ?? 0) + 1);
}

const forms = (term: string): string[] => {
  const folded = term.toLowerCase();
  const parts = folded.split(" ");
  const last = parts[parts.length - 1] ?? folded;
  let singular = last;
  if (last.endsWith("ies") && last.length > 4) singular = last.slice(0, -3) + "y";
  else if (last.endsWith("s") && !last.endsWith("ss") && last.length > 3) singular = last.slice(0, -1);
  parts[parts.length - 1] = singular;
  const sing = parts.join(" ");
  return sing === folded ? [folded] : [folded, sing];
};

// These aliases are ordinary words in the skit files (the verb "can", a JSON "file").
// Counting them ranks the prop on text that is not about the object.
const SKIP_ALIAS = new Set(["can", "file", "key", "notes", "map", "bag", "mat", "rod", "plug"]);
const phraseHits = (phrase: string): number => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return blob.match(new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "gu"))?.length ?? 0;
};
const hits = new Map<string, number>();
for (const prop of catalog.propInfo) {
  const terms = new Set<string>();
  const add = (term: string, alias: boolean) => {
    const folded = term.toLowerCase().trim();
    if (!folded || (alias && (folded.length < 4 || SKIP_ALIAS.has(folded)))) return;
    terms.add(folded);
    if (folded.includes("-")) terms.add(folded.replace(/-/g, " "));
  };
  add(prop.id, false);
  add(prop.name, false);
  for (const alias of prop.aliases) add(alias, true);
  let n = 0;
  for (const term of terms) n += phraseHits(term);
  hits.set(prop.id, n);
}

const ranked = [...catalog.propInfo].sort((a, b) => (hits.get(b.id) ?? 0) - (hits.get(a.id) ?? 0) || a.rank - b.rank || a.id.localeCompare(b.id));
const bottle = ranked.findIndex((p) => p.id === "water-bottle");
const glass = ranked.findIndex((p) => p.id === "water-glass");
let waterNote = "water-bottle already outranks water-glass, so the shared alias water stays on the bottle.";
if (bottle >= 0 && glass >= 0 && glass < bottle) {
  const [kept] = ranked.splice(bottle, 1);
  ranked.splice(glass, 0, kept!);
  waterNote = "water-glass had more hits. water-bottle is placed just ahead of it so the shared alias water still resolves to the bottle.";
}
const rankOf = new Map(ranked.map((p, i) => [p.id, i + 1]));
const claimed = new Set<string>();
for (const prop of catalog.propInfo) {
  claimed.add(prop.id);
  for (const alias of prop.aliases) for (const form of forms(alias)) claimed.add(form.replace(/\s+/g, ""));
}

const jsonKeys = new Set<string>();
const collectKeys = (value: unknown) => {
  if (Array.isArray(value)) value.forEach(collectKeys);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      jsonKeys.add(key.toLowerCase());
      collectKeys(child);
    }
  }
};
for (const file of files.filter((f) => f.endsWith(".json"))) {
  try {
    collectKeys(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    // A report that is not JSON still contributes words above.
  }
}
const RESERVE_SKIP = new Set(["the", "and", "you", "that", "this", "from", "with", "have", "what", "your", "they", "them", "then", "than", "just", "like", "into", "about", "there", "their", "would", "could", "should", "when", "where", "which", "while", "been", "were", "was", "are", "for", "not", "but", "all", "one", "yes", "true", "null", "none", "milo", "june", "lila", "theo", "moss", "dash", "reed", "nell", "pip"]);
const reserve = [...counts.entries()]
  .filter(([word, n]) => n >= 10 && word.length >= 4 && !claimed.has(word) && !jsonKeys.has(word) && !RESERVE_SKIP.has(word))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40);

const propDir = path.join(repo, "src/data/props");
const jsonFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) return jsonFiles(abs);
    return ent.name.endsWith(".json") ? [abs] : [];
  });
let rewritten = 0;
for (const file of jsonFiles(propDir)) {
  const raw = fs.readFileSync(file, "utf8");
  const id = raw.match(/"id":\s*"([^"]+)"/)?.[1];
  const next = id ? rankOf.get(id) : undefined;
  if (next == null || !/"rank":\s*\d+/.test(raw)) continue;
  const updated = raw.replace(/"rank":\s*\d+/, `"rank": ${next}`);
  if (updated === raw) continue;
  fs.writeFileSync(file, updated);
  rewritten++;
}

const lines = [
  "# Prop ranking",
  "",
  `Counted words in brief topics, premises, and spoken lines across ${files.length} JSON files. Voice timing files are skipped. The ideas and hooks tables are not in this checkout, so they are not in the count. Rank is 1 for the most hits. Aliases shorter than four letters, and can, file, key, notes, map, bag, mat, rod, and plug, are not counted. ${waterNote}${rewritten ? ` ${rewritten} prop files had their rank rewritten.` : ""}`,
  "",
  "| rank | id | hits | category |",
  "|---|---|---|---|",
  ...ranked.map((p, i) => `| ${i + 1} | ${p.id} | ${hits.get(p.id) ?? 0} | ${p.category} |`),
  "",
  "## Nouns with ten or more hits and no prop",
  "",
  reserve.length ? reserve.map(([word, n]) => `- ${word} (${n})`).join("\n") : "None.",
  "",
];
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join("\n"));
console.log(lines.join("\n"));
