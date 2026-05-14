import {
  getMonth,
  getYear,
  getDate,
  endOfMonth,
  isBefore,
  isEqual,
  eachDayOfInterval,
  isWeekend,
  parseISO,
} from "date-fns";
import type { LeaveRecord, LeaveType } from "./types";

export const MONTHLY_ACCRUAL = 2.5;
export const MAX_CARRY_OVER = 5;

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

/**
 * Check if a month qualifies for accrual based on employee start date.
 * Employee gets 2.5 for a month if:
 * - They started before or during that month, AND
 * - If they started in that exact month, they started on or before the 15th
 */
function monthQualifiesForAccrual(
  monthIndex: number,
  year: number,
  employeeStartDate: string | null | undefined
): boolean {
  if (!employeeStartDate) return true; // no start date set = full accrual

  const start = parseISO(employeeStartDate);
  const startYear = getYear(start);
  const startMonth = getMonth(start);
  const startDay = getDate(start);

  // Employee hadn't started yet in this year
  if (startYear > year) return false;

  // Employee started in a previous year — all months qualify
  if (startYear < year) return true;

  // Same year: month is before the start month — no accrual
  if (monthIndex < startMonth) return false;

  // Same year, same month — only qualifies if started on or before 15th
  if (monthIndex === startMonth) return startDay <= 15;

  // Month is after start month — qualifies
  return true;
}

/**
 * Total leaves accrued so far this year, considering employee start date.
 */
export function getAccruedLeaves(
  year: number,
  referenceDate: Date,
  employeeStartDate?: string | null
): number {
  const completedMonths = getCompletedMonths(year, referenceDate);
  let total = 0;
  for (let m = 0; m < completedMonths; m++) {
    if (monthQualifiesForAccrual(m, year, employeeStartDate)) {
      total += MONTHLY_ACCRUAL;
    }
  }
  return total;
}

export function calculateCarryOver(remainingFromLastYear: number): number {
  return Math.min(remainingFromLastYear, MAX_CARRY_OVER);
}

export function getAvailableLeaves(
  carryOver: number,
  year: number,
  usedLeaves: number,
  referenceDate: Date,
  employeeStartDate?: string | null
): number {
  const accrued = getAccruedLeaves(year, referenceDate, employeeStartDate);
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

/**
 * Total possible leaves for the full year (considering start date).
 */
export function getTotalPossibleLeaves(
  carryOver: number,
  employeeStartDate?: string | null
): number {
  let totalAccrual = 0;
  const year = new Date().getFullYear();
  for (let m = 0; m < 12; m++) {
    if (monthQualifiesForAccrual(m, year, employeeStartDate)) {
      totalAccrual += MONTHLY_ACCRUAL;
    }
  }
  return calculateCarryOver(carryOver) + totalAccrual;
}

export function calculateEndOfYearBalance(
  carryOver: number,
  totalUsed: number,
  employeeStartDate?: string | null
): number {
  const totalPossible = getTotalPossibleLeaves(carryOver, employeeStartDate);
  return Math.max(totalPossible - totalUsed, 0);
}

/**
 * Forecast: projected remaining leaves by end of year assuming no more usage.
 */
export function getEndOfYearForecast(
  carryOver: number,
  totalUsed: number,
  employeeStartDate?: string | null
): number {
  return calculateEndOfYearBalance(carryOver, totalUsed, employeeStartDate);
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
  referenceDate: Date,
  employeeStartDate?: string | null
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
    const qualifies = monthQualifiesForAccrual(index, year, employeeStartDate);
    const accrued = index < completedMonths && qualifies ? MONTHLY_ACCRUAL : 0;
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
      noAccrual: index < completedMonths && !qualifies,
    };
  });
}
