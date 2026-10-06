import test from "node:test";
import assert from "node:assert/strict";
import {
  filterAdminLeaves,
  getAdminLeaveDayPeople,
  summarizeAdminLeaves,
  type AdminLeave,
} from "../src/lib/admin-leaves";

const leaves: AdminLeave[] = [
  {
    id: "1",
    userId: "u1",
    email: "ana@example.com",
    name: "Ana",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    days: 3,
    type: "Vacation",
    reason: "Trip",
    status: "planned",
    halfDay: null,
  },
  {
    id: "2",
    userId: "u2",
    email: "ben@example.com",
    name: "Ben",
    startDate: "2026-06-15",
    endDate: "2026-06-15",
    days: 1,
    type: "Sick",
    reason: "Illness",
    status: "actual",
    halfDay: null,
  },
];

test("filters consolidated leaves by employee and status", () => {
  assert.deepEqual(
    filterAdminLeaves(leaves, {
      employee: "ana@example.com",
      status: "planned",
      type: "all",
      search: "",
    }).map((leave) => leave.id),
    ["1"]
  );
});

test("summarizes actual and planned days separately", () => {
  assert.deepEqual(summarizeAdminLeaves(leaves), {
    totalDays: 4,
    actualDays: 1,
    plannedDays: 3,
    peopleCount: 2,
  });
});

test("lists each person and leave type for a calendar day", () => {
  assert.deepEqual(
    getAdminLeaveDayPeople(leaves, "2026-06-10"),
    [{ name: "Ana", email: "ana@example.com", type: "Vacation", status: "planned" }]
  );
});
