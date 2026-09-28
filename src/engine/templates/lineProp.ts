import type { CatalogProp } from "../catalog";
import { didYouMean } from "../director/diagnostics";
import type { Action } from "../director/schema";

/** A line prop that means put the object away. */
export const PROP_NONE = "none";

/** Poses that swing both hands through the body. A held prop uses `point` instead. */
const TWO_HANDED = new Set(["hands-on-hips", "shrug", "arms-crossed"]);

/** One-hand stand-in so a cup stays out of the head. */
export const gestureWhileHolding = (pose: string, holding: boolean): string => (holding && TWO_HANDED.has(pose) ? "point" : pose);

const singularWord = (word: string): string => {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && word.length > 4 && !word.endsWith("ss")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
};

/** Case-fold, and a singular form of the last word (`chips` → `chip`). */
export const propForms = (raw: string): string[] => {
  const folded = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const parts = folded.split(" ");
  const last = parts[parts.length - 1] ?? folded;
  parts[parts.length - 1] = singularWord(last);
  const singular = parts.join(" ");
  return singular === folded ? [folded] : [folded, singular];
};

export type ResolvedProp = { id: string } | { drop: string };

/**
 * An exact id, then an exact alias (case-folded, and the singular form).
 * A shared alias takes the prop with the lower rank. `"none"` puts it away.
 */
export const resolveProp = (raw: string, props: readonly CatalogProp[]): ResolvedProp => {
  const folded = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (folded === PROP_NONE) return { id: PROP_NONE };
  const exact = props.find((p) => p.id.toLowerCase() === folded);
  if (exact) return { id: exact.id };
  const forms = new Set(propForms(raw));
  const aliasHits = props.filter((p) => p.aliases.some((a) => forms.has(a.toLowerCase())));
  if (aliasHits.length) {
    aliasHits.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
    return { id: aliasHits[0]!.id };
  }
  const singularId = props.find((p) => forms.has(p.id.toLowerCase()));
  if (singularId) return { id: singularId.id };
  return { drop: raw.trim() };
};

/** Warning for a prop the stage cannot show. Closest ids come from the did-you-mean helper. */
export const propMiss = (got: string, props: readonly CatalogProp[]): string => {
  const ids = props.map((p) => p.id);
  const first = didYouMean(got, ids);
  const second = first ? didYouMean(got, ids.filter((id) => id !== first)) : undefined;
  const closest = [first, second].filter((id): id is string => !!id);
  return `prop: "${got}" is not one StickStage has${closest.length ? `; closest: ${closest.join(", ")}` : ""}`;
};

export type HoldBook = {
  /** The prop in the hand this line may use. */
  held: Map<string, string>;
  /** Right hand is busy for the whole scene (interview mic, or a cast `holding`). */
  rightTaken: ReadonlySet<string>;
  /** What they walked in holding. It stays in the right hand. */
  sceneLong: ReadonlyMap<string, string>;
};

export const lineHand = (who: string, rightTaken: ReadonlySet<string>): "L" | "R" => (rightTaken.has(who) ? "L" : "R");

/**
 * The hold or put-away for one line, and the book updated to match.
 * A gag's own hold is added later, so it wins on that beat.
 */
export const linePropActions = (who: string, prop: string | undefined, book: HoldBook): Action[] => {
  if (!prop) return [];
  const hand = lineHand(who, book.rightTaken);
  if (prop === PROP_NONE) {
    if (!book.held.has(who)) return [];
    book.held.delete(who);
    return [{ who, do: "putAway", hand, at: { ms: 0 } }];
  }
  if (book.held.get(who) === prop) return [];
  if (!book.held.has(who) && book.sceneLong.get(who) === prop) {
    book.held.set(who, prop);
    return [];
  }
  book.held.set(who, prop);
  return [{ who, do: "hold", prop, hand, at: { ms: 0 } }];
};

/** True when this person is still showing an object after the line. */
export const stillHolding = (who: string, book: HoldBook): boolean => book.held.has(who) || book.sceneLong.has(who);
