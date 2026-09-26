import { config as remotion } from "@remotion/eslint-config-flat";

// Core rule 4: src/engine/** stays app-agnostic (no fs, env, or registerRoot).
// Core rule 1: rendering is frame-pure (no Math.random, Date, or state hooks).
const engineRules = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        { group: ["node:*"], message: "engine/ must not use Node built-ins." },
        { group: ["fs", "fs/*", "path", "child_process", "os"], message: "engine/ must not touch the filesystem or OS." },
      ],
      paths: [
        { name: "remotion", importNames: ["registerRoot"], message: "Only src/app may call registerRoot." },
        { name: "react", importNames: ["useState", "useEffect", "useLayoutEffect", "useReducer"], message: "Frame-pure: derive visuals from (frame, props)." },
      ],
    },
  ],
  "no-restricted-globals": [
    "error",
    { name: "process", message: "engine/ must not read process or env." },
    { name: "require", message: "Use ES imports." },
  ],
  "no-restricted-properties": [
    "error",
    { object: "Math", property: "random", message: "Use seeded random() from remotion." },
    { object: "Date", property: "now", message: "Frame-pure: no wall-clock time." },
  ],
  "no-restricted-syntax": [
    "error",
    { selector: "NewExpression[callee.name='Date']", message: "Frame-pure: no wall-clock time." },
  ],
};

export default [
  { ignores: ["out/**", "node_modules/**", "public/**"] },
  ...remotion,
  { files: ["src/engine/**/*.{ts,tsx}"], rules: engineRules },
  // Tests and scripts build skit data, whose `transition` fields aren't CSS animations.
  { files: ["tests/**", "scripts/**"], rules: { "@remotion/non-pure-animation": "off" } },
];
