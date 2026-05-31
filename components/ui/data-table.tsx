"use client";

import type { ReactNode } from "react";

type DataTableColumn<T> = {
  header: string;
  accessorKey: keyof T | string;
  cell?: (info: { getValue: () => unknown; row: { original: T } }) => ReactNode;
};

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((column) => (
              <th key={String(column.accessorKey)} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                No records found.
              </td>
            </tr>
          ) : data.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => {
                const value = row[column.accessorKey as keyof T];
                return (
                  <td key={String(column.accessorKey)} className="px-4 py-3 align-top">
                    {column.cell ? column.cell({ getValue: () => value, row: { original: row } }) : String(value ?? "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
