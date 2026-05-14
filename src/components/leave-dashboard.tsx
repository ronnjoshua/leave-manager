"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useLeaveState } from "@/hooks/use-leave-state";
import {
  getAccruedLeaves,
  getAvailableLeaves,
  getTotalPossibleLeaves,
  calculateCarryOver,
  getCompletedMonths,
  getRemainingCarryOver,
  getMonthlyBreakdown,
  getEndOfYearForecast,
  getLeaveTypeSummary,
  countBusinessDays,
} from "@/lib/leave-calculator";
import {
  LEAVE_TYPES,
  LEAVE_SOURCES,
  LeaveType,
  LeaveSource,
  LeaveRecord,
} from "@/lib/types";
import { exportToCsv } from "@/lib/export-csv";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeaveCalendar } from "@/components/leave-calendar";
import {
  CalendarDays,
  TrendingUp,
  MinusCircle,
  ArrowRightLeft,
  Sparkles,
  Plus,
  Settings,
  Download,
  Pencil,
  Trash2,
  CalendarRange,
  Info,
} from "lucide-react";

const SOURCE_BADGE_VARIANT: Record<
  LeaveSource,
  "default" | "secondary" | "outline" | "destructive"
> = {
  "Current Year": "secondary",
  "Carry-over": "outline",
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  Vacation: "bg-teal-500",
  Sick: "bg-amber-500",
  Emergency: "bg-red-500",
  Personal: "bg-blue-500",
  "Maternity/Paternity": "bg-purple-500",
  Bereavement: "bg-slate-500",
};

export function LeaveDashboard() {
  const {
    state,
    isLoaded,
    addRecord,
    updateRecord,
    removeRecord,
    setCarryOver,
    updateSettings,
    totalUsed,
  } = useLeaveState();

  // Add leave dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDays, setFormDays] = useState("");
  const [formDaysManual, setFormDaysManual] = useState(false);
  const [formType, setFormType] = useState<LeaveType>("Vacation");
  const [formSource, setFormSource] = useState<LeaveSource>("Current Year");
  const [formReason, setFormReason] = useState("");
  const [carryOverInput, setCarryOverInput] = useState("");
  const [statusInput, setStatusInput] = useState<"regular" | "probationary">("regular");
  const [startDateInput, setStartDateInput] = useState("");

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<LeaveRecord | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDays, setEditDays] = useState("");
  const [editDaysManual, setEditDaysManual] = useState(false);
  const [editType, setEditType] = useState<LeaveType>("Vacation");
  const [editSource, setEditSource] = useState<LeaveSource>("Current Year");
  const [editReason, setEditReason] = useState("");

  // Auto-calculate business days for add form
  useEffect(() => {
    if (!formDaysManual && formStartDate && formEndDate) {
      const bd = countBusinessDays(formStartDate, formEndDate);
      setFormDays(bd > 0 ? bd.toString() : "");
    }
  }, [formStartDate, formEndDate, formDaysManual]);

  // Auto-calculate business days for edit form
  useEffect(() => {
    if (!editDaysManual && editStartDate && editEndDate) {
      const bd = countBusinessDays(editStartDate, editEndDate);
      setEditDays(bd > 0 ? bd.toString() : "");
    }
  }, [editStartDate, editEndDate, editDaysManual]);

  if (!isLoaded || !state) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const year = state.year;
  const empStatus = state.employmentStatus ?? "regular";
  const employeeStartDate = state.startDate;
  const carryOver = calculateCarryOver(state.carryOver);
  const accrued = getAccruedLeaves(year, now, empStatus, employeeStartDate);
  const available = getAvailableLeaves(carryOver, year, totalUsed, now, empStatus, employeeStartDate);
  const totalPossible = getTotalPossibleLeaves(state.carryOver, empStatus, employeeStartDate);
  const completedMonths = getCompletedMonths(year, now);
  const remainingCarryOver = getRemainingCarryOver(
    state.carryOver,
    state.records
  );
  const monthlyBreakdown = getMonthlyBreakdown(
    year,
    state.carryOver,
    state.records,
    now,
    empStatus,
    employeeStartDate
  );
  const forecast = getEndOfYearForecast(state.carryOver, totalUsed, empStatus, employeeStartDate);
  const typeSummary = getLeaveTypeSummary(state.records);

  const maxDaysForSource =
    formSource === "Carry-over"
      ? remainingCarryOver
      : available - remainingCarryOver;

  function resetAddForm() {
    setFormStartDate("");
    setFormEndDate("");
    setFormDays("");
    setFormDaysManual(false);
    setFormType("Vacation");
    setFormSource("Current Year");
    setFormReason("");
  }

  function handleAddLeave(e: React.FormEvent) {
    e.preventDefault();
    const days = parseFloat(formDays);
    if (
      !formStartDate ||
      !formEndDate ||
      !days ||
      days <= 0 ||
      !formReason.trim()
    )
      return;
    if (days > available) return;
    if (formSource === "Carry-over" && days > remainingCarryOver) return;

    addRecord({
      startDate: formStartDate,
      endDate: formEndDate,
      days,
      type: formType,
      source: formSource,
      reason: formReason.trim(),
    });
    resetAddForm();
    setDialogOpen(false);
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const settings: Record<string, unknown> = {
      employmentStatus: statusInput,
    };
    if (carryOverInput) {
      const val = parseFloat(carryOverInput);
      if (!isNaN(val) && val >= 0) {
        settings.carryOver = val;
      }
    }
    if (statusInput === "probationary" && startDateInput) {
      settings.startDate = startDateInput;
    }
    if (statusInput === "regular") {
      settings.startDate = null;
    }
    updateSettings(settings as Parameters<typeof updateSettings>[0]);
    setCarryOverInput("");
    setStartDateInput("");
    setSettingsDialogOpen(false);
  }

  function openEditDialog(record: LeaveRecord) {
    setEditRecord(record);
    setEditStartDate(record.startDate);
    setEditEndDate(record.endDate);
    setEditDays(record.days.toString());
    setEditDaysManual(false);
    setEditType(record.type);
    setEditSource(record.source);
    setEditReason(record.reason);
    setEditDialogOpen(true);
  }

  function handleEditLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!editRecord) return;
    const days = parseFloat(editDays);
    if (
      !editStartDate ||
      !editEndDate ||
      !days ||
      days <= 0 ||
      !editReason.trim()
    )
      return;

    const availableForEdit = available + editRecord.days;
    if (days > availableForEdit) return;

    updateRecord(editRecord.id, {
      startDate: editStartDate,
      endDate: editEndDate,
      days,
      type: editType,
      source: editSource,
      reason: editReason.trim(),
    });
    setEditDialogOpen(false);
    setEditRecord(null);
  }

  function formatDateRange(startDate: string, endDate: string) {
    const s = format(new Date(startDate), "MMM d");
    const e = format(new Date(endDate), "MMM d, yyyy");
    if (startDate === endDate) {
      return format(new Date(startDate), "MMM d, yyyy");
    }
    return `${s} - ${e}`;
  }

  return (
    <div className="space-y-8">
      {/* Year Rollover Notice */}
      {(state.previousYears?.length ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/30">
          <Info className="size-4 text-teal-600 shrink-0" />
          <p className="text-sm text-teal-800 dark:text-teal-200">
            Auto-rolled over from{" "}
            {state.previousYears![state.previousYears!.length - 1].year}.
            Carry-over: <strong>{carryOver} days</strong> (capped at 5).
          </p>
        </div>
      )}

      {/* Employment Status Notice */}
      {empStatus === "probationary" && !employeeStartDate && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <Info className="size-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You are set as <strong>Probationary</strong> but no start date is configured. Click <strong>Settings</strong> to set your start date.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <CalendarDays className="size-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          Status: <strong className="text-foreground capitalize">{empStatus}</strong>
          {empStatus === "probationary" && employeeStartDate && (
            <> &middot; Start date: <strong className="text-foreground">{format(new Date(employeeStartDate), "MMMM d, yyyy")}</strong></>
          )}
          {empStatus === "regular" && (
            <> &middot; Full 2.5 days/month accrual</>
          )}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 size-20 rounded-bl-[40px] bg-primary/5" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Available
              </CardDescription>
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                <CalendarDays className="size-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {available.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">days remaining</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 size-20 rounded-bl-[40px] bg-teal-500/5" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Accrued
              </CardDescription>
              <div className="flex items-center justify-center size-8 rounded-lg bg-teal-500/10">
                <TrendingUp className="size-4 text-teal-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {accrued.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {completedMonths} of 12 months
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 size-20 rounded-bl-[40px] bg-amber-500/5" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Used
              </CardDescription>
              <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/10">
                <MinusCircle className="size-4 text-amber-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {totalUsed.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {state.records.length} leave
              {state.records.length !== 1 ? "s" : ""} taken
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 size-20 rounded-bl-[40px] bg-blue-500/5" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Carry-over
              </CardDescription>
              <div className="flex items-center justify-center size-8 rounded-lg bg-blue-500/10">
                <ArrowRightLeft className="size-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {carryOver.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {remainingCarryOver.toFixed(1)} unused
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 size-20 rounded-bl-[40px] bg-purple-500/5" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Forecast
              </CardDescription>
              <div className="flex items-center justify-center size-8 rounded-lg bg-purple-500/10">
                <Sparkles className="size-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {forecast.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              by Dec {year}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Leave Balance
              </CardTitle>
              <CardDescription className="mt-0.5">
                {available.toFixed(1)} of {totalPossible.toFixed(1)} total
                possible days
              </CardDescription>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {((available / totalPossible) * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
              style={{
                width: `${Math.min((available / totalPossible) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3" />
              2.5 days/month
            </span>
            <span>30 days/year + up to 5 carry-over</span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <LeaveCalendar records={state.records} year={year} />

      {/* Leave Type Summary */}
      {typeSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Usage by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeSummary.map(({ type, days }) => (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{type}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {days.toFixed(1)} days
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${LEAVE_TYPE_COLORS[type]} transition-all duration-500`}
                      style={{
                        width: `${Math.min((days / totalUsed) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetAddForm();
          }}
        >
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="size-4" />
            Log Leave
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Leave Usage</DialogTitle>
              <DialogDescription>
                Record leave days taken. Available: {available.toFixed(1)} days.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leave-start">Start Date</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-end">End Date</Label>
                  <Input
                    id="leave-end"
                    type="date"
                    value={formEndDate}
                    min={formStartDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              {formStartDate && formEndDate && !formDaysManual && (
                <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
                  <CalendarRange className="size-3.5 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {countBusinessDays(formStartDate, formEndDate)} business
                    day(s) auto-calculated.{" "}
                    <button
                      type="button"
                      className="underline text-primary hover:text-primary/80"
                      onClick={() => setFormDaysManual(true)}
                    >
                      Override
                    </button>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select
                    value={formType}
                    onValueChange={(val) => setFormType(val as LeaveType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select
                    value={formSource}
                    onValueChange={(val) =>
                      setFormSource(val as LeaveSource)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formSource === "Carry-over" && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
                  <ArrowRightLeft className="size-3.5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Remaining carry-over: {remainingCarryOver.toFixed(1)} days
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="leave-days">
                  Days{formDaysManual ? " (manual)" : ""}
                </Label>
                <Input
                  id="leave-days"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={maxDaysForSource > 0 ? maxDaysForSource : 0}
                  placeholder="e.g. 1 or 0.5"
                  value={formDays}
                  onChange={(e) => {
                    setFormDaysManual(true);
                    setFormDays(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-reason">Reason / Notes</Label>
                <Input
                  id="leave-reason"
                  type="text"
                  placeholder="e.g. Family trip, Doctor visit"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save Leave</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={settingsDialogOpen}
          onOpenChange={(open) => {
            setSettingsDialogOpen(open);
            if (open) {
              setCarryOverInput(state.carryOver.toString());
              setStatusInput(empStatus);
              setStartDateInput(employeeStartDate ?? "");
            }
          }}
        >
          <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
            <Settings className="size-4" />
            Settings
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Settings</DialogTitle>
              <DialogDescription>
                Configure your employment start date and carry-over balance.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <Label>Employment Status</Label>
                <Select
                  value={statusInput}
                  onValueChange={(val) => setStatusInput(val as "regular" | "probationary")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="probationary">Probationary</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {statusInput === "regular"
                    ? "Full 2.5 days/month accrual for all months."
                    : "Accrual starts from your employment start date."}
                </p>
              </div>
              {statusInput === "probationary" && (
                <div className="space-y-2">
                  <Label htmlFor="employee-start-date">Employment Start Date</Label>
                  <Input
                    id="employee-start-date"
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    You earn 2.5 days/month only for months where you started on or before the 15th.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="carry-over">Carry-over from {year - 1}</Label>
                <Input
                  id="carry-over"
                  type="number"
                  step="0.5"
                  min="0"
                  max="5"
                  placeholder="0 - 5"
                  value={carryOverInput}
                  onChange={(e) => setCarryOverInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum 5 days carry-over from previous year.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit">Save Settings</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {state.records.length > 0 && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportToCsv(state.records, year)}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        )}
      </div>

      <Separator />

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
          <CardDescription>
            Accrual and usage per month for {year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Accrued</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyBreakdown.map((m) => (
                  <TableRow
                    key={m.month}
                    className={
                      m.isCurrent
                        ? "bg-primary/5"
                        : !m.isCompleted
                          ? "text-muted-foreground/60"
                          : ""
                    }
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {m.month}
                        {m.isCurrent && (
                          <Badge className="text-[10px] px-1.5 py-0">
                            Now
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.isCompleted ? (
                        m.noAccrual ? (
                          <span className="text-muted-foreground/60" title="Not yet employed">
                            0
                          </span>
                        ) : (
                          <span className="text-primary">
                            +{m.accrued.toFixed(1)}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground/40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.used > 0 ? (
                        <span className="text-destructive font-medium">
                          -{m.used.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {m.isCompleted || m.used > 0
                        ? m.balance.toFixed(1)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave History</CardTitle>
          <CardDescription>
            All recorded leave usage for {year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                <CalendarDays className="size-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No leaves recorded</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click &quot;Log Leave&quot; to record your first leave.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDateRange(record.startDate, record.endDate)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center min-w-[2rem] rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums">
                          {record.days}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span
                            className={`size-2 rounded-full ${LEAVE_TYPE_COLORS[record.type]}`}
                          />
                          {record.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={SOURCE_BADGE_VARIANT[record.source]}>
                          {record.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                            onClick={() => openEditDialog(record)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeRecord(record.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave</DialogTitle>
            <DialogDescription>Update this leave record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditLeave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Date</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={editEndDate}
                  min={editStartDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            {editStartDate && editEndDate && !editDaysManual && (
              <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
                <CalendarRange className="size-3.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {countBusinessDays(editStartDate, editEndDate)} business
                  day(s) auto-calculated.{" "}
                  <button
                    type="button"
                    className="underline text-primary hover:text-primary/80"
                    onClick={() => setEditDaysManual(true)}
                  >
                    Override
                  </button>
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={editType}
                  onValueChange={(val) => setEditType(val as LeaveType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={editSource}
                  onValueChange={(val) =>
                    setEditSource(val as LeaveSource)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-days">
                Days{editDaysManual ? " (manual)" : ""}
              </Label>
              <Input
                id="edit-days"
                type="number"
                step="0.5"
                min="0.5"
                placeholder="e.g. 1 or 0.5"
                value={editDays}
                onChange={(e) => {
                  setEditDaysManual(true);
                  setEditDays(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reason">Reason / Notes</Label>
              <Input
                id="edit-reason"
                type="text"
                placeholder="e.g. Family trip, Doctor visit"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit">Update Leave</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
