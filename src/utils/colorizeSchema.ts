import type { Table, Relation } from "../types";
import { getAutoTableColor } from "./tableColors";

export function applyAutoColors(
  tables: Table[],
  relations: Relation[]
): Table[] {
  const visited = new Set<string>();
  let colorIndex = 0;

  const adj = new Map<string, string[]>();
  tables.forEach(t => adj.set(t.id, []));
  relations.forEach(r => {
    adj.get(r.sourceTableId)?.push(r.targetTableId);
    adj.get(r.targetTableId)?.push(r.sourceTableId);
  });

  const dfs = (id: string, color: string) => {
    visited.add(id);
    const t = tables.find(x => x.id === id);
    if (t && !t.color) t.color = color;

    adj.get(id)?.forEach(n => {
      if (!visited.has(n)) dfs(n, color);
    });
  };

  for (const table of tables) {
    if (!visited.has(table.id)) {
      const color = getAutoTableColor(colorIndex++);
      dfs(table.id, color);
    }
  }

  return [...tables];
}
