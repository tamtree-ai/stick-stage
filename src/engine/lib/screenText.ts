import { z } from "zod";

/** Words on a sign, a board, or a screen. `\n` breaks a screen or a board. A sign is one line. */
export const SCREEN_LINES = 3;
export const SCREEN_LINE = 24;

export const screenLines = (text: string): string[] => text.split("\n");

const fits = (value: string): boolean => {
  const lines = screenLines(value);
  return lines.length <= SCREEN_LINES && lines.every((line) => line.trim().length >= 1 && line.length <= SCREEN_LINE);
};

const screenMessage = `up to ${SCREEN_LINES} lines, each 1–${SCREEN_LINE} characters (break lines with \\n)`;

/** Laptop, desk, TV, or chalkboard copy. */
export const ScreenTextSchema = z.string().min(1).refine(fits, { message: screenMessage });

/** One line on a held sign. */
export const SignTextSchema = z.string().min(1).max(SCREEN_LINE).refine((value) => !value.includes("\n"), { message: "a sign is one line" });
