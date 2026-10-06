import type { LeaveStatus, LeaveType } from "@/lib/types";
import {
  getDescendantDepartmentIds,
  type DepartmentNode,
} from "@/lib/departments";

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

export type DepartmentEmployee = {
  email: string;
  departmentId: string | null;
};

export function canonicalizeEmailIdentity(email: string): string {
  return email.trim().toLowerCase();
}

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
