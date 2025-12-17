import { useState } from "react";

import { parseCsv } from "../data/parse/parseCsv";
import { downloadFile } from "../utils/download";

import {
  detectWhitespace,
  detectEmptyToNull,
  detectNormalizeCase,
  detectParseNumber,
  detectParseDate,
  applyRules,
  previewDiff,
  exportCsv,
  exportJson,
} from "@cleanform/shared";

import type {
  Dataset,
  Issue,
  EnabledRule,
  CellDiff,
} from "@cleanform/shared";

import TablePreview from "../ui/TablePreview";

// -------- UI-only grouping --------
function groupIssuesByColumn(issues: Issue[]) {
  const map = new Map<number, Issue[]>();

  for (const issue of issues) {
    const list = map.get(issue.columnIndex) ?? [];
    list.push(issue);
    map.set(issue.columnIndex, list);
  }

  return Array.from(map.entries()).map(
    ([columnIndex, issues]) => ({
      columnIndex,
      issues,
    })
  );
}

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [enabled, setEnabled] = useState<EnabledRule[]>([]);
  const [diffs, setDiffs] = useState<CellDiff[]>([]);

  async function onFile(file: File) {
    const data = await parseCsv(file);
    setDataset(data);

    setIssues([
      ...detectWhitespace(data),
      ...detectEmptyToNull(data),
      ...detectNormalizeCase(data, "lower"),
      ...detectNormalizeCase(data, "upper"),
      ...detectNormalizeCase(data, "title"),
      ...detectParseNumber(data),
      ...detectParseDate(data),
    ]);

    setEnabled([]);
    setDiffs([]);
  }

  function enableIssue(issue: Issue) {
    // Remove existing case-normalization for same column (radio behavior)
    const filtered = enabled.filter(
      (r) =>
        !(
          r.type === "NORMALIZE_CASE" &&
          r.columnIndex === issue.columnIndex
        )
    );

    // Prevent duplicates
    if (filtered.some((r) => r.id === issue.id)) return;

    const rule: EnabledRule = {
      id: issue.id,
      type: issue.type,
      columnIndex: issue.columnIndex,
      apply: issue.preview,
    };

    const nextEnabled = [...filtered, rule];
    setEnabled(nextEnabled);

    if (dataset) {
      setDiffs(previewDiff(dataset, nextEnabled));
    }
  }

  function applyAll() {
    if (!dataset || enabled.length === 0) return;

    const next = applyRules(dataset, enabled);
    setDataset(next);

    setIssues([
      ...detectWhitespace(next),
      ...detectEmptyToNull(next),
      ...detectNormalizeCase(next, "lower"),
      ...detectNormalizeCase(next, "upper"),
      ...detectNormalizeCase(next, "title"),
      ...detectParseNumber(next),
      ...detectParseDate(next),
    ]);

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

      <h3 style={{ marginTop: 16 }}>Detected Issues</h3>

      {groupIssuesByColumn(issues).map((group) => (
        <div
          key={group.columnIndex}
          style={{
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <strong>Column {group.columnIndex}</strong>

          <ul style={{ marginTop: 8 }}>
            {group.issues.map((issue) => (
              <li
                key={issue.id}
                style={{ marginBottom: 6 }}
              >
                {issue.description} (
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
        </div>
      ))}

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
