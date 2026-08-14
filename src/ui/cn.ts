export type ClassValue = string | number | bigint | boolean | null | undefined | ClassValue[];

/** Tiny class joiner — no dependency, dedupes whitespace. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    out.push(String(v));
  };
  values.forEach(walk);
  return out.join(" ").replace(/\s+/g, " ").trim();
}
