import type { Dataset, EnabledRule } from "../model";

export function applyRules(
  dataset: Dataset,
  rules: EnabledRule[]
): Dataset {
  const newRows = dataset.rows.map((row) => {
    const newRow = [...row];

    for (const rule of rules) {
      const value = newRow[rule.columnIndex];
      newRow[rule.columnIndex] = rule.apply(value);
    }

    return newRow;
  });

  return {
    columns: [...dataset.columns],
    rows: newRows,
  };
}
