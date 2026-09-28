import { C, E, P, R, prop, type Art } from "./types";

const dark = "#2c313c";
const metal = "#c5c8d0";
const green = "#3d8c4a";
const gold = "#f4c542";
const paper = "#f7f4ee";
const blue = "#3a6ea5";
const red = "#e0463c";
const brown = "#8a4b24";

export const HOME: Art[] = [
  prop("keys", "home", "Keys", 5, ["door", "home"], ["key"], "upright", gold, dark, [
    C(-0.01, -0.04, 0.018, "body"),
    C(-0.01, -0.04, 0.007, "none"),
    R(0.004, -0.048, 0.05, 0.01, "body"),
    R(0.03, -0.048, 0.008, 0.02, "body"),
  ], 1.35),
  prop("umbrella", "home", "Umbrella", 33, ["rain", "weather"], ["brolly"], "upright", blue, dark, [
    P([[-0.08, -0.08], [0, -0.16], [0.08, -0.08]], "body"),
    R(-0.005, -0.08, 0.01, 0.1, "accent"),
    P([[-0.012, 0.02], [0.012, 0.02], [0, 0.045]], "accent"),
  ], 1.15),
  prop("broom", "home", "Broom", 100, ["clean", "home"], ["brooms"], "forearm", brown, "#d8c3a5", [
    R(-0.006, -0.2, 0.012, 0.14, "body"),
    P([[-0.03, -0.06], [0.03, -0.06], [0.02, 0.02], [-0.02, 0.02]], "accent"),
  ], 1.1),
  prop("mop", "home", "Mop", 102, ["clean", "home"], ["mops"], "forearm", metal, blue, [
    R(-0.006, -0.2, 0.012, 0.14, "body"),
    E(0, -0.04, 0.03, 0.02, "accent"),
    R(-0.02, -0.03, 0.04, 0.03, "accent-dark", { stroke: false }),
  ], 1.1),
  prop("toothbrush", "home", "Toothbrush", 104, ["bathroom"], ["tooth brush"], "forearm", blue, paper, [
    R(-0.006, -0.14, 0.012, 0.12, "body", { rx: 0.004 }),
    R(-0.014, -0.16, 0.028, 0.022, "accent", { rx: 0.004 }),
  ], 1.35),
  prop("hairdryer", "home", "Hairdryer", 106, ["bathroom", "hair"], ["dryer", "hair dryer"], "forearm", pink(), dark, [
    R(-0.02, -0.12, 0.07, 0.04, "body", { rx: 0.016 }),
    R(0.04, -0.1, 0.02, 0.03, "accent"),
    R(-0.008, -0.08, 0.016, 0.06, "body-dark"),
  ], 1.15),
  prop("hand-mirror", "home", "Hand mirror", 108, ["bathroom"], ["mirror"], "upright", metal, "#bfe3f5", [
    C(0, -0.1, 0.04, "accent"),
    C(0, -0.1, 0.032, "body", { stroke: false }),
    R(-0.008, -0.06, 0.016, 0.07, "accent"),
  ], 1.15),
  prop("pillow", "home", "Pillow", 110, ["bed", "home"], ["cushion"], "upright", "#f2f0ea", blue, [
    R(-0.06, -0.08, 0.12, 0.06, "body", { rx: 0.02 }),
    R(-0.02, -0.06, 0.04, 0.02, "accent", { stroke: false }),
  ], 1.05),
  prop("potted-plant", "home", "Plant", 35, ["home", "leaf"], ["plant", "pot plant"], "upright", "#c47a3a", green, [
    P([[-0.028, -0.02], [0.028, -0.02], [0.02, 0.03], [-0.02, 0.03]], "body"),
    E(-0.02, -0.08, 0.02, 0.028, "accent"),
    E(0.02, -0.09, 0.018, 0.03, "accent"),
    E(0, -0.11, 0.016, 0.026, "accent-dark"),
  ], 1.15),
  prop("toilet-roll", "home", "Toilet roll", 112, ["bathroom"], ["toilet paper", "loo roll"], "upright", paper, "#e7e2d8", [
    E(0, -0.05, 0.04, 0.04, "body"),
    E(0, -0.05, 0.014, 0.014, "accent"),
  ], 1.2),
  prop("spray-bottle", "home", "Spray bottle", 114, ["clean"], ["spray"], "upright", "#7ec8e3", dark, [
    R(-0.01, -0.16, 0.028, 0.03, "accent", { rx: 0.004 }),
    R(-0.02, -0.13, 0.04, 0.12, "body", { rx: 0.01 }),
    R(0.012, -0.18, 0.02, 0.012, "accent"),
  ], 1.15),
  prop("alarm-clock", "home", "Alarm clock", 37, ["morning", "time"], ["alarm", "clock"], "upright", red, paper, [
    C(0, -0.06, 0.04, "body"),
    C(0, -0.06, 0.026, "accent"),
    R(-0.004, -0.08, 0.008, 0.02, "body-dark", { stroke: false }),
    C(-0.03, -0.09, 0.01, "body"),
    C(0.03, -0.09, 0.01, "body"),
  ], 1.2),
];

export const MONEY: Art[] = [
  prop("shopping-bag", "money", "Shopping bag", 39, ["shop", "bag"], ["bag", "shopping"], "upright", red, gold, [
    P([[-0.04, -0.08], [0.04, -0.08], [0.032, 0.03], [-0.032, 0.03]], "body"),
    P([[-0.02, -0.12], [-0.01, -0.12], [-0.01, -0.08], [-0.02, -0.08]], "accent"),
    P([[0.01, -0.12], [0.02, -0.12], [0.02, -0.08], [0.01, -0.08]], "accent"),
  ], 1.15),
  prop("credit-card", "money", "Credit card", 41, ["pay", "money"], ["card", "debit card"], "upright", blue, gold, [
    R(-0.05, -0.06, 0.1, 0.06, "body", { rx: 0.006 }),
    R(-0.04, -0.04, 0.02, 0.014, "accent"),
  ], 1.25),
  prop("cash", "money", "Cash", 43, ["money", "pay"], ["money", "bills", "notes"], "upright", "#7dcea0", green, [
    R(-0.05, -0.05, 0.09, 0.045, "body"),
    R(-0.03, -0.04, 0.05, 0.025, "accent", { stroke: false }),
    C(0, -0.028, 0.01, "body-light", { stroke: false }),
  ], 1.2),
  prop("wallet", "money", "Wallet", 45, ["money"], ["billfold"], "upright", brown, gold, [
    R(-0.05, -0.06, 0.1, 0.05, "body", { rx: 0.006 }),
    R(-0.02, -0.07, 0.04, 0.016, "accent"),
  ], 1.15),
  prop("receipt", "money", "Receipt", 47, ["shop", "money"], ["receipts"], "upright", paper, dark, [
    R(-0.025, -0.14, 0.05, 0.14, "body"),
    R(-0.016, -0.12, 0.032, 0.004, "accent", { stroke: false }),
    R(-0.016, -0.1, 0.028, 0.004, "accent", { stroke: false }),
    R(-0.016, -0.08, 0.02, 0.004, "accent", { stroke: false }),
  ], 1.25),
  prop("gift-box", "money", "Gift", 49, ["present", "party"], ["present", "gift"], "upright", red, gold, [
    R(-0.04, -0.08, 0.08, 0.07, "body"),
    R(-0.006, -0.08, 0.012, 0.07, "accent", { stroke: false }),
    R(-0.04, -0.05, 0.08, 0.012, "accent", { stroke: false }),
    P([[-0.02, -0.1], [0, -0.12], [0.02, -0.1], [0, -0.08]], "accent"),
  ], 1.15),
  prop("piggy-bank", "money", "Piggy bank", 116, ["save", "money"], ["piggy", "piggybank"], "upright", pink(), dark, [
    E(0, -0.05, 0.05, 0.035, "body"),
    C(0.04, -0.06, 0.012, "body"),
    C(0.048, -0.062, 0.003, "accent", { stroke: false }),
    R(-0.01, -0.09, 0.016, 0.012, "accent"),
  ], 1.15),
  prop("shopping-basket", "money", "Basket", 118, ["shop"], ["basket"], "upright", brown, gold, [
    P([[-0.05, -0.06], [0.05, -0.06], [0.035, 0.03], [-0.035, 0.03]], "body"),
    R(-0.04, -0.04, 0.08, 0.004, "accent", { stroke: false }),
    P([[-0.02, -0.1], [0.02, -0.1], [0.02, -0.06], [-0.02, -0.06]], "accent"),
  ], 1.1),
];

export const SPORT: Art[] = [
  prop("dumbbell", "sport", "Dumbbell", 120, ["gym", "exercise"], ["weight", "weights"], "forearm", dark, metal, [
    R(-0.05, -0.05, 0.02, 0.04, "body"),
    R(-0.03, -0.04, 0.06, 0.02, "accent"),
    R(0.03, -0.05, 0.02, 0.04, "body"),
  ], 1.2),
  prop("basketball", "sport", "Basketball", 51, ["sport", "ball"], ["hoops"], "upright", "#e07a2f", dark, [
    C(0, -0.06, 0.045, "body"),
    R(-0.045, -0.064, 0.09, 0.006, "accent", { stroke: false }),
    R(-0.004, -0.105, 0.008, 0.09, "accent", { stroke: false }),
  ], 1.15),
  prop("soccer-ball", "sport", "Soccer ball", 53, ["sport", "ball"], ["football", "soccer"], "upright", paper, dark, [
    C(0, -0.06, 0.045, "body"),
    P([[0, -0.09], [0.016, -0.07], [0.008, -0.05], [-0.008, -0.05], [-0.016, -0.07]], "accent", { stroke: false }),
  ], 1.15),
  prop("tennis-racket", "sport", "Tennis racket", 122, ["sport", "tennis"], ["racket", "racquet"], "forearm", green, paper, [
    E(0, -0.12, 0.03, 0.04, "accent"),
    E(0, -0.12, 0.02, 0.028, "none"),
    R(-0.006, -0.08, 0.012, 0.09, "body"),
  ], 1.15),
  prop("yoga-mat", "sport", "Yoga mat", 124, ["exercise", "yoga"], ["mat"], "forearm", "#7a5ea7", dark, [
    R(-0.02, -0.16, 0.05, 0.14, "body", { rx: 0.01 }),
    R(-0.012, -0.12, 0.034, 0.02, "accent", { stroke: false }),
  ], 1.1),
  prop("stopwatch", "sport", "Stopwatch", 126, ["time", "sport"], ["timer"], "upright", metal, red, [
    C(0, -0.07, 0.04, "body"),
    C(0, -0.07, 0.028, "accent-light"),
    R(-0.006, -0.12, 0.012, 0.02, "accent"),
    R(-0.004, -0.09, 0.008, 0.02, "body-dark", { stroke: false }),
  ], 1.2),
  prop("trophy", "sport", "Trophy", 55, ["win", "prize"], ["cup trophy"], "upright", gold, brown, [
    P([[-0.02, -0.12], [0.02, -0.12], [0.012, -0.04], [-0.012, -0.04]], "body"),
    C(-0.028, -0.09, 0.012, "body"),
    C(0.028, -0.09, 0.012, "body"),
    R(-0.016, -0.04, 0.032, 0.03, "accent"),
    R(-0.024, -0.01, 0.048, 0.012, "accent"),
  ], 1.15),
  prop("whistle", "sport", "Whistle", 128, ["sport", "coach"], ["whistles"], "forearm", metal, dark, [
    E(0.01, -0.04, 0.04, 0.02, "body"),
    R(0.04, -0.046, 0.02, 0.012, "accent"),
    C(-0.02, -0.03, 0.008, "body"),
  ], 1.3),
];

export const PARTY: Art[] = [
  prop("balloon", "party", "Balloon", 57, ["party"], ["balloons"], "upright", red, dark, [
    E(0, -0.12, 0.035, 0.045, "body"),
    P([[-0.008, -0.075], [0.008, -0.075], [0, -0.06]], "body-dark"),
    R(-0.002, -0.06, 0.004, 0.08, "accent"),
  ], 1.2),
  prop("party-popper", "party", "Party popper", 130, ["party"], ["popper", "cracker"], "forearm", gold, red, [
    P([[-0.02, -0.02], [0.02, -0.02], [0.008, -0.12], [-0.008, -0.12]], "body"),
    C(-0.02, -0.14, 0.008, "accent"),
    C(0.01, -0.16, 0.006, "accent"),
    C(0.02, -0.13, 0.005, "body-dark"),
  ], 1.25),
  prop("flower-bouquet", "party", "Bouquet", 59, ["flowers", "gift"], ["flowers", "bouquet"], "upright", green, red, [
    R(-0.008, -0.08, 0.016, 0.1, "body"),
    C(-0.02, -0.12, 0.016, "accent"),
    C(0.02, -0.13, 0.016, "accent"),
    C(0, -0.15, 0.016, "#f2a7c3"),
  ], 1.15),
  prop("rose", "party", "Rose", 132, ["flower"], ["roses"], "upright", red, green, [
    C(0, -0.12, 0.02, "body"),
    C(-0.012, -0.1, 0.014, "body-dark"),
    R(-0.004, -0.1, 0.008, 0.1, "accent"),
    E(0.016, -0.06, 0.012, 0.008, "accent", { angle: 40 }),
  ], 1.3),
  prop("small-flag", "party", "Flag", 134, ["flag"], ["flag"], "upright", blue, paper, [
    R(-0.004, -0.16, 0.01, 0.18, "accent"),
    R(0.006, -0.16, 0.05, 0.032, "body"),
  ], 1.15),
  prop("sparkler", "party", "Sparkler", 136, ["party"], ["sparkler stick"], "forearm", gold, dark, [
    R(-0.004, -0.08, 0.008, 0.1, "accent"),
    R(-0.002, -0.16, 0.004, 0.08, "body"),
    C(-0.01, -0.15, 0.004, "body", { stroke: false }),
    C(0.012, -0.14, 0.004, "body", { stroke: false }),
  ], 1.3),
  prop("megaphone", "party", "Megaphone", 61, ["loud", "announce"], ["loudspeaker", "bullhorn"], "forearm", red, gold, [
    P([[-0.01, -0.04], [0.01, -0.04], [0.04, -0.12], [-0.02, -0.12]], "body"),
    R(-0.02, -0.05, 0.03, 0.04, "accent", { rx: 0.008 }),
  ], 1.2),
];

export const TRAVEL: Art[] = [
  prop("suitcase", "travel", "Suitcase", 63, ["travel", "trip"], ["luggage", "bag"], "upright", blue, gold, [
    R(-0.05, -0.12, 0.1, 0.1, "body", { rx: 0.008 }),
    R(-0.02, -0.15, 0.04, 0.03, "accent"),
    R(-0.04, -0.07, 0.08, 0.008, "accent", { stroke: false }),
  ], 1.05),
  prop("passport", "travel", "Passport", 65, ["travel"], ["passports"], "upright", "#1f4e3d", gold, [
    R(-0.035, -0.1, 0.07, 0.09, "body", { rx: 0.004 }),
    C(0, -0.06, 0.016, "accent"),
  ], 1.15),
  prop("paper-map", "travel", "Map", 138, ["travel", "directions"], ["map"], "upright", paper, blue, [
    R(-0.05, -0.08, 0.1, 0.07, "body"),
    P([[-0.04, -0.02], [-0.01, -0.06], [0.02, -0.03], [0.04, -0.07]], "accent", { stroke: false }),
  ], 1.1),
  prop("ticket", "travel", "Ticket", 67, ["travel", "show"], ["tickets"], "upright", gold, red, [
    R(-0.05, -0.04, 0.1, 0.04, "body", { rx: 0.004 }),
    R(0.03, -0.04, 0.008, 0.04, "accent", { stroke: false }),
    C(-0.03, -0.02, 0.006, "accent", { stroke: false }),
  ], 1.3),
  prop("binoculars", "travel", "Binoculars", 140, ["look", "outdoors"], ["binocular"], "upright", dark, metal, [
    C(-0.02, -0.06, 0.02, "body"),
    C(0.02, -0.06, 0.02, "body"),
    R(-0.016, -0.05, 0.032, 0.016, "accent"),
  ], 1.2),
  prop("flashlight", "travel", "Flashlight", 142, ["light", "outdoors"], ["torch"], "forearm", dark, gold, [
    R(-0.012, -0.12, 0.024, 0.1, "body", { rx: 0.008 }),
    P([[-0.02, -0.14], [0.02, -0.14], [0.014, -0.1], [-0.014, -0.1]], "accent"),
  ], 1.25),
  prop("fishing-rod", "travel", "Fishing rod", 144, ["fish", "outdoors"], ["rod", "fishing"], "forearm", brown, dark, [
    R(-0.004, -0.24, 0.008, 0.24, "body"),
    P([[0.004, -0.22], [0.03, -0.16], [0.01, -0.16]], "accent", { stroke: false }),
  ], 1.05),
];

function pink() {
  return "#f2a7c3";
}
