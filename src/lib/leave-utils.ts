import { parseISO, isBefore, isAfter, isSameDay } from "date-fns";
import type { LeaveRecord } from "./types";

/**
 * Check if two date ranges overlap.
 */
function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a1 = parseISO(startA);
  const a2 = parseISO(endA);
  const b1 = parseISO(startB);
  const b2 = parseISO(endB);

  return (
    (isSameDay(a1, b1) || isSameDay(a1, b2) || isSameDay(a2, b1) || isSameDay(a2, b2)) ||
    (isBefore(a1, b2) && isAfter(a2, b1))
  );
}

/**
 * Find existing records that overlap with the given date range.
 * Optionally exclude a record by ID (for editing).
 */
export function findOverlappingRecords(
  records: LeaveRecord[],
  startDate: string,
  endDate: string,
  excludeId?: string
): LeaveRecord[] {
  return records.filter((r) => {
    if (excludeId && r.id === excludeId) return false;
    return rangesOverlap(startDate, endDate, r.startDate, r.endDate);
  });
}
