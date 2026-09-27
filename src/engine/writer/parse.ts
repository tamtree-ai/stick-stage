/** A model reply, as it came back: bare JSON, a fenced block, or the outermost object or array. */

const FENCE = /```(?:json)?\s*([\s\S]*?)```/g;

export const parseLoose = (raw: string): unknown => {
  const text = raw.trim();
  const candidates = [text];
  for (const match of text.matchAll(FENCE)) candidates.push(match[1]!.trim());
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  const arrStart = text.indexOf("[");
  const arrEnd = text.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) candidates.push(text.slice(arrStart, arrEnd + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try the next shape */
    }
  }
  throw new Error("not json");
};
