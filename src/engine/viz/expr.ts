/**
 * A tiny, safe maths expression language for plots: `0.5*g*t^2`, `sin(2*pi*x)`, `exp(-x/tau)`.
 * Numbers, variables, + - * / ^, unary minus, parentheses and a fixed list of functions.
 * No `eval`: the text is parsed once into a closure tree.
 */

export type Env = Readonly<Record<string, number>>;
export type Compiled = (env: Env) => number;

const FUNCS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  log: Math.log10,
  ln: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

type Tok = { kind: "num"; v: number } | { kind: "id"; v: string } | { kind: "op"; v: string };

const lex = (src: string): Tok[] => {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) {
      out.push({ kind: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) {
      out.push({ kind: "id", v: id[0] });
      i += id[0].length;
      continue;
    }
    if ("+-*/^(),".includes(c)) {
      out.push({ kind: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`unexpected "${c}" at ${i}`);
  }
  return out;
};

/** Parse an expression. Throws with a short message on bad input. */
export const compileExpr = (src: string): Compiled => {
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.kind === "op" && peek()!.v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`expected "${v}"`);
    p++;
  };

  // expr := term (('+'|'-') term)*
  const expr = (): Compiled => {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[p++]!.v;
      const l = left;
      const r = term();
      left = op === "+" ? (env) => l(env) + r(env) : (env) => l(env) - r(env);
    }
    return left;
  };
  // term := unary (('*'|'/') unary | implicit factor)*
  const term = (): Compiled => {
    let left = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = toks[p++]!.v;
        const l = left;
        const r = unary();
        left = op === "*" ? (env) => l(env) * r(env) : (env) => l(env) / r(env);
        continue;
      }
      // Implicit multiplication: `2x`, `2(x+1)`, `2pi`.
      const t = peek();
      if (t && (t.kind === "id" || t.kind === "num" || (t.kind === "op" && t.v === "("))) {
        const l = left;
        const r = power();
        left = (env) => l(env) * r(env);
        continue;
      }
      return left;
    }
  };
  const unary = (): Compiled => {
    if (isOp("-")) {
      p++;
      const v = unary();
      return (env) => -v(env);
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return power();
  };
  // power := atom ('^' unary)?   (right associative)
  const power = (): Compiled => {
    const base = atom();
    if (!isOp("^")) return base;
    p++;
    const exp = unary();
    return (env) => Math.pow(base(env), exp(env));
  };
  const atom = (): Compiled => {
    const t = toks[p++];
    if (!t) throw new Error("unexpected end");
    if (t.kind === "num") return () => t.v;
    if (t.kind === "op" && t.v === "(") {
      const inner = expr();
      expect(")");
      return inner;
    }
    if (t.kind === "id") {
      const fn = FUNCS[t.v];
      if (fn && isOp("(")) {
        p++;
        const args: Compiled[] = [];
        if (!isOp(")")) {
          args.push(expr());
          while (isOp(",")) {
            p++;
            args.push(expr());
          }
        }
        expect(")");
        return (env) => fn(...args.map((a) => a(env)));
      }
      const name = t.v;
      if (isOp("(") && !(name in CONSTS)) throw new Error(`unknown function "${name}"`);
      if (name in CONSTS) {
        const c = CONSTS[name]!;
        return (env) => env[name] ?? c;
      }
      return (env) => {
        const v = env[name];
        if (v === undefined) throw new Error(`unknown variable "${name}"`);
        return v;
      };
    }
    throw new Error(`unexpected "${t.v}"`);
  };

  const out = expr();
  if (p < toks.length) throw new Error(`unexpected "${String(toks[p]!.v)}"`);
  return out;
};

/** Variable names an expression reads (not functions or constants). */
export const exprVars = (src: string): string[] => {
  const toks = lex(src);
  return [
    ...new Set(
      toks.flatMap((t, i) =>
        t.kind === "id" && !(t.v in CONSTS) && !(FUNCS[t.v] && toks[i + 1]?.v === "(") ? [t.v] : [],
      ),
    ),
  ];
};

/** `undefined` when the expression parses and reads only `allowed` variables, else the problem. */
export const exprError = (src: string, allowed?: readonly string[]): string | undefined => {
  try {
    compileExpr(src);
    if (allowed) {
      const bad = exprVars(src).filter((v) => !allowed.includes(v));
      if (bad.length)
        return `unknown variable${bad.length > 1 ? "s" : ""} ${bad.map((b) => `"${b}"`).join(", ")} (known: ${allowed.join(", ")})`;
    }
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
};

const cache = new Map<string, Compiled>();

/** Compiled once per expression text (render calls this every frame). */
export const exprFn = (src: string): Compiled => {
  let f = cache.get(src);
  if (!f) {
    if (cache.size > 512) cache.delete(cache.keys().next().value!);
    f = compileExpr(src);
    cache.set(src, f);
  }
  return f;
};
