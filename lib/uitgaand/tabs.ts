export const UITGAAND_TABS = [
  { id: "vaste-lasten", label: "Vaste lasten" },
  { id: "schulden", label: "Schulden" },
  { id: "budgetten", label: "Budgetten" },
] as const;

export type UitgaandTab = (typeof UITGAAND_TABS)[number]["id"];

export function parseUitgaandTab(
  value: string | undefined | null,
): UitgaandTab {
  if (
    value === "budgetten" ||
    value === "vaste-lasten" ||
    value === "schulden"
  ) {
    return value;
  }
  return "vaste-lasten";
}
