import type { LeaveStatus, LeaveType } from "@/lib/types";

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
      filters.employee === "all" || leave.email === filters.employee;
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
