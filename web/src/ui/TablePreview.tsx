import type { Dataset, CellDiff } from "../data/model";

interface Props {
  dataset: Dataset;
  diffs: CellDiff[];
}

export default function TablePreview({ dataset, diffs }: Props) {
  function findDiff(row: number, col: number) {
    return diffs.find(
      (d) => d.rowIndex === row && d.columnIndex === col
    );
  }

  return (
    <table border={1} cellPadding={4}>
      <thead>
        <tr>
          {dataset.columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataset.rows.slice(0, 10).map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => {
              const diff = findDiff(r, c);

              if (!diff) {
                return <td key={c}>{String(cell ?? "")}</td>;
              }

              return (
                <td
                  key={c}
                  style={{
                    background: "#fff3cd",
                    fontFamily: "monospace",
                  }}
                >
                  <div style={{ color: "#b00020" }}>
                    {String(diff.before ?? "")}
                  </div>
                  <div style={{ color: "#0a7f2e" }}>
                    {String(diff.after ?? "")}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
