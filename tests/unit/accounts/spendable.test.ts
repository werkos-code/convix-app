import { describe, expect, it } from "vitest";
import { isSpendableAccountType } from "@/lib/accounts/spendable";

describe("spendable accounts", () => {
  it("includes checking and other", () => {
    expect(isSpendableAccountType("checking")).toBe(true);
    expect(isSpendableAccountType("other")).toBe(true);
  });

  it("excludes savings from Free Spendable cash basis", () => {
    expect(isSpendableAccountType("savings")).toBe(false);
  });
});
