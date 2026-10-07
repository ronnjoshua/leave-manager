import type { LeaveStatus, LeaveType } from "@/lib/types";
import {
  getDescendantDepartmentIds,
  type DepartmentNode,
} from "@/lib/departments";
import { canonicalizeEmailIdentity } from "@/lib/email-identity";

export { canonicalizeEmailIdentity } from "@/lib/email-identity";

export interface AdminLeave {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  startDate: string;
  endDate: string;
  days: number;
  type: LeaveType | string;
  reason: string;
  status: LeaveStatus;
  halfDay: "AM" | "PM" | null;
}

export interface AdminLeaveFilters {
  employee: string;
  status: LeaveStatus | "all";
  type: string;
  search: string;
  fromDate?: string;
  toDate?: string;
}

export type AdminLeaveDayStatus = LeaveStatus | "mixed";

export interface AdminLeaveDailyTotal {
  date: string;
  actualPeople: number;
  plannedPeople: number;
}

export interface AdminLeaveEmployeeDayRow {
  email: string;
  name: string | null;
  days: Record<string, AdminLeaveDayStatus>;
  halfDays: Record<string, "AM" | "PM">;
}

export type DepartmentEmployee = {
  email: string;
  departmentId: string | null;
};

export function buildAdminLeaveRequestUrl(
  year: number,
  departmentId: string
): string {
  const searchParams = new URLSearchParams({
    year: String(year),
    departmentId,
  });
  return `/api/admin/leaves?${searchParams.toString()}`;
}

export function getAdminLeaveAvailableYears(
  currentYear: number,
  selectedYear: number,
  recordYears: number[]
): number[] {
  return Array.from(new Set([currentYear, selectedYear, ...recordYears])).sort(
    (left, right) => right - left
  );
}

export function filterEmployeesForDepartment<T extends DepartmentEmployee>(
  departments: DepartmentNode[],
  employees: T[],
  departmentId: string
): T[] {
  if (departmentId === "all") return employees;

  const includedDepartmentIds = new Set(
    getDescendantDepartmentIds(departments, departmentId)
  );
  return employees.filter(
    (employee) =>
      employee.departmentId !== null &&
      includedDepartmentIds.has(employee.departmentId)
  );
}

export function getAdminLeaveDayPeople(leaves: AdminLeave[], date: string) {
  return leaves
    .filter((leave) => leave.startDate <= date && leave.endDate >= date)
    .map((leave) => ({
      name: leave.name ?? leave.email,
      email: leave.email,
      type: leave.type,
      status: leave.status,
    }));
}

export function resolveAdminLeaveName(
  customName: string | null | undefined,
  providerName: string | null | undefined,
  email: string
): string {
  return customName?.trim() || providerName?.trim() || email;
}

function getYearDateBounds(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

function getLeaveDatesInYear(leave: AdminLeave, year: number): string[] {
  const bounds = getYearDateBounds(year);
  const start = leave.startDate > bounds.start ? leave.startDate : bounds.start;
  const end = leave.endDate < bounds.end ? leave.endDate : bounds.end;
  if (start > end) return [];

  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const finalDate = new Date(`${end}T00:00:00Z`);
  while (cursor <= finalDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function getAllDatesInYear(year: number): string[] {
  return getLeaveDatesInYear(
    {
      id: "year",
      userId: "year",
      email: "year@example.com",
      name: "Year",
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      days: 0,
      type: "Vacation",
      reason: "",
      status: "actual",
      halfDay: null,
    },
    year
  );
}

export function getAdminLeaveDailyTotals(
  leaves: AdminLeave[],
  year: number
): AdminLeaveDailyTotal[] {
  const totals = new Map<string, { actual: Set<string>; planned: Set<string> }>();
  for (const date of getAllDatesInYear(year)) {
    totals.set(date, { actual: new Set(), planned: new Set() });
  }

  for (const leave of leaves) {
    for (const date of getLeaveDatesInYear(leave, year)) {
      const day = totals.get(date);
      if (!day) continue;
      day[leave.status].add(canonicalizeEmailIdentity(leave.email));
    }
  }

  return Array.from(totals, ([date, day]) => ({
    date,
    actualPeople: day.actual.size,
    plannedPeople: day.planned.size,
  }));
}

export function getAdminLeaveEmployeeDayRows(
  leaves: AdminLeave[],
  year: number
): AdminLeaveEmployeeDayRow[] {
  const rows = new Map<string, AdminLeaveEmployeeDayRow>();

  for (const leave of leaves) {
    const email = canonicalizeEmailIdentity(leave.email);
    const row = rows.get(email) ?? { email, name: leave.name, days: {}, halfDays: {} };
    if (!row.name && leave.name) row.name = leave.name;

    for (const date of getLeaveDatesInYear(leave, year)) {
      const currentStatus = row.days[date];
      row.days[date] =
        currentStatus && currentStatus !== leave.status ? "mixed" : leave.status;
      if (leave.halfDay && !currentStatus) {
        row.halfDays[date] = leave.halfDay;
      } else if (currentStatus && currentStatus !== leave.status) {
        delete row.halfDays[date];
      }
    }
    rows.set(email, row);
  }

  return Array.from(rows.values()).sort((left, right) =>
    (left.name ?? left.email).localeCompare(right.name ?? right.email)
  );
}

export function filterAdminLeaves(
  leaves: AdminLeave[],
  filters: AdminLeaveFilters
): AdminLeave[] {
  const search = filters.search.trim().toLowerCase();

  return leaves.filter((leave) => {
    const employeeMatch =
      filters.employee === "all" ||
      canonicalizeEmailIdentity(leave.email) ===
        canonicalizeEmailIdentity(filters.employee);
    const statusMatch =
      filters.status === "all" || leave.status === filters.status;
    const typeMatch = filters.type === "all" || leave.type === filters.type;
    const searchMatch =
      !search ||
      [leave.name, leave.email, leave.type, leave.reason]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
    const rangeMatch =
      (!filters.fromDate || leave.endDate >= filters.fromDate) &&
      (!filters.toDate || leave.startDate <= filters.toDate);

    return employeeMatch && statusMatch && typeMatch && searchMatch && rangeMatch;
  });
}

export function paginateAdminLeaves<T>(
  records: T[],
  requestedPage: number,
  pageSize: number
) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalRecords = records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / safePageSize));
  const page = Math.min(
    totalPages,
    Math.max(1, Math.floor(requestedPage))
  );
  const start = (page - 1) * safePageSize;

  return {
    records: records.slice(start, start + safePageSize),
    page,
    pageSize: safePageSize,
    totalPages,
    totalRecords,
  };
}

export function summarizeAdminLeaves(leaves: AdminLeave[]) {
  return {
    totalDays: leaves.reduce((total, leave) => total + leave.days, 0),
    actualDays: leaves
      .filter((leave) => leave.status === "actual")
      .reduce((total, leave) => total + leave.days, 0),
    plannedDays: leaves
      .filter((leave) => leave.status === "planned")
      .reduce((total, leave) => total + leave.days, 0),
    peopleCount: new Set(leaves.map((leave) => leave.userId)).size,
  };
}
