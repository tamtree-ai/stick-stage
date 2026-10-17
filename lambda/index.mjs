// aws-lambda-ric only loads .js/.mjs/.cjs; NODE_OPTIONS=--import=tsx (Dockerfile.lambda) lets this re-export the TypeScript handler.
export { handler } from "./handler.ts";
