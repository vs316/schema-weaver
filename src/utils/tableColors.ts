const PALETTE = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
];

export function getAutoTableColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
