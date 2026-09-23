import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  evaluatePushCandidates,
} from "@/lib/push/evaluate";
import { eurosToCents } from "@/lib/money/cents";

describe("evaluatePushCandidates", () => {
  it("respects preferences and dedupe keys", () => {
    const candidates = evaluatePushCandidates({
      userId: "u1",
      today: "2026-09-24",
      balanceConfirmed: false,
      periodStartedToday: true,
      freeSpendableCents: eurosToCents(-50),
      insights: [
        {
          id: "budget_exceeded:g1",
          kind: "budget_exceeded",
          severity: "warning",
          title: "Budget over",
          message: "Boodschappen overschreden",
        },
      ],
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        confirm_balance: false,
      },
      alreadySentKeys: new Set(["period_started:2026-09-24"]),
    });

    const types = candidates.map((c) => c.eventType);
    expect(types).not.toContain("period_started");
    expect(types).not.toContain("confirm_balance");
    expect(types).toContain("free_spendable_negative");
    expect(types).toContain("budget_exceeded");
  });

  it("maps Klarna and large payment insights", () => {
    const candidates = evaluatePushCandidates({
      userId: "u1",
      today: "2026-09-23",
      balanceConfirmed: true,
      periodStartedToday: false,
      freeSpendableCents: eurosToCents(200),
      insights: [
        {
          id: "klarna_upcoming:k1",
          kind: "klarna_upcoming",
          severity: "warning",
          title: "Klarna",
          message: "Bijna verschuldigd",
        },
        {
          id: "large_payment:o1",
          kind: "large_payment",
          severity: "info",
          title: "Grote betaling",
          message: "Huur binnenkort",
        },
      ],
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      alreadySentKeys: new Set(),
    });

    expect(candidates.some((c) => c.eventType === "klarna_due_soon")).toBe(
      true,
    );
    expect(
      candidates.some((c) => c.eventType === "large_upcoming_payment"),
    ).toBe(true);
  });
});
