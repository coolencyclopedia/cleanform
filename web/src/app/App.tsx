import { useState } from "react";
import { parseCsv } from "../data/parse/parseCsv";
import { detectWhitespace } from "../data/detect/whitespace";
import { applyRules } from "../data/apply/applyRules";
import { previewDiff } from "../data/apply/previewDiff";
import type {
  Dataset,
  Issue,
  EnabledRule,
  CellDiff,
} from "../data/model";
import TablePreview from "../ui/TablePreview";

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [enabled, setEnabled] = useState<EnabledRule[]>([]);
  const [diffs, setDiffs] = useState<CellDiff[]>([]);

  async function onFile(file: File) {
    const data = await parseCsv(file);
    setDataset(data);
    setIssues(detectWhitespace(data));
    setEnabled([]);
    setDiffs([]);
  }

  function enableIssue(issue: Issue) {
    const rule: EnabledRule = {
      id: issue.id,
      type: issue.type,
      columnIndex: issue.columnIndex,
      apply: issue.preview,
    };

    const nextEnabled = [...enabled, rule];
    setEnabled(nextEnabled);

    if (dataset) {
      setDiffs(previewDiff(dataset, nextEnabled));
    }
  }

  function applyAll() {
    if (!dataset) return;

    const next = applyRules(dataset, enabled);
    setDataset(next);
    setIssues(detectWhitespace(next));
    setEnabled([]);
    setDiffs([]);
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
              Preview
            </button>
          </li>
        ))}
      </ul>

      {dataset && (
        <>
          <h3>Preview (first 10 rows)</h3>
          <TablePreview dataset={dataset} diffs={diffs} />
        </>
      )}

      {enabled.length > 0 && (
        <button
          style={{ marginTop: 12 }}
          onClick={applyAll}
        >
          Apply {enabled.length} Rules
        </button>
      )}
    </div>
  );
}
