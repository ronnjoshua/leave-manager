import {
  getMonth,
  getYear,
  endOfMonth,
  isBefore,
  isEqual,
  eachDayOfInterval,
  isWeekend,
  parseISO,
} from "date-fns";
import type { LeaveRecord, LeaveType } from "./types";

export const MONTHLY_ACCRUAL = 2.5;
export const MAX_CARRY_OVER = 6;

/**
 * Count business days (Mon-Fri) between two dates, inclusive.
 */
export function countBusinessDays(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isBefore(end, start)) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => !isWeekend(d)).length;
}

/**
 * Calculate how many months have been completed in the given year
 * relative to the reference date.
 */
export function getCompletedMonths(year: number, referenceDate: Date): number {
  const refYear = getYear(referenceDate);
  if (refYear < year) return 0;
  if (refYear > year) return 12;

  const refMonth = getMonth(referenceDate);
  const lastDayOfCurrentMonth = endOfMonth(referenceDate);

  const isEndOfMo =
    isEqual(referenceDate, lastDayOfCurrentMonth) ||
    isBefore(lastDayOfCurrentMonth, referenceDate);

  return isEndOfMo ? refMonth + 1 : refMonth;
}

export function getAccruedLeaves(year: number, referenceDate: Date): number {
  return getCompletedMonths(year, referenceDate) * MONTHLY_ACCRUAL;
}

export function calculateCarryOver(remainingFromLastYear: number): number {
  return Math.min(remainingFromLastYear, MAX_CARRY_OVER);
}

export function getAvailableLeaves(
  carryOver: number,
  year: number,
  usedLeaves: number,
  referenceDate: Date
): number {
  const accrued = getAccruedLeaves(year, referenceDate);
  return calculateCarryOver(carryOver) + accrued - usedLeaves;
}

export function getRemainingCarryOver(
  carryOver: number,
  records: LeaveRecord[]
): number {
  const cappedCarryOver = calculateCarryOver(carryOver);
  const usedFromCarryOver = records
    .filter((r) => r.source === "Carry-over")
    .reduce((sum, r) => sum + r.days, 0);
  return Math.max(cappedCarryOver - usedFromCarryOver, 0);
}

export function getTotalPossibleLeaves(carryOver: number): number {
  return calculateCarryOver(carryOver) + 12 * MONTHLY_ACCRUAL;
}

export function calculateEndOfYearBalance(
  carryOver: number,
  totalUsed: number
): number {
  const accrued = 12 * MONTHLY_ACCRUAL;
  return Math.max(calculateCarryOver(carryOver) + accrued - totalUsed, 0);
}

/**
 * Forecast: projected remaining leaves by end of year assuming no more usage.
 */
export function getEndOfYearForecast(
  carryOver: number,
  totalUsed: number
): number {
  return calculateEndOfYearBalance(carryOver, totalUsed);
}

/**
 * Breakdown of usage by leave type.
 */
export function getLeaveTypeSummary(
  records: LeaveRecord[]
): { type: LeaveType; days: number }[] {
  const map = new Map<LeaveType, number>();
  for (const r of records) {
    map.set(r.type, (map.get(r.type) ?? 0) + r.days);
  }
  return Array.from(map.entries())
    .map(([type, days]) => ({ type, days }))
    .sort((a, b) => b.days - a.days);
}

/**
 * Monthly breakdown of accrual and usage.
 */
export function getMonthlyBreakdown(
  year: number,
  carryOver: number,
  records: LeaveRecord[],
  referenceDate: Date
) {
  const completedMonths = getCompletedMonths(year, referenceDate);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  let runningBalance = calculateCarryOver(carryOver);

  return months.map((name, index) => {
    const monthRecords = records.filter((r) => {
      const d = new Date(r.startDate);
      return d.getMonth() === index && d.getFullYear() === year;
    });
    const used = monthRecords.reduce((sum, r) => sum + r.days, 0);
    const accrued = index < completedMonths ? MONTHLY_ACCRUAL : 0;
    runningBalance += accrued - used;

    return {
      month: name,
      index,
      accrued,
      used,
      balance: runningBalance,
      isCompleted: index < completedMonths,
      isCurrent:
        index === getMonth(referenceDate) &&
        getYear(referenceDate) === year,
    };
  });
}
