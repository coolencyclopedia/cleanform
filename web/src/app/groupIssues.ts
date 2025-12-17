import type { Issue } from "@cleanform/shared";

export interface ColumnIssues {
  columnIndex: number;
  issues: Issue[];
}

export function groupIssuesByColumn(
  issues: Issue[]
): ColumnIssues[] {
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
