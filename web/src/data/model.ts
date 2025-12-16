// Shared core data model (browser + worker safe)

export type CellValue = string | number | null;

export type Row = CellValue[];

export interface Dataset {
  columns: string[];
  rows: Row[];
}

export type RuleType =
  | "TRIM_WHITESPACE"
  | "EMPTY_TO_NULL"
  | "NORMALIZE_CASE"
  | "PARSE_NUMBER"
  | "PARSE_DATE"
  | "DEDUPLICATE";

export interface Issue {
  id: string;
  type: RuleType;
  columnIndex: number;
  rowIndices: number[];
  description: string;
  preview: (value: CellValue) => CellValue;
}

export interface EnabledRule {
  id: string;
  type: RuleType;
  columnIndex: number;
  apply: (value: CellValue) => CellValue;
}

export interface CellDiff {
    rowIndex: number;
    columnIndex: number;
    before: CellValue;
    after: CellValue;
  }
  