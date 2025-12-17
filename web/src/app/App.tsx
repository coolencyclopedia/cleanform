import { useState } from "react";
import { useEffect } from "react";

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
  const [rawDataset, setRawDataset] = useState<Dataset | null>(null);
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    size: number;
  } | null>(null);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }  

  useEffect(() => {
    if (!rawDataset || rawDataset.rows.length === 0) {
      setDataset(null);
      return;
    }
  
    let next: Dataset;
  
    if (hasHeader) {
      next = {
        columns: rawDataset.rows[0].map(
          (cell, i) => String(cell ?? `Column ${i + 1}`)
        ),
        rows: rawDataset.rows.slice(1),
      };
    } else {
      next = {
        columns: rawDataset.rows[0].map(
          (_, i) => `Column ${i + 1}`
        ),
        rows: rawDataset.rows,
      };
    }
  
    setDataset(next);
    recomputeIssues(next);
    setEnabled([]);
    setDiffs([]);
    setUndoStack([]);
  }, [rawDataset, hasHeader]);  

  /* ---------- file upload ---------- */

  async function onFile(file: File) {
    setIsLoading(true);
    setFileMeta({
      name: file.name,
      size: file.size,
    });
  
    try {
      let data: Dataset;
  
      if (file.name.endsWith(".csv")) {
        data = await parseCsv(file);
      } else if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
      ) {
        data = await parseExcel(file);
      } else {
        alert("Unsupported file type");
        return;
      }
  
      setRawDataset(data);
      setHasHeader(true); // default assumption
    } finally {
      setIsLoading(false);
    }
  }  

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

  /* ---------- preview logic ---------- */

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
    if (!dataset) return;
    setEnabled([]);
    setDiffs([]);
  }

  function clearColumnPreviews(columnIndex: number) {
    if (!dataset) return;

    const next = enabled.filter(
      (r) => r.columnIndex !== columnIndex
    );

    setEnabled(next);
    setDiffs(previewDiff(dataset, next));
  }

  /* ---------- apply & undo ---------- */

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

    const columnRules = enabled.filter(
      (r) => r.columnIndex === columnIndex
    );

    if (columnRules.length === 0) return;

    setUndoStack((prev) => [...prev, dataset]);

    const nextDataset = applyRules(dataset, columnRules);
    setDataset(nextDataset);
    recomputeIssues(nextDataset);

    const remaining = enabled.filter(
      (r) => r.columnIndex !== columnIndex
    );

    setEnabled(remaining);
    setDiffs(previewDiff(nextDataset, remaining));
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

  /* ---------- helpers ---------- */

  function isRuleActive(issue: Issue) {
    return enabled.some((r) => r.id === issue.id);
  }

  function activeCountForColumn(columnIndex: number) {
    return enabled.filter(
      (r) => r.columnIndex === columnIndex
    ).length;
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

          {rawDataset && (
            <label className="header-toggle">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
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
              const activeCount = activeCountForColumn(
                group.columnIndex
              );

              return (
                <div
                  key={group.columnIndex}
                  className="rule-group"
                >
                  <div className="rule-group-title">
                    {dataset?.columns[group.columnIndex] ??
                      `Column ${group.columnIndex}`}

                    {activeCount > 0 && (
                      <span className="badge">
                        {activeCount}
                      </span>
                    )}
                  </div>

                  {activeCount > 0 && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="secondary"
                        onClick={() =>
                          applyColumn(group.columnIndex)
                        }
                      >
                        Apply column
                      </button>

                      <button
                        className="secondary"
                        onClick={() =>
                          clearColumnPreviews(
                            group.columnIndex
                          )
                        }
                      >
                        Clear previews
                      </button>
                    </div>
                  )}

                  {group.issues.map((issue) => {
                    const active = isRuleActive(issue);

                    return (
                      <div
                        key={issue.id}
                        className="rule"
                      >
                        <span>{issue.description}</span>
                        <button
                          type="button"
                          className={
                            active ? "rule-active" : ""
                          }
                          onClick={() =>
                            togglePreview(issue)
                          }
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
                <div
                  style={{
                    padding: 24,
                    color: "#94a3b8",
                  }}
                >
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
                        "cleaned.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
