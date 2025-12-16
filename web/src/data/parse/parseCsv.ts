import Papa from "papaparse";
import type { Dataset } from "../model";

export function parseCsv(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as string[][];
        const [header, ...rows] = data;

        resolve({
          columns: header,
          rows,
        });
      },
      error: reject,
    });
  });
}
