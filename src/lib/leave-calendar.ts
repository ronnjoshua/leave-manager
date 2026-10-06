import type { LeaveStatus } from "@/lib/types";

export type CalendarNavigationAction = "previous" | "next" | "today";

export function getCalendarNavigationMonth(
  currentMonth: Date,
  action: CalendarNavigationAction,
  yearConstraint?: number,
  today = new Date()
): Date {
  const normalizedCurrentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const targetMonth =
    action === "today"
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + (action === "next" ? 1 : -1),
          1
        );

  if (
    yearConstraint !== undefined &&
    targetMonth.getFullYear() !== yearConstraint
  ) {
    return normalizedCurrentMonth.getFullYear() === yearConstraint
      ? normalizedCurrentMonth
      : new Date(yearConstraint, 0, 1);
  }
  return targetMonth;
}

export function getCalendarLeaveGroups<T extends { status: LeaveStatus }>(
  leaves: T[],
  status?: LeaveStatus
) {
  const actualLeaves =
    status === "planned"
      ? []
      : leaves.filter((leave) => leave.status === "actual");
  const plannedLeaves =
    status === "actual"
      ? []
      : leaves.filter((leave) => leave.status === "planned");

  return {
    actualLeaves,
    plannedLeaves,
    visibleLeaves: [...actualLeaves, ...plannedLeaves],
  };
}

export function getCalendarOwnerLeaves<
  T extends { personName?: string | null; personEmail?: string },
>(leaves: T[]): T[] {
  return leaves.filter(
    (leave) =>
      Boolean(leave.personName?.trim()) || Boolean(leave.personEmail?.trim())
  );
}
