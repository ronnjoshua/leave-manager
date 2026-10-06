import test from "node:test";
import assert from "node:assert/strict";
import {
  getCalendarNavigationMonth,
  getCalendarLeaveGroups,
  getCalendarOwnerLeaves,
} from "../src/lib/leave-calendar";

const leaves = [
  { id: "actual", status: "actual" as const },
  { id: "planned", status: "planned" as const },
];

test("actual-only calendars exclude planned leave from every display group", () => {
  const groups = getCalendarLeaveGroups(leaves, "actual");

  assert.deepEqual(groups.actualLeaves.map(({ id }) => id), ["actual"]);
  assert.deepEqual(groups.plannedLeaves, []);
  assert.deepEqual(groups.visibleLeaves.map(({ id }) => id), ["actual"]);
});

test("planned-only calendars exclude actual leave from every display group", () => {
  const groups = getCalendarLeaveGroups(leaves, "planned");

  assert.deepEqual(groups.actualLeaves, []);
  assert.deepEqual(groups.plannedLeaves.map(({ id }) => id), ["planned"]);
  assert.deepEqual(groups.visibleLeaves.map(({ id }) => id), ["planned"]);
});

test("mixed calendars preserve actual and planned leave behavior", () => {
  const groups = getCalendarLeaveGroups(leaves);

  assert.deepEqual(groups.actualLeaves.map(({ id }) => id), ["actual"]);
  assert.deepEqual(groups.plannedLeaves.map(({ id }) => id), ["planned"]);
  assert.deepEqual(groups.visibleLeaves.map(({ id }) => id), [
    "actual",
    "planned",
  ]);
});

test("shows shared owner rows only when leave records carry owner metadata", () => {
  assert.deepEqual(
    getCalendarOwnerLeaves([
      { id: "personal", personName: null, personEmail: undefined },
      { id: "named", personName: "Ana", personEmail: undefined },
      { id: "emailed", personName: null, personEmail: "ben@example.com" },
    ]).map(({ id }) => id),
    ["named", "emailed"]
  );
});

test("report calendars stop at the selected year's month boundaries", () => {
  assert.equal(
    getCalendarNavigationMonth(
      new Date(2025, 0, 1),
      "previous",
      2025
    ).toISOString(),
    new Date(2025, 0, 1).toISOString()
  );
  assert.equal(
    getCalendarNavigationMonth(
      new Date(2025, 11, 1),
      "next",
      2025
    ).toISOString(),
    new Date(2025, 11, 1).toISOString()
  );
});

test("report calendars do not jump to today when today is in another year", () => {
  assert.equal(
    getCalendarNavigationMonth(
      new Date(2025, 5, 1),
      "today",
      2025,
      new Date(2026, 9, 6)
    ).toISOString(),
    new Date(2025, 5, 1).toISOString()
  );
});

test("personal calendars preserve unrestricted cross-year navigation", () => {
  assert.equal(
    getCalendarNavigationMonth(
      new Date(2025, 0, 1),
      "previous"
    ).toISOString(),
    new Date(2024, 11, 1).toISOString()
  );
  assert.equal(
    getCalendarNavigationMonth(
      new Date(2025, 5, 1),
      "today",
      undefined,
      new Date(2026, 9, 6)
    ).toISOString(),
    new Date(2026, 9, 1).toISOString()
  );
});
