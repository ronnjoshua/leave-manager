import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAdminLeaveRequestUrl,
  canonicalizeEmailIdentity,
  filterEmployeesForDepartment,
  filterAdminLeaves,
  getAdminLeaveAvailableYears,
  getAdminLeaveDayPeople,
  getAdminLeaveDailyTotals,
  getAdminLeaveEmployeeDayRows,
  resolveAdminLeaveName,
  paginateAdminLeaves,
  summarizeAdminLeaves,
  type AdminLeave,
} from "../src/lib/admin-leaves";
import type { DepartmentNode } from "../src/lib/departments";

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

const departments: DepartmentNode[] = [
  { id: "engineering", name: "Engineering", parentId: null },
  { id: "platform", name: "Platform", parentId: "engineering" },
  {
    id: "developer-experience",
    name: "Developer Experience",
    parentId: "platform",
  },
  { id: "people", name: "People", parentId: null },
];

const employees = [
  { email: "engineering@example.com", departmentId: "engineering" },
  { email: "platform@example.com", departmentId: "platform" },
  { email: "devex@example.com", departmentId: "developer-experience" },
  { email: "people@example.com", departmentId: "people" },
  { email: "unassigned@example.com", departmentId: null },
];

test("a parent department includes direct employees and nested descendants", () => {
  assert.deepEqual(
    filterEmployeesForDepartment(departments, employees, "engineering").map(
      (employee) => employee.email
    ),
    [
      "engineering@example.com",
      "platform@example.com",
      "devex@example.com",
    ]
  );
});

test("a child department excludes its parent and sibling departments", () => {
  assert.deepEqual(
    filterEmployeesForDepartment(departments, employees, "platform").map(
      (employee) => employee.email
    ),
    ["platform@example.com", "devex@example.com"]
  );
});

test("unassigned employees appear only in All Employees", () => {
  assert.deepEqual(
    filterEmployeesForDepartment(departments, employees, "all").map(
      (employee) => employee.email
    ),
    [
      "engineering@example.com",
      "platform@example.com",
      "devex@example.com",
      "people@example.com",
      "unassigned@example.com",
    ]
  );
  assert.equal(
    filterEmployeesForDepartment(departments, employees, "engineering").some(
      (employee) => employee.email === "unassigned@example.com"
    ),
    false
  );
});

test("canonicalizes mixed-case email identities for leave report matching", () => {
  assert.equal(
    canonicalizeEmailIdentity("  Nucup53@Gmail.com "),
    "nucup53@gmail.com"
  );
  assert.deepEqual(
    filterAdminLeaves(
      [
        {
          ...leaves[0],
          id: "mixed-case-email",
          email: "Nucup53@Gmail.com",
        },
      ],
      {
        employee: "nucup53@gmail.com",
        status: "all",
        type: "all",
        search: "",
      }
    ).map((leave) => leave.id),
    ["mixed-case-email"]
  );
});

test("leave requests send the selected year and department to the API", () => {
  assert.equal(
    buildAdminLeaveRequestUrl(2026, "developer-experience"),
    "/api/admin/leaves?year=2026&departmentId=developer-experience"
  );
  assert.equal(
    buildAdminLeaveRequestUrl(2026, "all"),
    "/api/admin/leaves?year=2026&departmentId=all"
  );
});

test("keeps the selected year available when a department has no records for it", () => {
  assert.deepEqual(getAdminLeaveAvailableYears(2026, 2024, [2025]), [
    2026,
    2025,
    2024,
  ]);
});

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

test("aggregates unique actual and planned employees for every leave day", () => {
  assert.deepEqual(
    getAdminLeaveDailyTotals(
      [
        ...leaves,
        {
          ...leaves[0],
          id: "ana-second-record",
          startDate: "2026-06-11",
          endDate: "2026-06-11",
        },
      ],
      2026
    ).filter((day) => day.actualPeople || day.plannedPeople),
    [
      { date: "2026-06-10", actualPeople: 0, plannedPeople: 1 },
      { date: "2026-06-11", actualPeople: 0, plannedPeople: 1 },
      { date: "2026-06-12", actualPeople: 0, plannedPeople: 1 },
      { date: "2026-06-15", actualPeople: 1, plannedPeople: 0 },
    ]
  );
});

test("builds employee-by-day rows and marks overlapping statuses as mixed", () => {
  const rows = getAdminLeaveEmployeeDayRows(
    [
      ...leaves,
      {
        ...leaves[1],
        id: "ben-planned-overlap",
        startDate: "2026-06-15",
        endDate: "2026-06-16",
        status: "planned",
      },
    ],
    2026
  );

  assert.deepEqual(rows.map((row) => row.email), ["ana@example.com", "ben@example.com"]);
  assert.equal(rows[0].days["2026-06-10"], "planned");
  assert.equal(rows[1].days["2026-06-15"], "mixed");
  assert.equal(rows[1].days["2026-06-16"], "planned");
});

test("paginates filtered leave records with stable page bounds", () => {
  const records = Array.from({ length: 5 }, (_, index) => ({
    ...leaves[0],
    id: `leave-${index + 1}`,
  }));

  assert.deepEqual(paginateAdminLeaves(records, 2, 2), {
    records: [records[2], records[3]],
    page: 2,
    pageSize: 2,
    totalPages: 3,
    totalRecords: 5,
  });
  assert.deepEqual(paginateAdminLeaves(records, 99, 2), {
    records: [records[4]],
    page: 3,
    pageSize: 2,
    totalPages: 3,
    totalRecords: 5,
  });
});

test("prefers custom employee names and falls back to provider name or email", () => {
  assert.equal(resolveAdminLeaveName("  Ronn Joshua Nucup ", "ronnjoshua", "ronn@example.com"), "Ronn Joshua Nucup");
  assert.equal(resolveAdminLeaveName(null, "ronnjoshua", "ronn@example.com"), "ronnjoshua");
  assert.equal(resolveAdminLeaveName("  ", null, "ronn@example.com"), "ronn@example.com");
});

test("keeps half-day parts available for employee activity indicators", () => {
  const rows = getAdminLeaveEmployeeDayRows(
    [{ ...leaves[0], halfDay: "AM", days: 0.5 }],
    2026
  );

  assert.equal(rows[0].days["2026-06-10"], "planned");
  assert.equal(rows[0].halfDays["2026-06-10"], "AM");
});
