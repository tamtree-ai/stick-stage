import { cameraAt, shotAt } from "../director/camera";
import { stageActorsAt, xAt } from "../director/placement";
import type { Timeline } from "../director/timeline";
import { contrastRatio } from "../lib/color";
import type { Library } from "../rig/actorState";
import { getPalette } from "../set/palettes";
import type { SetDef } from "../set/schema";
import { faceRect } from "../shots/framing";
import { pageAt } from "../text/captions";
import { cardLayout, inside, LIST, listLayout, overlaps, povRect, slamRect, SLAM, SUBTITLE, subtitleRect } from "../text/layout";
import { safeRect, type Rect, type SafeArea } from "../text/safeArea";
import type { Finding } from "./types";

/** Visual QA on sampled frames: faces in the safe area, overlays not covering faces, contrast. */

export const VISUAL_CHECKS = ["faces-safe", "overlay-collision", "overlay-fit", "contrast"];

const FACE = ["medium", "close", "extreme"];

const onScreen = (r: Rect, width: number, height: number) => r.x + r.w > 0 && r.x < width && r.y + r.h > 0 && r.y < height;

/** Frames worth looking at: shortly after every cut, mid-shot, every punch-in peak, slams and caption pages. */
export const sampleFrames = (tl: Timeline): number[] => {
  const fs = new Set<number>();
  tl.shots.forEach((s, i) => {
    const end = tl.shots[i + 1]?.frame ?? tl.durationInFrames;
    fs.add(Math.min(end - 1, s.frame + 2));
    fs.add(Math.floor((s.frame + end) / 2));
  });
  for (const p of tl.punchIns) fs.add(p.frame + p.durationFrames + 1);
  for (const s of tl.slams) fs.add(s.from + 1);
  for (const l of tl.lists) for (const f of l.at) fs.add(f + 1);
  if (tl.card) fs.add(tl.card.at[tl.card.at.length - 1]! + 1);
  for (const p of tl.pages) fs.add(Math.round(((p.startMs + p.endMs) / 2000) * tl.fps));
  return [...fs].filter((f) => f >= 0 && f < tl.durationInFrames).sort((a, b) => a - b);
};

type Ctx = { tl: Timeline; lib: Library; set: SetDef; safeArea: SafeArea };

export const visualChecks = ({ tl, lib, set, safeArea }: Ctx): Finding[] => {
  const out: Finding[] = [];
  const { width: W, height: H, fps } = tl;
  const safe = safeRect(safeArea, W, H);
  const tol = 0.02 * W;
  const seen = new Set<string>();
  const once = (key: string, f: Finding) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };
  const at = (f: number) => `${(f / fps).toFixed(2)}s`;

  for (const frame of sampleFrames(tl)) {
    const cam = cameraAt(tl, frame);
    const shot = shotAt(tl, frame);
    const faces = stageActorsAt(lib, tl.cast, set, frame, fps, W)
      .map((a) => ({ id: a.id, rect: faceRect(a, cam, W, H, set.groundY) }))
      .filter((f) => onScreen(f.rect, W, H));
    // Entrances and exits cross the frame edge on purpose.
    const inTransit = (id: string) =>
      tl.cast.find((c) => c.id === id)!.moveKeys.some((k) => frame >= k.frame && frame < k.frame + k.durationFrames && (k.x < 0 || k.x > 1 || xAt(tl.cast.find((c) => c.id === id)!, k.frame) < 0 || xAt(tl.cast.find((c) => c.id === id)!, k.frame) > 1));
    for (const f of faces) {
      if (inside(f.rect, safe, tol) || inTransit(f.id)) continue;
      // In a face framing or a punch-in only the subject matters; the other face is usually cut off.
      const punch = tl.punchIns.find((p) => p.frame <= frame && p.frame >= shot.frame);
      const focus = FACE.includes(shot.framing) ? shot.on : punch?.on;
      if (focus !== undefined && focus !== f.id) continue;
      const subject = focus === f.id;
      once(`safe-${shot.frame}-${f.id}`, { check: "faces-safe", level: subject ? "error" : "warning", frame, message: `${f.id}'s face leaves the safe area in the ${shot.framing} shot at ${at(frame)}` });
    }
    const ms = (frame / fps) * 1000;
    const page = pageAt(tl.pages, ms);
    const slamUp = tl.slams.some((s) => frame >= s.from - 4 && frame < s.to);
    if (page && !slamUp) {
      const { rect, lines } = subtitleRect(page.text, W, H, safeArea);
      for (const f of faces)
        if (overlaps(rect, f.rect))
          once(`sub-${shot.frame}-${f.id}`, { check: "overlay-collision", level: "warning", frame, message: `subtitle "${page.text.trim()}" covers ${f.id}'s face at ${at(frame)}` });
      if (lines > 2) once(`sublines-${page.startMs}`, { check: "overlay-fit", level: "warning", frame, message: `subtitle page "${page.text.trim()}" wraps to ${lines} lines` });
    }
    if (tl.pov && frame >= tl.pov.from && frame < tl.pov.to && !FACE.includes(shot.framing)) {
      const { rect } = povRect(tl.pov.text, W, H, safeArea);
      for (const f of faces)
        if (overlaps(rect, f.rect)) once(`pov-${shot.frame}-${f.id}`, { check: "overlay-collision", level: "warning", frame, message: `POV card covers ${f.id}'s face at ${at(frame)}` });
    }
    for (const s of tl.slams) {
      if (frame < s.from || frame >= s.to) continue;
      const { rect, lines } = slamRect(s.text, W, H, safeArea);
      for (const f of faces)
        if (overlaps(rect, f.rect)) once(`slam-${s.from}-${f.id}`, { check: "overlay-collision", level: "warning", frame, message: `slam "${s.text}" covers ${f.id}'s face at ${at(frame)}` });
      if (lines > 2 || !inside(rect, safe, tol)) once(`slamfit-${s.from}`, { check: "overlay-fit", level: "warning", frame, message: `slam "${s.text}" doesn't fit in two lines even at the smallest size; shorten it` });
    }
  }
  out.push(...explainerChecks(tl, safeArea, frameFaces(tl, lib, set)));
  if (tl.pov) {
    const { lines } = povRect(tl.pov.text, W, H, safeArea);
    if (lines > 2) out.push({ check: "overlay-fit", level: "warning", message: `POV card wraps to ${lines} lines; shorten it` });
  }
  out.push(...contrastChecks(tl, lib, set));
  return out;
};

type Faces = (frame: number) => { id: string; rect: Rect }[];

const frameFaces = (tl: Timeline, lib: Library, set: SetDef): Faces => (frame) => {
  const cam = cameraAt(tl, frame);
  return stageActorsAt(lib, tl.cast, set, frame, tl.fps, tl.width)
    .map((a) => ({ id: a.id, rect: faceRect(a, cam, tl.width, tl.height, set.groundY) }))
    .filter((f) => onScreen(f.rect, tl.width, tl.height));
};

/** Cards and lists fit their band, every list item shows before the list leaves, and they don't cover faces. */
export const explainerChecks = (tl: Timeline, safeArea: SafeArea, faces: Faces): Finding[] => {
  const out: Finding[] = [];
  const { width: W, height: H } = tl;
  const at = (f: number) => `${(f / tl.fps).toFixed(2)}s`;
  for (const l of tl.lists) {
    const layout = listLayout(l.items, W, H, safeArea);
    if (!layout.fits) out.push({ check: "overlay-fit", level: "warning", frame: l.at[0], message: `list doesn't fit above the subtitles even at ${LIST.minFontSize} px; shorten the items or use fewer` });
    const late = l.items.filter((_, i) => l.at[i]! >= l.to);
    if (late.length) out.push({ check: "overlay-fit", level: "warning", frame: l.to, message: `the list leaves at the cut at ${at(l.to)} before ${late.map((x) => `"${x}"`).join(", ")} appear${late.length === 1 ? "s" : ""}` });
    const last = Math.min(l.to - 1, l.at[l.at.length - 1]! + 1);
    const hit = faces(last).filter((f) => layout.rects.some((r, i) => l.at[i]! <= last && overlaps(r, f.rect)));
    for (const f of hit) out.push({ check: "overlay-collision", level: "warning", frame: last, message: `list covers ${f.id}'s face at ${at(last)}` });
  }
  if (tl.card) {
    const c = tl.card;
    const layout = cardLayout(c.lines.join("\n"), c.kicker, W, H, safeArea);
    if (!layout.fits) out.push({ check: "overlay-fit", level: "warning", frame: c.at[0], message: `card title "${c.lines.join(" ")}" doesn't fit in ${layout.lines.length} line(s) above the subtitles; shorten it` });
    const f0 = c.at[c.at.length - 1]! + 1;
    const hit = f0 < c.to ? faces(f0).filter((f) => overlaps(layout.rect, f.rect)) : [];
    for (const f of hit) out.push({ check: "overlay-collision", level: "warning", frame: f0, message: `card covers ${f.id}'s face at ${at(f0)}` });
  }
  return out;
};

/** Text reads over anything (fill vs outline), and characters out-contrast the set (plan §4.4). */
export const contrastChecks = (tl: Timeline, lib: Library, set: SetDef): Finding[] => {
  const out: Finding[] = [];
  for (const [name, fill, outline] of [
    ["subtitle", SUBTITLE.fill, SUBTITLE.outline],
    ["subtitle highlight", SUBTITLE.highlight, SUBTITLE.outline],
    ["slam", SLAM.fill, SLAM.outline],
  ] as const) {
    const r = contrastRatio(fill, outline);
    if (r < 4.5) out.push({ check: "contrast", level: "error", message: `${name} fill vs outline contrast ${r.toFixed(1)}:1 (min 4.5)` });
  }
  const palette = getPalette(set.palette);
  const tones = [palette.wallA, palette.wallB, palette.floor, palette.sky, palette.shade];
  for (const id of new Set(tl.cast.map((c) => c.character))) {
    const stroke = lib.characters[id]!.style.stroke;
    const worst = Math.min(...tones.map((t) => contrastRatio(stroke, t)));
    if (worst < 3) out.push({ check: "contrast", level: "warning", message: `${id}'s outline is only ${worst.toFixed(1)}:1 against set "${set.id}" (characters should pop)` });
  }
  return out;
};
