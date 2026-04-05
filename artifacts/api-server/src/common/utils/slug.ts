const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => CYRILLIC[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export async function ensureUniqueSlug(
  db: any,
  table: any,
  column: any,
  base: string,
  excludeId?: number,
): Promise<string> {
  const { eq, and, ne } = await import("drizzle-orm");
  let candidate = base;
  let counter = 2;

  for (let i = 0; i < 50; i++) {
    const cond = excludeId
      ? and(eq(column, candidate), ne(table.id, excludeId))
      : eq(column, candidate);
    const rows = await db.select({ id: table.id }).from(table).where(cond).limit(1);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${counter++}`;
  }

  return `${base}-${Date.now()}`;
}
