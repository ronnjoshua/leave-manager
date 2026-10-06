import type { LeaveStatus } from "@/lib/types";

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
