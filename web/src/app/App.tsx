import { useState } from "react";
import { parseCsv } from "../data/parse/parseCsv";
import { detectWhitespace } from "../data/detect/whitespace";
import { applyRules } from "../data/apply/applyRules";
import type { Dataset, Issue, EnabledRule } from "../data/model";

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [enabled, setEnabled] = useState<EnabledRule[]>([]);

  async function onFile(file: File) {
    const data = await parseCsv(file);
    setDataset(data);
    setIssues(detectWhitespace(data));
    setEnabled([]);
  }

  function enableIssue(issue: Issue) {
    setEnabled((prev) => [
      ...prev,
      {
        id: issue.id,
        type: issue.type,
        columnIndex: issue.columnIndex,
        apply: issue.preview,
      },
    ]);
  }

  function applyAll() {
    if (!dataset) return;
    const next = applyRules(dataset, enabled);
    setDataset(next);
    setIssues(detectWhitespace(next));
    setEnabled([]);
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />

      <h3>Detected Issues</h3>
      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            Column {issue.columnIndex}: {issue.description} (
            {issue.rowIndices.length} rows)
            <button
              style={{ marginLeft: 8 }}
              onClick={() => enableIssue(issue)}
            >
              Enable
            </button>
          </li>
        ))}
      </ul>

      {enabled.length > 0 && (
        <button onClick={applyAll}>
          Apply {enabled.length} Rules
        </button>
      )}

      {dataset && (
        <>
          <h3>Preview (first 5 rows)</h3>
          <table border={1} cellPadding={4}>
            <thead>
              <tr>
                {dataset.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.rows.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{String(cell ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
