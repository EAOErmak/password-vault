import type { ReactNode } from "react";

type HistoryColumn = {
  key: string;
  label: string;
};

type HistoryRow = {
  id: string;
  cells: ReactNode[];
};

type HistoryTimelineProps = {
  columns: HistoryColumn[];
  emptyMessage: string;
  rows: HistoryRow[];
};

export function HistoryTimeline({
  columns,
  emptyMessage,
  rows,
}: HistoryTimelineProps) {
  if (rows.length === 0) {
    return (
      <div className="empty-state empty-state--compact">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="history-table-wrapper">
      <table className="history-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}:${columns[index]?.key ?? index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
