/**
 * The pass/fail bookkeeping the verify scripts share.
 */
import { isDomainError } from "../src/modules/_shared/errors";

let passed = 0;
let failed = 0;

export function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(
    ok
      ? `  PASS  ${label}`
      : `  FAIL  ${label}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`,
  );
}

/** The domain error code a call fails with, or null when it succeeds. */
export async function errorCode(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    return isDomainError(error) ? error.code : String(error);
  }
}

export function results(): { passed: number; failed: number } {
  return { passed, failed };
}
