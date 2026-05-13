import { format } from "date-fns";
import type { LeaveRecord } from "./types";

export function exportToCsv(records: LeaveRecord[], year: number): void {
  const header = "Start Date,End Date,Days,Type,Source,Reason";
  const rows = records.map((r) => {
    const startDate = format(new Date(r.startDate), "yyyy-MM-dd");
    const endDate = format(new Date(r.endDate), "yyyy-MM-dd");
    const reason = `"${r.reason.replace(/"/g, '""')}"`;
    return `${startDate},${endDate},${r.days},${r.type},${r.source},${reason}`;
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `leave-history-${year}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
