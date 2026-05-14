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
  format,
} from "date-fns";
import type { LeaveRecord, LeaveType } from "./types";

export const MONTHLY_ACCRUAL = 2.5;
export const MAX_CARRY_OVER = 5;

/**
 * Count business days (Mon-Fri, excluding holidays) between two dates, inclusive.
 */
export function countBusinessDays(
  startDate: string,
  endDate: string,
  holidays?: Set<string>
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isBefore(end, start)) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => {
    if (isWeekend(d)) return false;
    if (holidays?.has(format(d, "yyyy-MM-dd"))) return false;
    return true;
  }).length;
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

export const HALF_MONTH_ACCRUAL = 1.25;

export type EmploymentStatus = "regular" | "probationary";

/**
 * Get accrual amount for a specific month based on employment status and start date.
 * - Regular: always 2.5
 * - Probationary:
 *   - Before start month: 0
 *   - Start month, started on/before 15th: 2.5
 *   - Start month, started after 15th: 1.25
 *   - After start month: 2.5
 */
function getMonthAccrual(
  monthIndex: number,
  year: number,
  employmentStatus: EmploymentStatus,
  employeeStartDate: string | null | undefined
): number {
  if (employmentStatus === "regular") return MONTHLY_ACCRUAL;

  if (!employeeStartDate) return 0;

  const start = parseISO(employeeStartDate);
  const startYear = getYear(start);
  const startMonth = getMonth(start);
  const startDay = getDate(start);

  if (startYear > year) return 0;
  if (startYear < year) return MONTHLY_ACCRUAL;
  if (monthIndex < startMonth) return 0;
  if (monthIndex === startMonth) {
    return startDay <= 15 ? MONTHLY_ACCRUAL : HALF_MONTH_ACCRUAL;
  }
  return MONTHLY_ACCRUAL;
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
    total += getMonthAccrual(m, year, employmentStatus, employeeStartDate);
  }
  return total;
}

export function calculateCarryOver(remainingFromLastYear: number): number {
  return Math.min(remainingFromLastYear, MAX_CARRY_OVER);
}

/**
 * Check if carry-over leaves have expired.
 * Carry-over can only be used until March 31 of the current year.
 */
export function isCarryOverExpired(year: number, referenceDate: Date): boolean {
  const cutoff = new Date(year, 2, 31); // March 31
  return referenceDate > cutoff;
}

export function getAvailableLeaves(
  carryOver: number,
  year: number,
  usedLeaves: number,
  referenceDate: Date,
  employmentStatus: EmploymentStatus = "regular",
  employeeStartDate?: string | null,
  carryOverUsed: number = 0
): number {
  const accrued = getAccruedLeaves(year, referenceDate, employmentStatus, employeeStartDate);
  const expired = isCarryOverExpired(year, referenceDate);

  if (expired) {
    // After March 31: carry-over is gone, only count current year leaves
    const currentYearUsed = usedLeaves - carryOverUsed;
    return accrued - currentYearUsed;
  }

  // Before March 31: full carry-over + accrued - all used
  return calculateCarryOver(carryOver) + accrued - usedLeaves;
}

export function getRemainingCarryOver(
  carryOver: number,
  records: LeaveRecord[],
  year?: number,
  referenceDate?: Date
): number {
  // If carry-over has expired, nothing remains
  if (year && referenceDate && isCarryOverExpired(year, referenceDate)) {
    return 0;
  }
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
    totalAccrual += getMonthAccrual(m, year, employmentStatus, employeeStartDate);
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
    const monthAccrual = getMonthAccrual(index, year, employmentStatus, employeeStartDate);
    const accrued = index < completedMonths ? monthAccrual : 0;
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
      noAccrual: index < completedMonths && monthAccrual === 0,
      isPartialAccrual: index < completedMonths && monthAccrual === HALF_MONTH_ACCRUAL,
    };
  });
}
