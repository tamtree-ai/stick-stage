import { C, E, P, R, prop, type Art } from "./types";

const blue = "#3aa0d8";
const red = "#e0463c";
const gold = "#f4c542";
const cream = "#fff6e8";
const green = "#2f6b4f";
const brown = "#6b3a22";

export const DRINKS: Art[] = [
  prop("water-bottle", "drinks", "Water bottle", 4, ["drink", "water"], ["bottle", "water"], "upright", blue, "#d7eef8", [
    R(-0.016, -0.2, 0.032, 0.028, "accent", { rx: 0.006 }),
    R(-0.02, -0.17, 0.04, 0.15, "body", { rx: 0.01 }),
    R(-0.014, -0.1, 0.028, 0.04, "accent", { stroke: false }),
  ], 1.15),
  prop("water-glass", "drinks", "Water glass", 19, ["drink", "water"], ["glass", "water"], "upright", "#d5e7f2", blue, [
    P([[-0.028, -0.12], [0.028, -0.12], [0.02, 0.02], [-0.02, 0.02]], "body"),
    R(-0.02, -0.08, 0.04, 0.04, "accent", { stroke: false }),
  ], 1.2),
  prop("takeaway-coffee", "drinks", "Takeaway coffee", 6, ["drink", "coffee", "morning"], ["latte", "takeaway", "coffee cup"], "upright", cream, brown, [
    P([[-0.03, -0.12], [0.03, -0.12], [0.022, 0.02], [-0.022, 0.02]], "body"),
    E(0, -0.125, 0.032, 0.01, "accent"),
    R(-0.012, -0.16, 0.024, 0.03, "accent-dark"),
  ], 1.2),
  prop("soda-can", "drinks", "Soda can", 20, ["drink", "can"], ["can", "soda", "soft drink"], "upright", red, gold, [
    R(-0.02, -0.14, 0.04, 0.13, "body", { rx: 0.012 }),
    R(-0.02, -0.09, 0.04, 0.03, "accent"),
    E(0, -0.145, 0.02, 0.008, "body-light"),
  ], 1.15),
  prop("juice-box", "drinks", "Juice box", 50, ["drink", "kids"], ["juice", "juicebox"], "upright", "#f2a24a", green, [
    R(-0.028, -0.12, 0.056, 0.1, "body", { rx: 0.004 }),
    R(-0.02, -0.1, 0.04, 0.04, "accent", { stroke: false }),
    R(0.01, -0.15, 0.006, 0.04, "body-dark", { angle: 18 }),
  ], 1.2),
  prop("milkshake", "drinks", "Milkshake", 52, ["drink", "sweet"], ["shake", "milk shake"], "upright", pinkFill(), cream, [
    P([[-0.026, -0.08], [0.026, -0.08], [0.016, 0.02], [-0.016, 0.02]], "accent"),
    C(0, -0.11, 0.03, "body"),
    R(-0.004, -0.18, 0.008, 0.06, "body-dark"),
  ], 1.2),
  prop("bubble-tea", "drinks", "Bubble tea", 54, ["drink", "tea"], ["boba", "bubbletea"], "upright", "#f3c1d8", brown, [
    P([[-0.026, -0.13], [0.026, -0.13], [0.018, 0.02], [-0.018, 0.02]], "body"),
    C(-0.01, 0.004, 0.006, "accent", { stroke: false }),
    C(0.008, 0.0, 0.006, "accent", { stroke: false }),
    R(0.008, -0.2, 0.008, 0.08, "body-dark", { angle: 12 }),
  ], 1.15),
  prop("energy-drink", "drinks", "Energy drink", 56, ["drink", "can"], ["energy"], "upright", "#7ed957", "#1b1b1f", [
    R(-0.018, -0.16, 0.036, 0.15, "body", { rx: 0.01 }),
    R(-0.018, -0.1, 0.036, 0.028, "accent"),
    P([[-0.008, -0.09], [0.008, -0.09], [0, -0.07]], "accent-light", { stroke: false }),
  ], 1.15),
  prop("baby-bottle", "drinks", "Baby bottle", 58, ["baby", "milk"], ["bottle baby"], "upright", "#f7f4ee", "#7ec8e3", [
    R(-0.014, -0.16, 0.028, 0.02, "accent", { rx: 0.008 }),
    R(-0.02, -0.14, 0.04, 0.12, "body", { rx: 0.012 }),
    R(-0.012, -0.1, 0.024, 0.03, "accent", { stroke: false }),
  ], 1.15),
  prop("thermos", "drinks", "Thermos", 60, ["drink", "hot"], ["vacuum flask"], "upright", "#c0392b", "#f4f1ea", [
    R(-0.016, -0.2, 0.032, 0.03, "accent", { rx: 0.008 }),
    R(-0.024, -0.17, 0.048, 0.16, "body", { rx: 0.014 }),
    R(-0.024, -0.1, 0.048, 0.02, "accent"),
  ], 1.1),
];

function pinkFill() {
  return "#f2a7c3";
}
