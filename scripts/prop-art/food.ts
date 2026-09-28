import { C, D, E, P, R, prop, type Art } from "./types";

const red = "#e0463c";
const gold = "#f4c542";
const bun = "#e6b15a";
const brown = "#8a4b24";
const cream = "#fff3dc";
const green = "#3d8c4a";
const pink = "#f2a7c3";

/** Food. Fries uses the plan's geometry so its bounds can be checked by hand. */
export const FOOD: Art[] = [
  prop("fries", "food", "Fries", 3, ["snack", "fast food", "takeaway", "lunch"], ["chips", "hot chips", "french fries", "fry"], "upright", red, gold, [
    R(-0.012, -0.075, 0.008, 0.05, "accent", { angle: -8 }),
    R(0, -0.082, 0.008, 0.055, "accent"),
    R(0.012, -0.074, 0.008, 0.048, "accent", { angle: 9 }),
    P([[-0.03, -0.04], [0.03, -0.04], [0.022, 0.03], [-0.022, 0.03]], "body"),
  ], 1.35),
  prop("burger", "food", "Burger", 7, ["snack", "fast food", "lunch"], ["hamburger", "cheeseburger"], "upright", bun, red, [
    E(0, -0.09, 0.042, 0.016, "body"),
    R(-0.038, -0.078, 0.076, 0.012, "accent"),
    R(-0.04, -0.066, 0.08, 0.016, "body-dark"),
    E(0, -0.042, 0.046, 0.018, "body"),
  ], 1.2),
  prop("pizza-slice", "food", "Pizza slice", 11, ["snack", "fast food", "dinner"], ["pizza", "slice"], "upright", gold, red, [
    P([[0, -0.15], [0.07, 0.02], [-0.02, 0.02]], "body"),
    C(0.02, -0.04, 0.012, "accent"),
    C(0.028, -0.08, 0.01, "accent"),
    C(0.01, -0.09, 0.008, "body-dark"),
  ], 1.25),
  prop("hot-dog", "food", "Hot dog", 22, ["snack", "fast food"], ["hotdog", "sausage"], "upright", bun, red, [
    E(0.01, -0.04, 0.07, 0.028, "body"),
    R(-0.05, -0.048, 0.12, 0.016, "accent", { rx: 0.008 }),
    R(-0.03, -0.03, 0.02, 0.006, "accent-light", { stroke: false }),
  ], 1.15),
  prop("taco", "food", "Taco", 24, ["snack", "fast food"], ["taco shell"], "upright", gold, green, [
    P([[-0.06, -0.02], [0.06, -0.02], [0.03, 0.04], [-0.03, 0.04]], "body"),
    P([[-0.045, -0.09], [0.045, -0.09], [0.05, -0.02], [-0.05, -0.02]], "body-dark"),
    R(-0.02, -0.07, 0.04, 0.03, "accent", { stroke: false }),
  ], 1.2),
  prop("sandwich", "food", "Sandwich", 14, ["lunch", "bread"], ["sarnie", "sub"], "upright", cream, green, [
    R(-0.04, -0.09, 0.08, 0.02, "body", { rx: 0.006 }),
    R(-0.038, -0.07, 0.076, 0.014, "accent"),
    R(-0.038, -0.056, 0.076, 0.012, "body-dark"),
    R(-0.04, -0.044, 0.08, 0.02, "body", { rx: 0.006 }),
  ], 1.15),
  prop("donut", "food", "Donut", 26, ["snack", "sweet"], ["doughnut", "donuts"], "upright", pink, gold, [
    C(0, -0.06, 0.045, "body"),
    C(0, -0.06, 0.016, "none"),
    R(-0.02, -0.1, 0.012, 0.008, "accent", { angle: -20, stroke: false }),
    R(0.008, -0.098, 0.012, 0.008, "accent", { angle: 15, stroke: false }),
  ], 1.2),
  prop("ice-cream-cone", "food", "Ice cream", 28, ["snack", "sweet", "dessert"], ["ice cream", "icecream", "cone"], "upright", cream, brown, [
    C(0, -0.12, 0.032, "body"),
    C(0.02, -0.1, 0.026, "accent-light"),
    P([[-0.022, -0.08], [0.022, -0.08], [0.004, 0.02], [-0.004, 0.02]], "accent"),
  ], 1.25),
  prop("apple", "food", "Apple", 30, ["fruit", "snack"], ["apples"], "upright", red, green, [
    C(0, -0.07, 0.04, "body"),
    R(-0.004, -0.12, 0.008, 0.02, "accent"),
    E(0.012, -0.115, 0.014, 0.008, "accent", { angle: 30 }),
  ], 1.2),
  prop("banana", "food", "Banana", 32, ["fruit", "snack"], ["bananas"], "upright", gold, brown, [
    D("M -0.01 0.02 Q 0.055 -0.02 0.02 -0.13 Q -0.015 -0.04 -0.01 0.02 Z", "body"),
    R(0.012, -0.145, 0.012, 0.02, "accent", { angle: 20 }),
  ], 1.3),
  prop("cookie", "food", "Cookie", 34, ["snack", "sweet"], ["biscuit", "cookies"], "upright", bun, brown, [
    C(0.005, -0.06, 0.04, "body"),
    C(-0.012, -0.07, 0.006, "accent", { stroke: false }),
    C(0.016, -0.05, 0.006, "accent", { stroke: false }),
    C(0.004, -0.08, 0.005, "accent", { stroke: false }),
  ], 1.15),
  prop("cupcake", "food", "Cupcake", 36, ["snack", "sweet", "dessert"], ["cake", "cupcakes"], "upright", pink, cream, [
    P([[-0.028, -0.04], [0.028, -0.04], [0.02, 0.02], [-0.02, 0.02]], "accent"),
    C(0, -0.07, 0.032, "body"),
    C(-0.012, -0.09, 0.016, "body-light", { stroke: false }),
  ], 1.2),
  prop("popcorn", "food", "Popcorn", 38, ["snack", "movie"], ["pop corn"], "upright", red, cream, [
    P([[-0.04, -0.02], [0.04, -0.02], [0.028, 0.03], [-0.028, 0.03]], "body"),
    C(-0.016, -0.05, 0.016, "accent"),
    C(0.014, -0.06, 0.018, "accent"),
    C(0, -0.04, 0.014, "accent-light", { stroke: false }),
  ], 1.15),
  prop("noodle-bowl", "food", "Noodle bowl", 40, ["lunch", "dinner"], ["noodles", "ramen", "soup"], "upright", cream, gold, [
    E(0, -0.04, 0.05, 0.018, "body"),
    P([[-0.046, -0.04], [0.046, -0.04], [0.03, 0.02], [-0.03, 0.02]], "body"),
    R(-0.02, -0.09, 0.006, 0.05, "accent", { angle: -12 }),
    R(0.01, -0.095, 0.006, 0.05, "accent", { angle: 16 }),
  ], 1.2),
  prop("chicken-drumstick", "food", "Drumstick", 42, ["dinner", "meat"], ["chicken", "drumstick"], "forearm", bun, brown, [
    E(0.01, -0.1, 0.028, 0.04, "body"),
    R(-0.008, -0.06, 0.016, 0.08, "accent", { rx: 0.006 }),
    C(0, 0.02, 0.01, "accent"),
  ], 1.2),
  prop("carrot", "food", "Carrot", 44, ["vegetable", "snack"], ["carrots"], "forearm", "#e07a2f", green, [
    P([[-0.016, -0.12], [0.016, -0.12], [0.004, 0.02], [-0.004, 0.02]], "body"),
    E(0, -0.13, 0.02, 0.012, "accent"),
  ], 1.3),
  prop("croissant", "food", "Croissant", 46, ["breakfast", "pastry"], ["croissants"], "upright", bun, gold, [
    D("M -0.06 -0.02 Q -0.02 -0.1 0.05 -0.03 Q 0.01 -0.04 -0.05 0.02 Q -0.07 0.01 -0.06 -0.02 Z", "body"),
    R(-0.02, -0.06, 0.03, 0.008, "accent", { angle: -25, stroke: false }),
  ], 1.2),
  prop("chocolate-bar", "food", "Chocolate", 48, ["snack", "sweet"], ["chocolate", "candy bar"], "upright", brown, gold, [
    R(-0.03, -0.1, 0.06, 0.09, "body", { rx: 0.006 }),
    R(-0.03, -0.07, 0.06, 0.004, "accent", { stroke: false }),
    R(-0.002, -0.1, 0.004, 0.09, "accent", { stroke: false }),
    R(-0.022, -0.095, 0.044, 0.016, "accent-light", { stroke: false }),
  ], 1.15),
];
