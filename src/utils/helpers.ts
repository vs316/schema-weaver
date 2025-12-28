import type { Relation, Table } from "../types";
import { ANCHOR_X, ANCHOR_Y } from "./constants";

export const generateId = () => Math.random().toString(36).substr(2, 9);

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function getAnchors(r: Relation, tables: Table[]) {
  const s = tables.find((t) => t.id === r.sourceTableId);
  const t = tables.find((t) => t.id === r.targetTableId);
  if (!s || !t) return null;

  const sx = s.x + ANCHOR_X;
  const sy = s.y + ANCHOR_Y;
  const tx = t.x + ANCHOR_X;
  const ty = t.y + ANCHOR_Y;

  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const bend = r.bend ?? { x: 0, y: 0 };
  const cx = mx + bend.x;
  const cy = my + bend.y;

  return { sx, sy, tx, ty, cx, cy, mx, my };
}

export function getPath(r: Relation, tables: Table[]) {
  const a = getAnchors(r, tables);
  if (!a) return "";

  const { sx, sy, tx, ty, cx, cy } = a;

  if (r.lineType === "straight") {
    return `M ${sx} ${sy} L ${cx} ${cy} L ${tx} ${ty}`;
  }

  return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
}

export function getLabelPos(r: Relation, tables: Table[]) {
  const a = getAnchors(r, tables);
  if (!a) return null;

  const { sx, sy, tx, ty, cx, cy } = a;
  const t = 0.5;
  const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
  const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;
  return { x, y };
}
