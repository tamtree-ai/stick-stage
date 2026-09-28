import type { PartLabel, SetPart } from "./schema";

/** Paint the last matching label onto a part. Parts with no label are unchanged. */
export const applyPartLabels = (part: SetPart, labels: readonly PartLabel[] | undefined): SetPart => {
  const hit = labels ? [...labels].reverse().find((label) => label.part === part.part) : undefined;
  if (!hit) return part;
  return { ...part, ...(hit.text !== undefined ? { text: hit.text } : {}), ...(hit.screen !== undefined ? { screen: hit.screen } : {}) };
};
