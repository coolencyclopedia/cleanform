import type { Dataset, EnabledRule, CellDiff } from "../model";

export function previewDiff(
  dataset: Dataset,
  rules: EnabledRule[]
): CellDiff[] {
  const diffs: CellDiff[] = [];

  dataset.rows.forEach((row, rowIndex) => {
    rules.forEach((rule) => {
      const col = rule.columnIndex;
      const before = row[col];
      const after = rule.apply(before);

      if (before !== after) {
        diffs.push({
          rowIndex,
          columnIndex: col,
          before,
          after,
        });
      }
    });
  });

  return diffs;
}
