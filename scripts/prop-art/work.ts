import { C, E, P, R, prop, type Art } from "./types";

const metal = "#c5c8d0";
const dark = "#3a3d4d";
const wood = "#c47a3a";
const paper = "#f7f4ee";
const blue = "#3a6ea5";

export const KITCHEN: Art[] = [
  prop("frying-pan", "kitchen", "Frying pan", 62, ["cook", "kitchen"], ["pan", "skillet"], "forearm", dark, wood, [
    E(0.02, -0.1, 0.05, 0.028, "body"),
    R(-0.008, -0.05, 0.016, 0.07, "accent", { rx: 0.006 }),
  ], 1.15),
  prop("spatula", "kitchen", "Spatula", 64, ["cook", "kitchen"], ["turner"], "forearm", metal, redSoft(), [
    R(-0.028, -0.14, 0.056, 0.04, "body", { rx: 0.006 }),
    R(-0.006, -0.1, 0.012, 0.11, "accent"),
  ], 1.25),
  prop("whisk", "kitchen", "Whisk", 66, ["cook", "kitchen"], ["whisks"], "forearm", metal, dark, [
    P([[-0.02, -0.14], [0.02, -0.14], [0.004, -0.04], [-0.004, -0.04]], "body"),
    R(-0.006, -0.04, 0.012, 0.06, "accent"),
    R(-0.016, -0.12, 0.004, 0.07, "body-dark", { stroke: false }),
  ], 1.3),
  prop("rolling-pin", "kitchen", "Rolling pin", 68, ["bake", "kitchen"], ["roller"], "forearm", wood, cream(), [
    R(-0.03, -0.12, 0.06, 0.08, "body", { rx: 0.02 }),
    C(-0.04, -0.08, 0.012, "accent"),
    C(0.04, -0.08, 0.012, "accent"),
  ], 1.1),
  prop("fork", "kitchen", "Fork", 21, ["eat", "kitchen"], ["forks"], "forearm", metal, metal, [
    R(-0.016, -0.14, 0.004, 0.05, "body"),
    R(-0.004, -0.145, 0.004, 0.05, "body"),
    R(0.008, -0.14, 0.004, 0.05, "body"),
    R(-0.008, -0.09, 0.016, 0.1, "body"),
  ], 1.35),
  prop("spoon", "kitchen", "Spoon", 23, ["eat", "kitchen"], ["spoons"], "forearm", metal, metal, [
    E(0, -0.12, 0.02, 0.028, "body"),
    R(-0.006, -0.09, 0.012, 0.1, "body"),
  ], 1.35),
  prop("plate", "kitchen", "Plate", 72, ["eat", "kitchen"], ["dish", "plates"], "upright", paper, blue, [
    E(0, -0.04, 0.06, 0.02, "body"),
    E(0, -0.04, 0.036, 0.01, "accent", { stroke: false }),
  ], 1.1),
  prop("oven-mitt", "kitchen", "Oven mitt", 74, ["cook", "kitchen"], ["mitt", "oven glove"], "upright", "#e0463c", gold(), [
    R(-0.03, -0.12, 0.06, 0.1, "body", { rx: 0.02 }),
    R(-0.03, -0.04, 0.06, 0.02, "accent"),
  ], 1.15),
];

export const OFFICE: Art[] = [
  prop("pen", "office", "Pen", 9, ["write", "school", "work"], ["pens", "biro"], "forearm", blue, dark, [
    R(-0.006, -0.16, 0.012, 0.14, "body", { rx: 0.004 }),
    P([[-0.006, -0.02], [0.006, -0.02], [0, 0.02]], "accent"),
    R(-0.006, -0.16, 0.012, 0.02, "accent"),
  ], 1.4),
  prop("pencil", "office", "Pencil", 17, ["write", "school"], ["pencils"], "forearm", gold(), pink(), [
    R(-0.006, -0.16, 0.012, 0.13, "body"),
    P([[-0.006, -0.03], [0.006, -0.03], [0, 0.02]], "accent"),
    R(-0.006, -0.16, 0.012, 0.018, "body-dark"),
  ], 1.4),
  prop("notebook", "office", "Notebook", 12, ["write", "school", "work"], ["notepad", "journal"], "upright", paper, blue, [
    R(-0.04, -0.12, 0.08, 0.1, "body", { rx: 0.004 }),
    R(-0.04, -0.12, 0.01, 0.1, "accent"),
    R(-0.02, -0.09, 0.04, 0.004, "body-dark", { stroke: false }),
  ], 1.15),
  prop("clipboard", "office", "Clipboard", 76, ["work", "office"], ["clip board"], "upright", wood, metal, [
    R(-0.04, -0.14, 0.08, 0.12, "body", { rx: 0.006 }),
    R(-0.016, -0.155, 0.032, 0.02, "accent", { rx: 0.004 }),
    R(-0.028, -0.1, 0.056, 0.05, "accent-light", { stroke: false }),
  ], 1.1),
  prop("folder", "office", "Folder", 78, ["work", "office"], ["file", "folders"], "upright", "#f2c14e", paper, [
    P([[-0.05, -0.08], [-0.02, -0.11], [0.05, -0.11], [0.05, 0.02], [-0.05, 0.02]], "body"),
    R(-0.04, -0.06, 0.08, 0.04, "accent", { stroke: false }),
  ], 1.1),
  prop("book", "office", "Book", 10, ["read", "school"], ["books"], "upright", "#7a3e2e", gold(), [
    R(-0.04, -0.13, 0.08, 0.12, "body", { rx: 0.004 }),
    R(-0.04, -0.13, 0.012, 0.12, "accent"),
    R(-0.02, -0.08, 0.04, 0.03, "accent-light", { stroke: false }),
  ], 1.15),
  prop("stapler", "office", "Stapler", 80, ["work", "office"], ["staplers"], "upright", dark, metal, [
    R(-0.04, -0.06, 0.09, 0.03, "body", { rx: 0.008 }),
    R(-0.03, -0.08, 0.07, 0.02, "accent", { rx: 0.004 }),
  ], 1.2),
  prop("calculator", "office", "Calculator", 82, ["school", "math"], ["calc"], "upright", dark, "#7ec8e3", [
    R(-0.03, -0.12, 0.06, 0.1, "body", { rx: 0.006 }),
    R(-0.022, -0.11, 0.044, 0.028, "accent"),
    R(-0.02, -0.07, 0.012, 0.012, "body-light", { stroke: false }),
    R(0.004, -0.07, 0.012, 0.012, "body-light", { stroke: false }),
  ], 1.15),
  prop("ruler", "office", "Ruler", 84, ["school", "measure"], ["rulers"], "forearm", gold(), dark, [
    R(-0.012, -0.18, 0.024, 0.18, "body"),
    R(-0.012, -0.15, 0.01, 0.004, "accent", { stroke: false }),
    R(-0.012, -0.1, 0.01, 0.004, "accent", { stroke: false }),
    R(-0.012, -0.05, 0.01, 0.004, "accent", { stroke: false }),
  ], 1.2),
  prop("envelope", "office", "Envelope", 86, ["mail", "letter"], ["letter", "mail"], "upright", paper, blue, [
    R(-0.05, -0.08, 0.1, 0.06, "body"),
    P([[-0.05, -0.08], [0, -0.04], [0.05, -0.08]], "accent", { stroke: false }),
  ], 1.15),
  prop("id-badge", "office", "ID badge", 88, ["work", "office"], ["badge", "name tag", "id"], "upright", paper, blue, [
    R(-0.028, -0.1, 0.056, 0.08, "body", { rx: 0.006 }),
    C(0, -0.08, 0.012, "accent"),
    R(-0.018, -0.055, 0.036, 0.006, "body-dark", { stroke: false }),
    R(-0.008, -0.12, 0.016, 0.016, "accent"),
  ], 1.2),
  prop("pill-bottle", "office", "Pill bottle", 90, ["health", "medicine"], ["pills", "medicine"], "upright", cream(), "#e0463c", [
    R(-0.018, -0.14, 0.036, 0.02, "accent", { rx: 0.004 }),
    R(-0.022, -0.12, 0.044, 0.1, "body", { rx: 0.01 }),
    R(-0.016, -0.08, 0.032, 0.03, "accent", { stroke: false }),
  ], 1.15),
];

export const TECH: Art[] = [
  prop("tablet", "tech", "Tablet", 13, ["screen", "device"], ["tablets"], "upright", dark, "#bfe3f5", [
    R(-0.04, -0.12, 0.08, 0.1, "body", { rx: 0.008 }),
    R(-0.032, -0.11, 0.064, 0.08, "accent"),
  ], 1.15),
  prop("headphones", "tech", "Headphones", 15, ["audio", "music"], ["headset", "earphones"], "upright", dark, metal, [
    P([[-0.05, -0.06], [-0.03, -0.06], [-0.03, -0.12], [0.03, -0.12], [0.03, -0.06], [0.05, -0.06], [0.05, -0.13], [-0.05, -0.13]], "body"),
    R(-0.055, -0.07, 0.02, 0.04, "accent", { rx: 0.006 }),
    R(0.035, -0.07, 0.02, 0.04, "accent", { rx: 0.006 }),
  ], 1.15),
  prop("tv-remote", "tech", "TV remote", 25, ["tv", "home"], ["remote", "clicker"], "forearm", dark, redSoft(), [
    R(-0.016, -0.16, 0.032, 0.16, "body", { rx: 0.01 }),
    C(0, -0.12, 0.008, "accent"),
    R(-0.008, -0.08, 0.016, 0.03, "body-light", { stroke: false }),
  ], 1.25),
  prop("game-controller", "tech", "Controller", 27, ["game", "play"], ["controller", "gamepad", "joystick"], "upright", dark, "#7ec8e3", [
    R(-0.06, -0.07, 0.12, 0.04, "body", { rx: 0.016 }),
    C(-0.03, -0.05, 0.012, "accent"),
    C(0.03, -0.05, 0.01, "body-light"),
  ], 1.15),
  prop("camera", "tech", "Camera", 29, ["photo"], ["photos"], "upright", dark, metal, [
    R(-0.04, -0.08, 0.08, 0.05, "body", { rx: 0.006 }),
    C(0.01, -0.055, 0.016, "accent"),
    R(-0.01, -0.1, 0.03, 0.02, "body-dark"),
  ], 1.15),
  prop("selfie-stick", "tech", "Selfie stick", 92, ["photo", "phone"], ["selfie"], "forearm", dark, metal, [
    R(-0.006, -0.22, 0.012, 0.2, "body"),
    R(-0.02, -0.24, 0.04, 0.02, "accent", { rx: 0.004 }),
  ], 1.1),
  prop("charger", "tech", "Charger", 94, ["cable", "phone"], ["charger cable", "plug"], "forearm", paper, dark, [
    R(-0.02, -0.06, 0.04, 0.04, "body", { rx: 0.004 }),
    R(-0.004, -0.14, 0.008, 0.08, "accent"),
    R(-0.012, -0.15, 0.024, 0.012, "body"),
  ], 1.2),
  prop("computer-mouse", "tech", "Mouse", 31, ["computer", "work"], ["mouse"], "upright", dark, metal, [
    P([[-0.025, -0.02], [0.025, -0.02], [0.02, -0.08], [0, -0.1], [-0.02, -0.08]], "body"),
    R(-0.002, -0.09, 0.004, 0.04, "accent", { stroke: false }),
  ], 1.3),
  prop("power-bank", "tech", "Power bank", 96, ["battery", "phone"], ["battery", "powerbank"], "upright", dark, "#7ed957", [
    R(-0.02, -0.1, 0.05, 0.08, "body", { rx: 0.008 }),
    R(0.02, -0.06, 0.012, 0.02, "accent"),
    C(-0.006, -0.04, 0.004, "accent", { stroke: false }),
  ], 1.15),
  prop("thermometer", "tech", "Thermometer", 98, ["health", "temperature"], ["thermo"], "forearm", paper, redSoft(), [
    R(-0.008, -0.16, 0.016, 0.14, "body", { rx: 0.006 }),
    C(0, 0.0, 0.016, "accent"),
    R(-0.003, -0.12, 0.006, 0.1, "accent", { stroke: false }),
  ], 1.3),
];

function redSoft() {
  return "#e0463c";
}
function gold() {
  return "#f4c542";
}
function cream() {
  return "#fff6e8";
}
function pink() {
  return "#f2a7c3";
}
