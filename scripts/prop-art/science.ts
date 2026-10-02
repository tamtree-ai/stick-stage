import { C, D, P, R, prop, type Art } from "./types";

const metal = "#c5c8d0";
const dark = "#3a3d4d";
const glass = "#d8eef5";
const red = "#d9483b";
const blue = "#3a6ea5";
const wood = "#c47a3a";
const white = "#f7f4ee";

/** Science channel, phase 1: the misconception dialog's maths props first. */
export const MATHS: Art[] = [
  prop("dice", "maths", "Die", 10, ["probability", "random", "game"], ["die", "dice cube"], "upright", white, dark, [
    R(-0.035, -0.08, 0.07, 0.07, "body", { rx: 0.012 }),
    C(-0.016, -0.062, 0.006, "accent", { stroke: false }),
    C(0, -0.045, 0.006, "accent", { stroke: false }),
    C(0.016, -0.028, 0.006, "accent", { stroke: false }),
  ], 1.6),
  prop("coin", "maths", "Coin", 11, ["probability", "money", "heads", "tails"], ["coins", "penny"], "upright", "#e3b341", "#b8862b", [
    C(0, -0.05, 0.04, "body"),
    C(0, -0.05, 0.028, "accent", { stroke: false, opacity: 0.6 }),
    R(-0.004, -0.066, 0.008, 0.032, "body-light", { stroke: false }),
  ], 1.6),
  prop("ball", "maths", "Ball (light)", 12, ["falling", "gravity", "physics", "demo"], ["light ball", "tennis ball", "small ball"], "upright", "#e8f06a", white, [
    C(0, -0.045, 0.034, "body"),
    D("M -0.03 -0.06 Q 0 -0.04 0.03 -0.06", "none", { stroke: true }),
  ], 1.7),
  prop("heavy-ball", "maths", "Ball (heavy)", 13, ["falling", "gravity", "physics", "demo", "mass"], ["bowling ball", "iron ball", "cannonball", "heavy"], "upright", "#2e3140", "#6b6f80", [
    C(0, -0.05, 0.045, "body"),
    C(-0.014, -0.066, 0.006, "accent", { stroke: false }),
    C(0.004, -0.07, 0.006, "accent", { stroke: false }),
    C(-0.002, -0.054, 0.006, "accent", { stroke: false }),
  ], 1.8),
  prop("chalk", "maths", "Chalk", 14, ["board", "write", "teach"], ["chalk stick"], "forearm", white, "#e9e2d0", [R(-0.008, -0.1, 0.016, 0.07, "body", { rx: 0.004 }), R(-0.008, -0.1, 0.016, 0.014, "accent", { stroke: false })], 1.5),
  prop("pointer-stick", "maths", "Pointer stick", 15, ["teach", "board", "point"], ["pointer", "teacher's pointer"], "forearm", wood, dark, [R(-0.005, -0.34, 0.01, 0.34, "body"), R(-0.005, -0.34, 0.01, 0.025, "accent")], 1.1),
  prop("protractor", "maths", "Protractor", 16, ["angle", "geometry"], ["angle measure"], "upright", "#bfe3ef", dark, [
    D("M -0.07 -0.02 C -0.07 -0.113 0.07 -0.113 0.07 -0.02 Z", "body", { opacity: 0.85 }),
    D("M -0.045 -0.02 C -0.045 -0.08 0.045 -0.08 0.045 -0.02", "none"),
    R(-0.002, -0.07, 0.004, 0.02, "accent", { stroke: false }),
  ], 1.1),
];

export const SCIENCE: Art[] = [
  prop("magnifying-glass", "science", "Magnifying glass", 20, ["look", "zoom", "detail", "investigate"], ["magnifier", "loupe"], "forearm", dark, glass, [
    C(0, -0.14, 0.05, "body"),
    C(0, -0.14, 0.038, "accent", { stroke: false }),
    R(-0.008, -0.09, 0.016, 0.1, "body", { rx: 0.005 }),
  ], 1.1),
  prop("bar-magnet", "science", "Bar magnet", 21, ["magnet", "field", "poles"], ["magnet"], "upright", red, blue, [R(-0.03, -0.14, 0.06, 0.06, "body"), R(-0.03, -0.08, 0.06, 0.06, "accent")], 1.1),
  prop("horseshoe-magnet", "science", "Horseshoe magnet", 22, ["magnet", "field", "poles"], ["u magnet"], "upright", red, metal, [
    D("M -0.05 -0.03 L -0.05 -0.1 C -0.05 -0.167 0.05 -0.167 0.05 -0.1 L 0.05 -0.03 L 0.025 -0.03 L 0.025 -0.1 C 0.025 -0.133 -0.025 -0.133 -0.025 -0.1 L -0.025 -0.03 Z", "body"),
    R(-0.05, -0.04, 0.025, 0.02, "accent"),
    R(0.025, -0.04, 0.025, 0.02, "accent"),
  ], 1.1),
  prop("battery", "science", "Battery", 23, ["circuit", "voltage", "power"], ["cell", "aa battery"], "upright", "#2f343f", "#e3b341", [
    R(-0.022, -0.12, 0.044, 0.1, "body", { rx: 0.006 }),
    R(-0.022, -0.12, 0.044, 0.035, "accent"),
    R(-0.008, -0.13, 0.016, 0.01, "body-light"),
  ], 1.1),
  prop("light-bulb", "science", "Light bulb", 24, ["idea", "circuit", "light"], ["bulb", "lightbulb"], "upright", "#fff1a8", metal, [
    C(0, -0.11, 0.04, "body"),
    R(-0.018, -0.075, 0.036, 0.03, "accent"),
    D("M -0.012 -0.1 L -0.004 -0.12 L 0.004 -0.1 L 0.012 -0.12", "none"),
  ], 1.1),
  prop("prism", "science", "Prism", 25, ["light", "rainbow", "optics"], ["glass prism"], "upright", glass, "#a6d8ea", [P([[0, -0.13], [0.055, -0.03], [-0.055, -0.03]], "body", { opacity: 0.9 }), P([[0, -0.11], [0.03, -0.045], [-0.01, -0.045]], "accent", { stroke: false })], 1.1),
  prop("beaker", "science", "Beaker", 26, ["lab", "chemistry", "liquid"], ["glass beaker"], "upright", glass, "#7ed0c3", [
    R(-0.035, -0.12, 0.07, 0.1, "body", { rx: 0.006 }),
    R(-0.035, -0.07, 0.07, 0.05, "accent", { stroke: false }),
    R(-0.035, -0.12, 0.07, 0.008, "body-dark", { stroke: false }),
  ], 1.1),
  prop("flask", "science", "Flask", 27, ["lab", "chemistry", "liquid"], ["conical flask", "erlenmeyer"], "upright", glass, "#f08c7a", [
    P([[-0.012, -0.14], [0.012, -0.14], [0.012, -0.09], [0.045, -0.02], [-0.045, -0.02], [-0.012, -0.09]], "body"),
    P([[-0.03, -0.05], [0.03, -0.05], [0.045, -0.02], [-0.045, -0.02]], "accent", { stroke: false }),
  ], 1.1),
  prop("laser-pointer", "science", "Laser pointer", 28, ["light", "point", "laser"], ["laser"], "forearm", dark, red, [R(-0.008, -0.14, 0.016, 0.12, "body", { rx: 0.005 }), C(0, -0.14, 0.007, "accent", { stroke: false })], 1.2),
  prop("telescope", "science", "Telescope", 29, ["astronomy", "stars", "look"], ["spyglass"], "forearm", blue, metal, [
    R(-0.022, -0.2, 0.044, 0.08, "body", { rx: 0.006 }),
    R(-0.016, -0.12, 0.032, 0.08, "accent", { rx: 0.004 }),
    R(-0.01, -0.04, 0.02, 0.05, "body-dark", { rx: 0.003 }),
  ], 1.1),
  prop("test-tube", "science", "Test tube", 30, ["lab", "chemistry", "sample"], ["tube", "vial"], "upright", glass, "#9ad17a", [
    R(-0.012, -0.13, 0.024, 0.11, "body", { rx: 0.012 }),
    R(-0.012, -0.07, 0.024, 0.05, "accent", { rx: 0.012, stroke: false }),
  ], 1.2),
];
