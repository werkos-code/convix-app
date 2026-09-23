import { describe, expect, it } from "vitest";

import {
  formatDateNL,
  formatDateRangeNL,
  formatDateRangeShortNL,
  formatDateShortNL,
  formatTimelineDayLabel,
} from "@/lib/dates/format";

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

describe("formatDateShortNL", () => {
  it("formats as day + Dutch month abbreviation", () => {
    expect(formatDateShortNL("2026-09-24")).toBe("24 sep");
    expect(formatDateShortNL("2026-10-08")).toBe("8 okt");
    expect(formatDateShortNL("2026-03-01")).toBe("1 mrt");
  });
});

describe("formatDateRangeNL", () => {
  it("joins start and end", () => {
    expect(formatDateRangeNL("2026-09-24", "2026-10-23")).toBe(
      "24-09-2026 → 23-10-2026",
    );
  });
});

describe("formatDateRangeShortNL", () => {
  it("joins compact Dutch dates", () => {
    expect(formatDateRangeShortNL("2026-09-24", "2026-10-23")).toBe(
      "24 sep → 23 okt",
    );
  });
});

describe("formatTimelineDayLabel", () => {
  it("returns Morgen for the next calendar day", () => {
    expect(formatTimelineDayLabel("2026-09-24", "2026-09-23")).toBe("Morgen");
  });

  it("returns Vandaag for today", () => {
    expect(formatTimelineDayLabel("2026-09-23", "2026-09-23")).toBe("Vandaag");
  });

  it("falls back to DD-MM-YYYY otherwise", () => {
    expect(formatTimelineDayLabel("2026-09-25", "2026-09-23")).toBe(
      "25-09-2026",
    );
  });
});
