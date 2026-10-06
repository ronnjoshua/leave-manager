"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search, Users, X } from "lucide-react";
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
  summarizeAdminLeaves,
  type AdminLeave,
  type AdminLeaveFilters,
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

export function AdminLeaveManager() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [departmentId, setDepartmentId] = useState("all");
  const [data, setData] = useState<AdminLeaveResponse | null>(null);
  const [filters, setFilters] = useState<AdminLeaveFilters>(initialFilters);
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
  const summary = useMemo(
    () => summarizeAdminLeaves(filteredRecords),
    [filteredRecords]
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
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  function selectDepartment(value: string | null) {
    if (!value) return;
    setLoading(true);
    setDepartmentId(value);
    setFilters((current) => ({ ...current, employee: "all" }));
  }

  function selectYear(value: string | null) {
    if (!value) return;
    setLoading(true);
    setYear(Number(value));
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
              <SelectValue />
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
              <SelectValue />
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
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
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
              <SelectTrigger aria-label="Filter by employee">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.email} value={employee.email}>
                    {employee.name ?? employee.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => updateFilter("status", value as AdminLeaveFilters["status"])}>
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="actual">Actual</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => updateFilter("type", value ?? "all")}>
              <SelectTrigger aria-label="Filter by leave type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" className="gap-1.5" onClick={clearFilters}>
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
                {filteredRecords.map((record) => (
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
        </CardContent>
      </Card>
    </div>
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
