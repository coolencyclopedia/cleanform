import { useEffect, useState } from "react";
import type { Dataset, CellDiff } from "@cleanform/shared";

const DEFAULT_COL_WIDTH = 160;
const MIN_COL_WIDTH = 80;
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;
const CELL_FONT =
  "14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont";

  function measureText(text: string) {
    ctx.font = CELL_FONT;
    return ctx.measureText(text).width;
  }  

interface Props {
  dataset: Dataset;
  diffs: CellDiff[];
}

export default function TablePreview({ dataset, diffs }: Props) {
  const [columnWidths, setColumnWidths] = useState<number[]>(
    () => dataset.columns.map(() => DEFAULT_COL_WIDTH)
  );

  useEffect(() => {
    setColumnWidths(
      dataset.columns.map(() => DEFAULT_COL_WIDTH)
    );
  }, [dataset.columns.length]);

  function startResize(
    e: React.MouseEvent,
    colIndex: number
  ) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[colIndex];

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      setColumnWidths((prev) =>
        prev.map((w, i) =>
          i === colIndex
            ? Math.max(MIN_COL_WIDTH, startWidth + delta)
            : w
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

  function diffAt(r: number, c: number) {
    return diffs.find(
      (d) => d.rowIndex === r && d.columnIndex === c
    );
  }

  function autoFitColumn(colIndex: number) {
    let maxWidth = measureText(
      dataset.columns[colIndex] ?? ""
    );
  
    for (let r = 0; r < dataset.rows.length; r++) {
      const cell = dataset.rows[r][colIndex];
      if (cell != null) {
        maxWidth = Math.max(
          maxWidth,
          measureText(String(cell))
        );
      }
    }
  
    const fitted = Math.min(
      520,
      Math.max(
        MIN_COL_WIDTH,
        Math.ceil(maxWidth) + 48
      )
    );
  
    setColumnWidths((prev) =>
      prev.map((w, i) =>
        i === colIndex ? fitted : w
      )
    );
  }
  
  const gridTemplate = columnWidths
    .map((w) => `${w}px`)
    .join(" ");

  return (
    <div className="table-grid-wrapper">
      {/* HEADER */}
        <div
          className="grid-row header-row"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {dataset.columns.map((col, c) => (
            <div
              key={c}
              className="cell header-cell"
              onDoubleClick={() => autoFitColumn(c)}
            >
              {col}

              <div
                className="resize-handle"
                onMouseDown={(e) => startResize(e, c)}
              />
            </div>
          ))}
        </div>


      {/* BODY */}
      {dataset.rows.map((row, r) => (
        <div
          key={r}
          className="grid-row"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {row.map((cell, c) => {
            const diff = diffAt(r, c);
            return (
              <div
                key={c}
                className={`cell ${diff ? "diff" : ""}`}
              >
                {!diff ? (
                  cell ?? ""
                ) : (
                  <>
                    <div className="before">
                      {diff.before ?? ""}
                    </div>
                    <div className="after">
                      {diff.after ?? ""}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
