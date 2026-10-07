import { parseISO, isBefore, isAfter, isSameDay } from "date-fns";
import type { LeaveRecord, LeaveType } from "./types";

export interface LeaveHistoryFilters {
  type: LeaveType | "all";
  fromDate: string;
  toDate: string;
}

export type LeaveHistorySortOrder = "asc" | "desc";

/**
 * Filter personal leave history by leave type and an inclusive date range.
 * Date filters match records that overlap the selected range.
 */
export function filterLeaveHistory<T extends Pick<LeaveRecord, "type" | "startDate" | "endDate">>(
  records: T[],
  filters: LeaveHistoryFilters
): T[] {
  return records.filter((record) => {
    const typeMatches = filters.type === "all" || record.type === filters.type;
    const dateRangeMatches =
      (!filters.fromDate || record.endDate >= filters.fromDate) &&
      (!filters.toDate || record.startDate <= filters.toDate);

    return typeMatches && dateRangeMatches;
  });
}

/**
 * Sort leave history by the month (and day) of each record's start date.
 * Returns a new array so callers can safely keep their source records intact.
 */
export function sortLeaveHistoryByMonth<
  T extends Pick<LeaveRecord, "startDate">,
>(records: T[], order: LeaveHistorySortOrder): T[] {
  const direction = order === "asc" ? 1 : -1;

  return [...records].sort(
    (a, b) => direction * a.startDate.localeCompare(b.startDate)
  );
}

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
