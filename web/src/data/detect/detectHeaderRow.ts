export function detectHeaderRow(
  row: unknown[],
  nextRow?: unknown[]
): boolean {
  if (!row || row.length === 0) return false;

  let stringCount = 0;
  let numericCount = 0;
  const uniqueCount = new Set(row).size;

  for (const cell of row) {
    if (cell == null) continue;

    const value = String(cell).trim();
    if (value === "") continue;

    if (!isNaN(Number(value))) {
      numericCount++;
    } else {
      stringCount++;
    }
  }

  const mostlyStrings =
    stringCount / row.length > 0.6;

  const mostlyUnique =
    uniqueCount / row.length > 0.9;

  const typeDiffersFromNext =
    nextRow &&
    nextRow.some((v, i) => {
      if (v == null || row[i] == null) return false;
      return (
        !isNaN(Number(v)) !==
        !isNaN(Number(row[i]))
      );
    });

  return (
    mostlyStrings &&
    mostlyUnique &&
    Boolean(typeDiffersFromNext)
  );
}
