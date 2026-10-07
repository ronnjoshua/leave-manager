import test from "node:test";
import assert from "node:assert/strict";
import { filterLeaveHistory, sortLeaveHistoryByMonth } from "../src/lib/leave-utils";

const records = [
  {
    id: "vacation",
    type: "Vacation" as const,
    startDate: "2026-06-10",
    endDate: "2026-06-12",
  },
  {
    id: "sick",
    type: "Sick" as const,
    startDate: "2026-06-20",
    endDate: "2026-06-20",
  },
];

test("filters leave history by type and overlapping date range", () => {
  assert.deepEqual(
    filterLeaveHistory(records, {
      type: "Vacation",
      fromDate: "2026-06-11",
      toDate: "2026-06-11",
    }).map((record) => record.id),
    ["vacation"]
  );
});

test("all leave history filters preserve every record", () => {
  assert.deepEqual(
    filterLeaveHistory(records, { type: "all", fromDate: "", toDate: "" }).map(
      (record) => record.id
    ),
    ["vacation", "sick"]
  );
});

test("sorts leave history by month in ascending or descending order", () => {
  assert.deepEqual(
    sortLeaveHistoryByMonth(records, "asc").map((record) => record.id),
    ["vacation", "sick"]
  );
  assert.deepEqual(
    sortLeaveHistoryByMonth(records, "desc").map((record) => record.id),
    ["sick", "vacation"]
  );
});
