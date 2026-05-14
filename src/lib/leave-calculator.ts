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

export type EmploymentStatus = "regular" | "probationary";

/**
 * Check if a month qualifies for accrual based on employment status and start date.
 * - Regular: always gets 2.5/month for all completed months
 * - Probationary: only gets 2.5 if started on or before the 15th of that month
 */
function monthQualifiesForAccrual(
  monthIndex: number,
  year: number,
  employmentStatus: EmploymentStatus,
  employeeStartDate: string | null | undefined
): boolean {
  // Regular employees always qualify
  if (employmentStatus === "regular") return true;

  // Probationary without start date — can't calculate, assume no accrual
  if (!employeeStartDate) return false;

  const start = parseISO(employeeStartDate);
  const startYear = getYear(start);
  const startMonth = getMonth(start);
  const startDay = getDate(start);

  if (startYear > year) return false;
  if (startYear < year) return true;
  if (monthIndex < startMonth) return false;
  if (monthIndex === startMonth) return startDay <= 15;
  return true;
}

/**
 * Total leaves accrued so far this year, considering employment status.
 */
export function getAccruedLeaves(
  year: number,
  referenceDate: Date,
  employmentStatus: EmploymentStatus = "regular",
  employeeStartDate?: string | null
): number {
  const completedMonths = getCompletedMonths(year, referenceDate);
  let total = 0;
  for (let m = 0; m < completedMonths; m++) {
    if (monthQualifiesForAccrual(m, year, employmentStatus, employeeStartDate)) {
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
  employmentStatus: EmploymentStatus = "regular",
  employeeStartDate?: string | null
): number {
  const accrued = getAccruedLeaves(year, referenceDate, employmentStatus, employeeStartDate);
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
 * Total possible leaves for the full year.
 */
export function getTotalPossibleLeaves(
  carryOver: number,
  employmentStatus: EmploymentStatus = "regular",
  employeeStartDate?: string | null
): number {
  let totalAccrual = 0;
  const year = new Date().getFullYear();
  for (let m = 0; m < 12; m++) {
    if (monthQualifiesForAccrual(m, year, employmentStatus, employeeStartDate)) {
      totalAccrual += MONTHLY_ACCRUAL;
    }
  }
  return calculateCarryOver(carryOver) + totalAccrual;
}

export function calculateEndOfYearBalance(
  carryOver: number,
  totalUsed: number,
  employmentStatus: EmploymentStatus = "regular",
  employeeStartDate?: string | null
): number {
  const totalPossible = getTotalPossibleLeaves(carryOver, employmentStatus, employeeStartDate);
  return Math.max(totalPossible - totalUsed, 0);
}

export function getEndOfYearForecast(
  carryOver: number,
  totalUsed: number,
  employmentStatus: EmploymentStatus = "regular",
  employeeStartDate?: string | null
): number {
  return calculateEndOfYearBalance(carryOver, totalUsed, employmentStatus, employeeStartDate);
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
  employmentStatus: EmploymentStatus = "regular",
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
    const qualifies = monthQualifiesForAccrual(index, year, employmentStatus, employeeStartDate);
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
