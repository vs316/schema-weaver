import { SCHEMA_TEMPLATES } from "../utils/schemaTemplates";
import { applyAutoColors } from "../utils/colorizeSchema";
import type { Table } from "../types";

export function SchemaTemplates({
  load,
}: {
  load: (tables: Table[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase opacity-60">
        Templates
      </div>

      {Object.keys(SCHEMA_TEMPLATES).map((key) => (
        <button
          key={key}
          onClick={() => {
            const tables = applyAutoColors(
              structuredClone(SCHEMA_TEMPLATES[key]),
              []
            );
            load(tables);
          }}
          className="w-full px-3 py-2 text-xs rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {key.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
