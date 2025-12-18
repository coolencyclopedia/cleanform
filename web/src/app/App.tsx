import { useState, useEffect } from "react";

import { parseCsv } from "../data/parse/parseCsv";
import { parseExcel } from "../data/parse/parseExcel";
import { downloadFile } from "../utils/download";
import { exportExcel } from "../utils/exportExcel";

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

/* ---------- helpers ---------- */

function isSupportedFile(file: File) {
  return (
    file.type === "text/csv" ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  );
}

function isFileDrag(e: React.DragEvent) {
  return (
    e.dataTransfer.types &&
    Array.from(e.dataTransfer.types).includes("Files")
  );
}

function groupIssuesByColumn(issues: Issue[]) {
  const map = new Map<number, Issue[]>();

  for (const issue of issues) {
    const list = map.get(issue.columnIndex) ?? [];
    list.push(issue);
    map.set(issue.columnIndex, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([columnIndex, issues]) => ({
      columnIndex,
      issues,
    }));
}

/* ---------- app ---------- */

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [enabled, setEnabled] = useState<EnabledRule[]>([]);
  const [diffs, setDiffs] = useState<CellDiff[]>([]);
  const [undoStack, setUndoStack] = useState<Dataset[]>([]);

  // raw rows only (NOT a Dataset)
  const [rawRows, setRawRows] =
    useState<Dataset["rows"] | null>(null);

  const [hasHeader, setHasHeader] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [fileMeta, setFileMeta] = useState<{
    name: string;
    size: number;
  } | null>(null);

  /* ---------- drag handlers ---------- */

  function onDragOver(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    if (!isFileDrag(e)) return;

    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  /* ---------- derive dataset ---------- */

  useEffect(() => {
    // always reset dependent state on structural change
    setEnabled([]);
    setDiffs([]);
    setUndoStack([]);
  
    if (!rawRows || rawRows.length === 0) {
      setDataset(null);
      setIssues([]);
      return;
    }
  
    // header-only file
    if (hasHeader && rawRows.length === 1) {
      const next: Dataset = {
        columns: rawRows[0].map(
          (c, i) => String(c ?? `Column ${i + 1}`)
        ),
        rows: [],
      };
  
      setDataset(next);
      setIssues([]);
      return;
    }
  
    // ✅ NORMAL CASE (this is what you were missing)
    const next: Dataset = hasHeader
      ? {
          columns: rawRows[0].map(
            (c, i) => String(c ?? `Column ${i + 1}`)
          ),
          rows: rawRows.slice(1),
        }
      : {
          columns: rawRows[0].map(
            (_, i) => `Column ${i + 1}`
          ),
          rows: rawRows,
        };
  
    setDataset(next);
    recomputeIssues(next);
  }, [rawRows, hasHeader]);
  

  /* ---------- file upload ---------- */

  async function onFile(file: File) {
    setIsDragging(false);
    if (!isSupportedFile(file)) {
      alert("Unsupported file type. Please upload CSV or Excel.");
      return;
    }

    setIsLoading(true);
    setFileMeta({
      name: file.name,
      size: file.size,
    });

    try {
      const data =
        file.name.endsWith(".csv")
          ? await parseCsv(file)
          : await parseExcel(file);

      if (data.rows.length > 20000) {
        setRawRows(null);
        setDataset(null);
        alert("File too large to preview safely.");
        return;
      }
      setRawRows(data.rows);
      setHasHeader(true);
    } finally {
      setIsLoading(false);
    }
  }

  /* ---------- issues ---------- */

  function recomputeIssues(data: Dataset) {
    setIssues([
      ...detectWhitespace(data),
      ...detectEmptyToNull(data),
      ...detectNormalizeCase(data, "lower"),
      ...detectNormalizeCase(data, "upper"),
      ...detectNormalizeCase(data, "title"),
      ...detectParseNumber(data),
      ...detectParseDate(data),
    ]);
  }

  /* ---------- preview ---------- */

  function togglePreview(issue: Issue) {
    if (!dataset) return;

    const isActive = enabled.some((r) => r.id === issue.id);

    if (isActive) {
      const next = enabled.filter((r) => r.id !== issue.id);
      setEnabled(next);
      setDiffs(previewDiff(dataset, next));
      return;
    }

    let next = enabled;

    if (issue.type === "NORMALIZE_CASE") {
      next = next.filter(
        (r) =>
          !(
            r.type === "NORMALIZE_CASE" &&
            r.columnIndex === issue.columnIndex
          )
      );
    }

    next = [
      ...next,
      {
        id: issue.id,
        type: issue.type,
        columnIndex: issue.columnIndex,
        apply: issue.preview,
      },
    ];

    setEnabled(next);
    setDiffs(previewDiff(dataset, next));
  }

  function clearAllPreviews() {
    setEnabled([]);
    setDiffs([]);
  }

  function clearColumnPreviews(columnIndex: number) {
    const next = enabled.filter(
      (r) => r.columnIndex !== columnIndex
    );
    setEnabled(next);
    setDiffs(previewDiff(dataset!, next));
  }

  /* ---------- apply / undo ---------- */

  function applyAll() {
    if (!dataset || enabled.length === 0) return;

    setUndoStack((prev) => [...prev, dataset]);

    const next = applyRules(dataset, enabled);
    setDataset(next);
    recomputeIssues(next);
    setEnabled([]);
    setDiffs([]);
  }

  function applyColumn(columnIndex: number) {
    if (!dataset) return;

    const rules = enabled.filter(
      (r) => r.columnIndex === columnIndex
    );

    if (rules.length === 0) return;

    setUndoStack((prev) => [...prev, dataset]);

    const next = applyRules(dataset, rules);
    setDataset(next);
    recomputeIssues(next);

    const remaining = enabled.filter(
      (r) => r.columnIndex !== columnIndex
    );

    setEnabled(remaining);
    setDiffs(previewDiff(next, remaining));
  }

  function undoLastApply() {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;

      const last = prev[prev.length - 1];
      setDataset(last);
      recomputeIssues(last);
      setEnabled([]);
      setDiffs([]);

      return prev.slice(0, -1);
    });
  }

  /* ---------- render ---------- */

  return (
    <div
      className={`app ${isDragging ? "dragging" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="container">
        <header className="header">
          <div>
            <h1>Data Cleanup Tool</h1>
            <p>Preview and normalize messy CSV / Excel data</p>

            {fileMeta && (
              <div className="file-badge">
                <span>{fileMeta.name}</span>
                <small>
                  {(fileMeta.size / 1024).toFixed(1)} KB
                </small>
              </div>
            )}
          </div>

          {rawRows && (
            <label className="header-toggle">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) =>
                  setHasHeader(e.target.checked)
                }
              />
              <span>First row contains headers</span>
            </label>
          )}

          <label className="file-upload">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
              }}
            />
            <span>Upload CSV / Excel</span>
          </label>
        </header>

        <div className="main">
          <aside className="rules">
            {groupIssuesByColumn(issues).map((group) => {
              const hasActiveInColumn = enabled.some(
                (r) => r.columnIndex === group.columnIndex
              );

              return (
                <div
                  key={group.columnIndex}
                  className="rule-group"
                >
                  <div className="rule-group-title">
                    {dataset?.columns[group.columnIndex] ??
                      `Column ${group.columnIndex}`}
                  </div>

                  {/* ✅ PER-COLUMN ACTIONS */}
                  <div className="rule-group-actions">
                    <button
                      className="secondary small"
                      disabled={!hasActiveInColumn}
                      onClick={() =>
                        applyColumn(group.columnIndex)
                      }
                    >
                      Apply column
                    </button>

                    <button
                      className="secondary small"
                      disabled={!hasActiveInColumn}
                      onClick={() =>
                        clearColumnPreviews(group.columnIndex)
                      }
                    >
                      Clear previews
                    </button>
                  </div>

                  {/* EXISTING RULE LIST */}
                  {group.issues.map((issue) => {
                    const active = enabled.some(
                      (r) => r.id === issue.id
                    );

                    return (
                      <div
                        key={issue.id}
                        className="rule"
                      >
                        <span>{issue.description}</span>
                        <button
                          className={active ? "rule-active" : ""}
                          onClick={() => togglePreview(issue)}
                        >
                          {active ? "Active" : "Preview"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </aside>

          <section className="preview">
            {isLoading && (
              <div className="loading-overlay">
                <div className="spinner" />
                <span>Processing file…</span>
              </div>
            )}

            <div className="table-scroll">
              {dataset ? (
                <TablePreview
                  dataset={dataset}
                  diffs={diffs}
                />
              ) : (
                <div style={{ padding: 24, color: "#94a3b8" }}>
                  Upload a CSV or Excel file to see preview
                </div>
              )}
            </div>

            <div className="actions">
              {undoStack.length > 0 && (
                <button
                  className="secondary"
                  onClick={undoLastApply}
                >
                  Undo last apply
                </button>
              )}

              {enabled.length > 0 && (
                <>
                  <button
                    className="primary"
                    onClick={applyAll}
                  >
                    Apply {enabled.length} Rules
                  </button>

                  <button
                    className="secondary"
                    onClick={clearAllPreviews}
                  >
                    Remove all previews
                  </button>
                </>
              )}

              {dataset && (
                <>
                  <button
                    className="secondary"
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
                    className="secondary"
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

                  <button
                    className="secondary"
                    onClick={() =>
                      downloadFile(
                        exportExcel(dataset),
                        "cleaned.xlsx"
                      )
                    }
                  >
                    Export Excel
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
