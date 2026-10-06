import test from "node:test";
import assert from "node:assert/strict";
import { getCalendarLeaveGroups } from "../src/lib/leave-calendar";

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
