// Per-column colors, cycled by category index. Inspired by the Smosh "Beopardy"
// board: a bright, distinct color per category, with readable text on each.
export const COLUMN_COLORS: { bg: string; fg: string }[] = [
  { bg: "#e0447f", fg: "#ffffff" }, // pink
  { bg: "#b45fd4", fg: "#ffffff" }, // orchid
  { bg: "#e8c14a", fg: "#3a2d00" }, // gold
  { bg: "#4f9ee0", fg: "#ffffff" }, // sky
  { bg: "#5a5fd0", fg: "#ffffff" }, // indigo
  { bg: "#3fb6a8", fg: "#ffffff" }, // teal (for boards with >5 categories)
];

export function columnColor(categoryIndex: number) {
  return COLUMN_COLORS[categoryIndex % COLUMN_COLORS.length];
}
