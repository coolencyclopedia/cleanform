import { useState } from "react";

import { parseCsv } from "../data/parse/parseCsv";
import { detectWhitespace } from "../data/detect/whitespace";
import { detectEmptyToNull } from "../data/detect/emptyToNull";
import { applyRules } from "../data/apply/applyRules";
import { previewDiff } from "../data/apply/previewDiff";
import { exportCsv } from "../data/export/exportCsv";
import { exportJson } from "../data/export/exportJson";
import { downloadFile } from "../utils/download";

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

  // ---- File upload ----
  async function onFile(file: File) {
    const data = await parseCsv(file);

    setDataset(data);

    // 🔴 A) DETECT HERE (initial load)
    setIssues([
      ...detectWhitespace(data),
      ...detectEmptyToNull(data),
    ]);

    setEnabled([]);
    setDiffs([]);
  }

  // ---- Enable rule preview (prevent double-enable) ----
  function enableIssue(issue: Issue) {
    if (enabled.some((r) => r.id === issue.id)) return;

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

  // ---- Apply enabled rules ----
  function applyAll() {
    if (!dataset || enabled.length === 0) return;

    const next = applyRules(dataset, enabled);

    setDataset(next);

    // 🔴 B) DETECT AGAIN AFTER APPLY
    setIssues([
      ...detectWhitespace(next),
      ...detectEmptyToNull(next),
    ]);

    setEnabled([]);
    setDiffs([]);
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      {/* Upload */}
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />

      {/* Detected issues */}
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

      {/* Diff preview */}
      {dataset && (
        <>
          <h3>Preview (first 10 rows)</h3>
          <TablePreview dataset={dataset} diffs={diffs} />
        </>
      )}

      {/* Apply */}
      {enabled.length > 0 && (
        <button
          style={{ marginTop: 12 }}
          onClick={applyAll}
        >
          Apply {enabled.length} Rules
        </button>
      )}

      {/* Export */}
      {dataset && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() =>
              downloadFile(
                exportCsv(dataset),
                "cleaned.csv",
                "text/csv"
              )
            }
          >
            Export CSV
          </button>

          <button
            style={{ marginLeft: 8 }}
            onClick={() =>
              downloadFile(
                exportJson(dataset),
                "cleaned.json",
                "application/json"
              )
            }
          >
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
