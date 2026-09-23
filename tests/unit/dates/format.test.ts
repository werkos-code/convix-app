import { describe, expect, it } from "vitest";

import { formatDateNL, formatDateRangeNL } from "@/lib/dates/format";

describe("formatDateNL", () => {
  it("formats ISO calendar dates as DD-MM-YYYY", () => {
    expect(formatDateNL("2026-09-23")).toBe("23-09-2026");
    expect(formatDateNL("2025-01-05")).toBe("05-01-2025");
  });

  it("formats ISO datetimes by date part", () => {
    expect(formatDateNL("2026-09-23T10:00:00Z")).toBe("23-09-2026");
  });

  it("returns empty for missing values", () => {
    expect(formatDateNL(null)).toBe("");
    expect(formatDateNL(undefined)).toBe("");
  });
});

describe("formatDateRangeNL", () => {
  it("joins start and end", () => {
    expect(formatDateRangeNL("2026-09-24", "2026-10-23")).toBe(
      "24-09-2026 → 23-10-2026",
    );
  });
});
