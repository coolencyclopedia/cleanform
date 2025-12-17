import Papa from "papaparse";
import type { Dataset } from "@cleanform/shared";
import { detectHeaderRow } from "../detect/detectHeaderRow";

export function parseCsv(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as string[][];

        if (!data.length) {
          resolve({ columns: [], rows: [] });
          return;
        }

        const [first, second, ...rest] = data;

        const hasHeader = detectHeaderRow(first, second);

        const columns = hasHeader
          ? first.map(String)
          : first.map((_, i) => `Column ${i + 1}`);

        const rows = hasHeader
          ? [second, ...rest]
          : [first, second, ...rest];

          resolve({
            columns,
            rows,
          });          
      },
      error: reject,
    });
  });
}
