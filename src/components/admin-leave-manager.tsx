"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Search,
  Users,
  X,
} from "lucide-react";
import { LeaveCalendar } from "@/components/leave-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildAdminLeaveRequestUrl,
  filterAdminLeaves,
  getAdminLeaveDailyTotals,
  getAdminLeaveEmployeeDayRows,
  paginateAdminLeaves,
  summarizeAdminLeaves,
  type AdminLeave,
  type AdminLeaveDayStatus,
  type AdminLeaveFilters,
  type AdminLeaveDailyTotal,
  type AdminLeaveEmployeeDayRow,
} from "@/lib/admin-leaves";
import { sortDepartmentsForDisplay } from "@/lib/admin-department-ui";
import type { DepartmentNode } from "@/lib/departments";
import type { LeaveRecord } from "@/lib/types";

interface AdminLeaveResponse {
  year: number;
  currentYear: number;
  departmentId: string;
  departments: DepartmentNode[];
  availableYears: number[];
  records: AdminLeave[];
}

const initialFilters: AdminLeaveFilters = {
  employee: "all",
  status: "all",
  type: "all",
  search: "",
  fromDate: "",
  toDate: "",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function AdminLeaveManager() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [departmentId, setDepartmentId] = useState("all");
  const [data, setData] = useState<AdminLeaveResponse | null>(null);
  const [filters, setFilters] = useState<AdminLeaveFilters>(initialFilters);
  const [leaveDetailsPage, setLeaveDetailsPage] = useState(1);
  const [leaveDetailsPageSize, setLeaveDetailsPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(buildAdminLeaveRequestUrl(year, departmentId))
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load leave records");
        return (await res.json()) as AdminLeaveResponse;
      })
      .then((nextData) => {
        if (!cancelled) {
          setData(nextData);
          setError("");
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [departmentId, year]);

  const activeData =
    data?.year === year && data.departmentId === departmentId ? data : null;
  const records = useMemo(() => activeData?.records ?? [], [activeData]);
  const filteredRecords = useMemo(
    () => filterAdminLeaves(records, filters),
    [records, filters]
  );
  const paginatedRecords = useMemo(
    () => paginateAdminLeaves(filteredRecords, leaveDetailsPage, leaveDetailsPageSize),
    [filteredRecords, leaveDetailsPage, leaveDetailsPageSize]
  );
  const summary = useMemo(
    () => summarizeAdminLeaves(filteredRecords),
    [filteredRecords]
  );
  const dailyTotals = useMemo(
    () => getAdminLeaveDailyTotals(filteredRecords, year),
    [filteredRecords, year]
  );
  const employeeDayRows = useMemo(
    () => getAdminLeaveEmployeeDayRows(filteredRecords, year),
    [filteredRecords, year]
  );
  const employees = useMemo(
    () =>
      Array.from(
        new Map(
          records.map((record) => [
            record.email,
            { email: record.email, name: record.name },
          ])
        ).values()
      ).sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email)),
    [records]
  );
  const leaveTypes = useMemo(
    () => Array.from(new Set(records.map((record) => record.type))).sort(),
    [records]
  );
  const departmentRows = useMemo(
    () => sortDepartmentsForDisplay(activeData?.departments ?? []),
    [activeData]
  );
  const selectedDepartmentName =
    departmentId === "all"
      ? "All Employees"
      : (activeData?.departments.find(
          (department) => department.id === departmentId
        )?.name ?? "Department");

  const calendarRecords: LeaveRecord[] = filteredRecords.map((record) => ({
    id: record.id,
    startDate: record.startDate,
    endDate: record.endDate,
    days: record.days,
    type: record.type as LeaveRecord["type"],
    source: "Current Year",
    reason: record.reason,
    status: record.status,
    halfDay: record.halfDay,
    createdAt: new Date().toISOString(),
    personName: record.name,
    personEmail: record.email,
  }));

  function updateFilter<Key extends keyof AdminLeaveFilters>(
    key: Key,
    value: AdminLeaveFilters[Key]
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setLeaveDetailsPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setLeaveDetailsPage(1);
  }

  function selectDepartment(value: string | null) {
    if (!value) return;
    setLoading(true);
    setDepartmentId(value);
    setFilters((current) => ({ ...current, employee: "all" }));
    setLeaveDetailsPage(1);
  }

  function selectYear(value: string | null) {
    if (!value) return;
    setLoading(true);
    setYear(Number(value));
    setLeaveDetailsPage(1);
  }

  if (loading && !activeData) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading leave records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Leave entries" value={filteredRecords.length} />
        <SummaryCard label="People on leave" value={summary.peopleCount} />
        <SummaryCard label="Actual days" value={summary.actualDays} />
        <SummaryCard label="Planned days" value={summary.plannedDays} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="size-4" />
            Team leave calendars
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedDepartmentName}. Hover a marked day to see who is away on
            that date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={departmentId} onValueChange={selectDepartment}>
            <SelectTrigger className="w-64" aria-label="Leave department">
              <SelectValue>
                {(value) =>
                  value === "all"
                    ? "All Employees"
                    : (departmentRows.find((row) => row.department.id === value)
                        ?.department.name ?? "Department")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {departmentRows.map(({ department, depth }) => (
                <SelectItem key={department.id} value={department.id}>
                  {depth > 0 && `${"\u00a0\u00a0".repeat(depth)}↳ `}
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={selectYear}
          >
            <SelectTrigger className="w-28" aria-label="Leave year">
              <SelectValue>{(value) => value ?? year}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(activeData?.availableYears ?? [year]).map((availableYear) => (
                <SelectItem key={availableYear} value={String(availableYear)}>
                  {availableYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Actual leaves</CardTitle>
            <CardDescription>Confirmed leave taken in {year}.</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveCalendar
              key={`${departmentId}-${year}-actual`}
              records={calendarRecords}
              year={year}
              status="actual"
              title="Actual leaves"
              navigationYear={year}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Planned leaves</CardTitle>
            <CardDescription>Upcoming or scheduled leave in {year}.</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveCalendar
              key={`${departmentId}-${year}-planned`}
              records={calendarRecords}
              year={year}
              status="planned"
              title="Planned leaves"
              navigationYear={year}
            />
          </CardContent>
        </Card>
      </div>

      <LeaveActivityVisualization
        year={year}
        dailyTotals={dailyTotals}
        employeeDayRows={employeeDayRows}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Leave details
            <Badge variant="secondary" className="ml-auto tabular-nums">
              {filteredRecords.length}
            </Badge>
          </CardTitle>
          <CardDescription>Filter and review individual leave entries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid items-center gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search name, email, reason..."
                className="pl-8"
                aria-label="Search leave records"
              />
            </div>
            <Select value={filters.employee} onValueChange={(value) => updateFilter("employee", value ?? "all")}>
              <SelectTrigger className="w-full min-w-0" aria-label="Filter by employee">
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? "All Employees"
                      : (employees.find((employee) => employee.email === value)
                          ?.name ?? value ?? "Employee")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.email} value={employee.email}>
                    {employee.name ?? employee.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => updateFilter("status", value as AdminLeaveFilters["status"])}>
              <SelectTrigger className="w-full min-w-0" aria-label="Filter by status">
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? "All Statuses"
                      : value === "planned"
                        ? "Planned"
                        : "Actual"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="actual">Actual</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => updateFilter("type", value ?? "all")}>
              <SelectTrigger className="w-full min-w-0" aria-label="Filter by leave type">
                <SelectValue>
                  {(value) => value === "all" ? "All Types" : value ?? "Type"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" className="w-full gap-1.5 sm:w-auto" onClick={clearFilters}>
              <X className="size-4" />
              Clear
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(event) => updateFilter("fromDate", event.target.value)}
              aria-label="Filter from date"
            />
            <Input
              type="date"
              value={filters.toDate}
              onChange={(event) => updateFilter("toDate", event.target.value)}
              aria-label="Filter to date"
            />
          </div>

          {filteredRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No leave records match the selected filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">{record.name ?? record.email}</div>
                      {record.name && <div className="text-xs text-muted-foreground">{record.email}</div>}
                    </TableCell>
                    <TableCell>
                      {formatDate(record.startDate)}
                      {record.startDate !== record.endDate && ` – ${formatDate(record.endDate)}`}
                    </TableCell>
                    <TableCell className="tabular-nums">{record.days}</TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === "planned" ? "outline" : "secondary"}>
                        {record.status === "planned" ? "Planned" : "Actual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-56 truncate" title={record.reason}>
                      {record.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredRecords.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>
                Showing {(paginatedRecords.page - 1) * paginatedRecords.pageSize + 1}–
                {Math.min(
                  paginatedRecords.page * paginatedRecords.pageSize,
                  paginatedRecords.totalRecords
                )} of {paginatedRecords.totalRecords}
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={String(leaveDetailsPageSize)}
                  onValueChange={(value) => {
                    setLeaveDetailsPageSize(Number(value ?? 25));
                    setLeaveDetailsPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-24" aria-label="Rows per page">
                    <SelectValue>{(value) => `${value ?? leaveDetailsPageSize} / page`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous leave details page"
                  disabled={paginatedRecords.page <= 1}
                  onClick={() => setLeaveDetailsPage((page) => Math.max(1, page - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="tabular-nums">{paginatedRecords.page} / {paginatedRecords.totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next leave details page"
                  disabled={paginatedRecords.page >= paginatedRecords.totalPages}
                  onClick={() => setLeaveDetailsPage((page) => Math.min(paginatedRecords.totalPages, page + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeaveActivityVisualization({
  year,
  dailyTotals,
  employeeDayRows,
}: {
  year: number;
  dailyTotals: AdminLeaveDailyTotal[];
  employeeDayRows: AdminLeaveEmployeeDayRow[];
}) {
  const maxDailyPeople = Math.max(
    1,
    ...dailyTotals.map((day) => day.actualPeople + day.plannedPeople)
  );
  const activeDays = dailyTotals.filter(
    (day) => day.actualPeople > 0 || day.plannedPeople > 0
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" />
            Daily leave activity
          </CardTitle>
          <CardDescription>
            People on actual or planned leave for each day in {year}. Hover a bar
            for the exact date and totals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeDays === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No leave activity matches these filters.
            </p>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[720px]">
                <div className="flex h-48 items-end gap-px border-b border-border/60 px-1">
                  {dailyTotals.map((day) => {
                    const label = formatDate(day.date);
                    const total = day.actualPeople + day.plannedPeople;
                    return (
                      <div
                        key={day.date}
                        className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                        title={`${label}: ${day.actualPeople} actual, ${day.plannedPeople} planned`}
                        aria-label={`${label}: ${day.actualPeople} actual, ${day.plannedPeople} planned`}
                      >
                        {total > 0 && (
                          <div className="mx-px flex flex-col justify-end" style={{ height: `${(total / maxDailyPeople) * 100}%` }}>
                            {day.plannedPeople > 0 && (
                              <div className="min-h-0.5 bg-amber-400" style={{ height: `${(day.plannedPeople / total) * 100}%` }} />
                            )}
                            {day.actualPeople > 0 && (
                              <div className="min-h-0.5 bg-teal-600" style={{ height: `${(day.actualPeople / total) * 100}%` }} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground">
                  <span>Jan 1</span>
                  <span>Jun 1</span>
                  <span>Dec 31</span>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-teal-600" /> Actual
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-amber-400" /> Planned
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="size-4" />
            Employee-by-day activity
          </CardTitle>
          <CardDescription>
            Scroll horizontally to inspect each employee&apos;s leave days in {year}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeDayRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No employees match these filters.
            </p>
          ) : (
            <div className="relative isolate overflow-x-auto pb-2">
              <div className="relative min-w-max text-xs">
                <div
                  className="grid items-end border-b border-border/60 pb-1"
                  style={{ gridTemplateColumns: `16rem repeat(${dailyTotals.length}, 3rem)` }}
                >
                  <div className="sticky left-0 z-30 box-border flex min-h-10 w-64 self-stretch items-center overflow-hidden border-r-2 border-border bg-card pr-2 font-medium text-muted-foreground shadow-[4px_0_8px_-6px_rgba(0,0,0,0.45)]">
                    Employee
                  </div>
                  {dailyTotals.map((day) => (
                    <div key={day.date} className="text-center text-[11px] text-muted-foreground" title={formatDate(day.date)}>
                      {formatDayLabel(day.date)}
                    </div>
                  ))}
                </div>
                {employeeDayRows.map((row) => (
                  <div
                    key={row.email}
                    className="grid min-h-12 items-center border-b border-border/30 py-2 last:border-0"
                    style={{ gridTemplateColumns: `16rem repeat(${dailyTotals.length}, 3rem)` }}
                  >
                    <div className="sticky left-0 z-20 box-border flex min-w-0 w-64 self-stretch items-center truncate overflow-hidden whitespace-nowrap border-r-2 border-border bg-card pr-2 text-sm font-medium shadow-[4px_0_8px_-6px_rgba(0,0,0,0.45)]" title={`${row.name ?? row.email} (${row.email})`}>
                      {row.name ?? row.email}
                    </div>
                    {dailyTotals.map((day) => {
                      const status = row.days[day.date];
                      return (
                        <ActivityCell
                          key={day.date}
                          status={status}
                          halfDay={row.halfDays[day.date]}
                          date={day.date}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <ActivityLegend color="bg-teal-600" label="Actual" />
            <ActivityLegend color="bg-amber-400" label="Planned" />
            <ActivityLegend color="bg-violet-500" label="Both" />
            <span className="inline-flex items-center">Split indicator = half-day (AM/PM)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityCell({
  status,
  halfDay,
  date,
}: {
  status?: AdminLeaveDayStatus;
  halfDay?: "AM" | "PM";
  date: string;
}) {
  const color =
    status === "actual"
      ? "bg-teal-600"
      : status === "planned"
        ? "bg-amber-400"
        : status === "mixed"
          ? "bg-violet-500"
          : "bg-muted/40";
  return (
    <div
      className="flex h-9 w-full items-center justify-center border border-border/70 bg-muted/10"
      title={`${formatDate(date)}: ${status ?? "No leave"}${halfDay ? ` (${halfDay} half-day)` : ""}`}
      aria-label={`${formatDate(date)}: ${status ?? "No leave"}${halfDay ? ` (${halfDay} half-day)` : ""}`}
    >
      {halfDay && status !== "mixed" ? (
        <span className="flex h-5 w-5 overflow-hidden rounded-sm" aria-hidden="true">
          <span className={`h-full w-1/2 ${halfDay === "AM" ? color : "bg-muted/40"}`} />
          <span className={`h-full w-1/2 ${halfDay === "PM" ? color : "bg-muted/40"}`} />
        </span>
      ) : (
        <span className={`h-5 w-5 rounded-sm ${color}`} aria-hidden="true" />
      )}
    </div>
  );
}

function ActivityLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${color}`} /> {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
