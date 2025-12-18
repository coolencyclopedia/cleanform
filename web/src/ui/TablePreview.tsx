import { useEffect, useState } from "react";
import type { Dataset, CellDiff } from "@cleanform/shared";

const DEFAULT_COL_WIDTH = 160;
const MIN_COL_WIDTH = 80;

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;
ctx.font =
  "14px ui-sans-serif, system-ui, -apple-system";

function measure(text: string) {
  return ctx.measureText(text).width;
}

export default function TablePreview({
  dataset,
  diffs,
}: {
  dataset: Dataset;
  diffs: CellDiff[];
}) {
  const [widths, setWidths] = useState<number[]>(
    () => dataset.columns.map(() => DEFAULT_COL_WIDTH)
  );

  useEffect(() => {
    setWidths(dataset.columns.map(() => DEFAULT_COL_WIDTH));
  }, [dataset.columns]);

  useEffect(() => {
    return () => {
      window.onmousemove = null;
      window.onmouseup = null;
    };
  }, []);

  function diffAt(rowIndex: number, columnIndex: number) {
    return diffs.find(
      (d) =>
        d.rowIndex === rowIndex &&
        d.columnIndex === columnIndex
    );
  }
  
  function startResize(
    e: React.MouseEvent,
    index: number
  ) {
    e.preventDefault();
    const startX = e.clientX;
    const start = widths[index];

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      setWidths((w) =>
        w.map((x, i) =>
          i === index
            ? Math.max(
                MIN_COL_WIDTH,
                start + delta
              )
            : x
        )
      );
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function autoFit(index: number) {
    let max = measure(dataset.columns[index] ?? "");

    for (const row of dataset.rows) {
      const cell = row[index];
      if (cell != null) {
        max = Math.max(max, measure(String(cell)));
      }
    }

    setWidths((w) =>
      w.map((x, i) =>
        i === index
          ? Math.min(
              520,
              Math.max(MIN_COL_WIDTH, max + 48)
            )
          : x
      )
    );
  }

  const grid = widths.map((w) => `${w}px`).join(" ");

  return (
    <div className="table-scroll">
      <div className="table-grid-wrapper">
        {/* header */}
        <div
          className="grid-row header-row"
          style={{ gridTemplateColumns: grid }}
        >
          {dataset.columns.map((col, i) => (
            <div
              key={i}
              className="cell header-cell"
              onDoubleClick={() => autoFit(i)}
            >
              {col}
              <div
                className="resize-handle"
                onMouseDown={(e) =>
                  startResize(e, i)
                }
              />
            </div>
          ))}
        </div>

        {/* body */}
        {dataset.rows.map((row, r) => (
          <div
            key={r}
            className="grid-row"
            style={{ gridTemplateColumns: grid }}
          >
            {row.map((cell, c) => {
              const diff = diffAt(r, c);

              return (
                <div key={c} className="cell">
                  {diff ? (
                    <div className="cell-diff">
                      <span className="cell-before">
                        {diff.before ?? ""}
                      </span>
                      <span className="cell-arrow">→</span>
                      <span className="cell-after">
                        {diff.after ?? ""}
                      </span>
                    </div>
                  ) : (
                    cell ?? ""
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
