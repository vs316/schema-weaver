export function downloadSQL(sql: string) {
  const blob = new Blob([sql], { type: "text/sql" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "schema.sql";
  a.click();
  URL.revokeObjectURL(url);
}

export async function copySQL(sql: string) {
  await navigator.clipboard.writeText(sql);
}
