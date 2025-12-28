import { exportMySQLDDL } from "../utils/sqlExport";
import { copySQL, downloadSQL } from "../utils/sqlActions";
import type { Table, Relation } from "../types";

export function SqlExportButtons({
  tables,
  relations,
  notify,
}: {
  tables: Table[];
  relations: Relation[];
  notify: (msg: string, type?: "success" | "info" | "error") => void;
}) {
  const generate = () => exportMySQLDDL(tables, relations);

  return (
    <div className="flex gap-2">
      <button
        onClick={async () => {
          await copySQL(generate());
          notify("SQL copied to clipboard", "success");
        }}
        className="px-3 py-2 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition"
      >
        Copy SQL
      </button>

      <button
        onClick={() => {
          downloadSQL(generate());
          notify("SQL file downloaded", "success");
        }}
        className="px-3 py-2 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"
      >
        Download .sql
      </button>
    </div>
  );
}
