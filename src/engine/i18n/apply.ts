import type { SkitDoc } from "../director/schema";

const CJK = /^(ja|zh|ko|yue|th)\b/i;

/** BCP 47 language, or `en` when the skit doesn't name one. */
export const languageOf = (doc: Pick<SkitDoc, "meta">): string => doc.meta.language ?? "en";

export const isCjk = (language: string): boolean => CJK.test(language);

export const isRtl = (language: string): boolean => /^(ar|he|fa|ur)\b/i.test(language);

type I18nPack = NonNullable<SkitDoc["i18n"]>[string];

const packFor = (doc: SkitDoc, lang: string): I18nPack | undefined => doc.i18n?.[lang] ?? doc.i18n?.[lang.split("-")[0] ?? lang];

/**
 * A dub of the same staging. Lines, slams, POV, cards and labels come from `skit.i18n[lang]`;
 * actions and the camera stay. Missing keys keep the original words.
 */
export const applyLanguage = (doc: SkitDoc, lang: string | undefined): SkitDoc => {
  if (!lang || lang === "en" || lang === doc.meta.language) {
    return doc.meta.language ? doc : { ...doc, meta: { ...doc.meta, language: lang ?? doc.meta.language ?? "en" } };
  }
  const pack = packFor(doc, lang);
  const next: SkitDoc = { ...doc, meta: { ...doc.meta, language: lang } };
  if (!pack) return next;
  const line = (id: string, text: string | undefined) => (text && pack.lines[id] ? pack.lines[id] : text);
  const beats = (list: SkitDoc["beats"]) =>
    list?.map((b) => ({
      ...b,
      ...(b.line ? { line: line(b.id, b.line) } : {}),
      text: b.text.map((t) => (t.type === "slam" && pack.slams?.[b.id] ? { ...t, value: pack.slams[b.id]!.slice(0, 40) } : t)),
    }));
  const labelPack = pack.labels;
  function relabel<T extends { labels?: { part: string; text?: string; screen?: string }[] }>(node: T): T {
    if (!node.labels || !labelPack) return node;
    return {
      ...node,
      labels: node.labels.map((l) => {
        const text = labelPack[l.part];
        if (!text) return l;
        const value = text.slice(0, 80);
        return { ...l, ...(l.text !== undefined ? { text: value } : {}), ...(l.screen !== undefined ? { screen: value } : {}) };
      }),
    };
  }
  if (next.labels) Object.assign(next, relabel(next));
  if (next.beats) next.beats = beats(next.beats);
  if (next.scenes)
    next.scenes = next.scenes.map((sc) => ({
      ...relabel(sc),
      ...(pack.pov && sc.pov ? { pov: pack.pov } : {}),
      ...(sc.card && pack.cards?.[sc.id] ? { card: { ...sc.card, title: pack.cards[sc.id]!.slice(0, 60) } } : {}),
      beats: beats(sc.beats)!,
    }));
  if (pack.pov && next.overlay.pov) next.overlay = { ...next.overlay, pov: pack.pov };
  return next;
};
