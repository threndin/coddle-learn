import { Worker } from "node:worker_threads";
import { CHALLENGE_LIMITS } from "@coddle/shared";

export type ChallengeRunCase = {
  error: string | null;
  actualJson: string | null;
};

export type ChallengeRunResult =
  | { ok: true; cases: ChallengeRunCase[] }
  | { ok: false; error: string };

const FUNCTION_NAME = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

/** Reject obvious escapes before the snippet ever reaches the sandbox. */
const BLOCKED_CODE =
  /\brequire\s*\(|\bprocess\s*[.[]|\bglobalThis\b|\bglobal\s*[.[]|\beval\s*\(|\bFunction\s*\(|\bWebAssembly\b|\bimport\s|\bimport\s*\(|\bqueueMicrotask\s*\(|\bset(?:Timeout|Interval|Immediate)\s*\(|child_process|worker_threads|\bnode:|__proto__/;

export function challengeCodeIssue(code: string): string | null {
  if (!code.trim()) return "Write a function before submitting.";
  if (code.length > CHALLENGE_LIMITS.codeMax) {
    return `Keep the solution under ${CHALLENGE_LIMITS.codeMax.toLocaleString()} characters.`;
  }
  if (BLOCKED_CODE.test(code)) {
    return "This runner only executes your function. Remove imports, require, eval, or process.";
  }
  return null;
}

/**
 * Runs a pure function against JSON cases inside a worker.
 * The worker is terminated on timeout. This is a learning sandbox with a hard
 * time and memory cap, not a general-purpose isolate.
 */
const WORKER_SOURCE = `
import { parentPort, workerData } from "node:worker_threads";
import vm from "node:vm";

const { code, functionName, cases } = workerData;
const nameOk = typeof functionName === "string" && /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(functionName);

function clip(message) {
  const text = String(message || "The solution failed.");
  return text.length > 240 ? text.slice(0, 240) : text;
}

function finish(payload) {
  parentPort.postMessage(payload);
}

if (!nameOk || typeof code !== "string" || !Array.isArray(cases)) {
  finish({ ok: false, error: "This challenge is misconfigured." });
} else {
  const sandbox = {
    Math,
    JSON,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Date,
    Map,
    Set,
    WeakMap,
    WeakSet,
    RegExp,
    Error,
    TypeError,
    RangeError,
    Symbol,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Infinity,
    NaN,
    undefined,
    console: { log() {}, error() {}, warn() {}, info() {}, debug() {} },
  };

  try {
    vm.createContext(sandbox);
    const script =
      '"use strict";\\n' +
      code +
      "\\nif (typeof " +
      functionName +
      ' !== "function") throw new Error("Define a function named ' +
      functionName +
      '.");\\n' +
      functionName;
    const fn = vm.runInContext(script, sandbox, { timeout: 1000 });
    sandbox.__fn = fn;
    const results = [];
    for (const test of cases) {
      sandbox.__args = Array.isArray(test.args) ? test.args : [];
      try {
        const actual = vm.runInContext("__fn(...__args)", sandbox, { timeout: 800 });
        if (actual && typeof actual.then === "function") {
          results.push({
            error: "Return a value directly. Async functions are not supported.",
            actualJson: null,
          });
          continue;
        }
        let actualJson = null;
        try {
          const encoded = JSON.stringify(actual);
          if (typeof encoded !== "string") {
            results.push({
              error: "Return a JSON value (no undefined or functions).",
              actualJson: null,
            });
            continue;
          }
          if (encoded.length > 4000) {
            results.push({ error: "The return value is too large.", actualJson: null });
            continue;
          }
          actualJson = encoded;
        } catch {
          results.push({
            error: "Return a JSON value (no undefined or functions).",
            actualJson: null,
          });
          continue;
        }
        results.push({ error: null, actualJson });
      } catch (err) {
        const timedOut = err && err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT";
        results.push({
          error: timedOut
            ? "That test took too long. Check for an infinite loop."
            : clip(err && err.message ? err.message : err),
          actualJson: null,
        });
      }
    }
    finish({ ok: true, cases: results });
  } catch (err) {
    const timedOut = err && err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT";
    finish({
      ok: false,
      error: timedOut
        ? "Your solution took too long. Check for an infinite loop."
        : clip(err && err.message ? err.message : err),
    });
  }
}
`;

function clip(message: string): string {
  const text = message.trim() || "The solution failed.";
  return text.length > CHALLENGE_LIMITS.errorMax
    ? text.slice(0, CHALLENGE_LIMITS.errorMax)
    : text;
}

function normalizeMessage(message: unknown): ChallengeRunResult {
  if (!message || typeof message !== "object") {
    return { ok: false, error: "The checker could not run your solution. Try again." };
  }
  const row = message as { ok?: unknown; error?: unknown; cases?: unknown };
  if (row.ok === false) {
    return {
      ok: false,
      error: clip(typeof row.error === "string" ? row.error : "The solution failed."),
    };
  }
  if (row.ok !== true || !Array.isArray(row.cases)) {
    return { ok: false, error: "The checker could not run your solution. Try again." };
  }
  return {
    ok: true,
    cases: row.cases.map((item) => {
      const entry =
        item && typeof item === "object"
          ? (item as { error?: unknown; actualJson?: unknown })
          : {};
      const actualJson = typeof entry.actualJson === "string" ? entry.actualJson : null;
      if (actualJson && actualJson.length > CHALLENGE_LIMITS.resultJsonMax) {
        return { error: "The return value is too large.", actualJson: null };
      }
      return {
        error: typeof entry.error === "string" ? clip(entry.error) : null,
        actualJson,
      };
    }),
  };
}

export function runChallengeCode(input: {
  code: string;
  functionName: string;
  cases: { args: unknown[] }[];
}): Promise<ChallengeRunResult> {
  if (!FUNCTION_NAME.test(input.functionName)) {
    return Promise.resolve({ ok: false, error: "This challenge is misconfigured." });
  }

  return new Promise((resolve) => {
    let settled = false;
    let worker: Worker;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (result: ChallengeRunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    };

    try {
      worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: {
          code: input.code,
          functionName: input.functionName,
          cases: input.cases.map((item) => ({ args: item.args })),
        },
        resourceLimits: {
          maxOldGenerationSizeMb: 32,
          maxYoungGenerationSizeMb: 8,
          codeRangeSizeMb: 8,
          stackSizeMb: 4,
        },
        env: {},
      });
    } catch (error) {
      console.error("[challenges] runner failed to start", error);
      resolve({ ok: false, error: "The checker could not run your solution. Try again." });
      return;
    }

    timer = setTimeout(() => {
      finish({
        ok: false,
        error: "Your solution took too long. Check for an infinite loop.",
      });
    }, 3_000);

    worker.once("message", (message: unknown) => {
      finish(normalizeMessage(message));
    });
    worker.once("error", (error) => {
      console.error("[challenges] runner failed", error);
      finish({ ok: false, error: "The checker could not run your solution. Try again." });
    });
    worker.once("exit", (code) => {
      if (settled) return;
      finish({
        ok: false,
        error:
          code === 0
            ? "The checker could not run your solution. Try again."
            : "Your solution took too long. Check for an infinite loop.",
      });
    });
  });
}
