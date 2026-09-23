import { describe, expect, it } from "vitest";

import { isNextControlFlowError } from "@/lib/auth/control-flow";

describe("isNextControlFlowError", () => {
  it("detects redirect digest", () => {
    expect(
      isNextControlFlowError({ digest: "NEXT_REDIRECT;replace;/login;307;" }),
    ).toBe(true);
  });

  it("ignores normal errors", () => {
    expect(isNextControlFlowError(new Error("boom"))).toBe(false);
    expect(isNextControlFlowError(null)).toBe(false);
  });
});
