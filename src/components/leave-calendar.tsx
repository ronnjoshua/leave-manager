"use client";

import { useEffect, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  isSaturday,
  isSunday,
  isBefore,
  isAfter,
  parseISO,
  isSameDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getCalendarNavigationMonth,
  getCalendarLeaveGroups,
  getCalendarOwnerLeaves,
} from "@/lib/leave-calendar";
import type { LeaveRecord, LeaveStatus } from "@/lib/types";

interface Holiday {
  date: string;
  localName: string;
  name: string;
}

interface LeaveCalendarProps {
  records: LeaveRecord[];
  year: number;
  onDateClick?: (startDate: string, endDate: string) => void;
  status?: LeaveStatus;
  title?: string;
  navigationYear?: number;
}

function isInLeaveRange(day: Date, record: LeaveRecord): boolean {
  const start = parseISO(record.startDate);
  const end = parseISO(record.endDate);
  return (
    (isSameDay(day, start) || isAfter(day, start)) &&
    (isSameDay(day, end) || isBefore(day, end))
  );
}

function isLongWeekend(
  day: Date,
  holidays: Map<string, Holiday>
): boolean {
  const key = format(day, "yyyy-MM-dd");
  if (!holidays.has(key) && !isWeekend(day)) return false;

  const stretch: Date[] = [day];

  let prev = new Date(day);
  while (true) {
    prev = new Date(prev.getTime() - 86400000);
    const pk = format(prev, "yyyy-MM-dd");
    if (isWeekend(prev) || holidays.has(pk)) {
      stretch.unshift(prev);
    } else break;
  }

  let next = new Date(day);
  while (true) {
    next = new Date(next.getTime() + 86400000);
    const nk = format(next, "yyyy-MM-dd");
    if (isWeekend(next) || holidays.has(nk)) {
      stretch.push(next);
    } else break;
  }

  return stretch.length >= 3;
}

export function LeaveCalendar({
  records,
  year,
  onDateClick,
  status,
  title = "Calendar",
  navigationYear,
}: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(year, year === today.getFullYear() ? today.getMonth() : 0, 1);
  });
  const [holidays, setHolidays] = useState<Map<string, Holiday>>(new Map());
  const [loadedHolidayYear, setLoadedHolidayYear] = useState<number | null>(null);
  const loadingHolidays = loadedHolidayYear !== year;

  // Date range selection
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [selectEnd, setSelectEnd] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/holidays?year=${year}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as Holiday[];
      })
      .then((data) => {
        if (cancelled || !data) return;
        setHolidays(new Map(data.map((holiday) => [holiday.date, holiday])));
      })
      .catch(() => {
        // Holidays are supplemental; leave the calendar usable if loading fails.
      })
      .finally(() => {
        if (!cancelled) setLoadedHolidayYear(year);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function handleDayClick(day: Date, info: ReturnType<typeof getDayInfo>) {
    if (!onDateClick || !info.inMonth) return;

    const dateStr = format(day, "yyyy-MM-dd");

    if (!selecting) {
      // First click — start selection
      setSelectStart(dateStr);
      setSelectEnd(dateStr);
      setSelecting(true);
    } else {
      // Second click — finish selection
      setSelecting(false);
      if (selectStart) {
        const start = selectStart < dateStr ? selectStart : dateStr;
        const end = selectStart < dateStr ? dateStr : selectStart;
        setSelectStart(start);
        setSelectEnd(end);
        onDateClick(start, end);
        // Clear selection after a short delay
        setTimeout(() => {
          setSelectStart(null);
          setSelectEnd(null);
        }, 300);
      }
    }
  }

  // Cancel selection on Escape key
  useEffect(() => {
    if (!selecting) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelecting(false);
        setSelectStart(null);
        setSelectEnd(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selecting]);

  function handleDayHover(day: Date) {
    if (!selecting || !selectStart) return;
    const dateStr = format(day, "yyyy-MM-dd");
    setSelectEnd(dateStr);
  }

  function isInSelection(day: Date): boolean {
    if (!selectStart || !selectEnd) return false;
    const dateStr = format(day, "yyyy-MM-dd");
    const start = selectStart < selectEnd ? selectStart : selectEnd;
    const end = selectStart < selectEnd ? selectEnd : selectStart;
    return dateStr >= start && dateStr <= end;
  }

  function getDayInfo(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const holiday = holidays.get(key);
    const weekend = isWeekend(day);
    const saturday = isSaturday(day);
    const sunday = isSunday(day);
    const today = isToday(day);
    const inMonth = isSameMonth(day, currentMonth);
    const { actualLeaves, plannedLeaves, visibleLeaves } =
      getCalendarLeaveGroups(
        records.filter((record) => isInLeaveRange(day, record)),
        status
      );
    const onLeave = actualLeaves.length > 0 && !weekend;
    const onPlannedLeave = plannedLeaves.length > 0 && !weekend;
    const longWeekend = isLongWeekend(day, holidays);
    const selected = isInSelection(day) && inMonth;

    return {
      key,
      holiday,
      weekend,
      saturday,
      sunday,
      today,
      inMonth,
      actualLeaves,
      plannedLeaves,
      visibleLeaves,
      onLeave,
      onPlannedLeave,
      longWeekend,
      selected,
    };
  }

  const monthHolidays = days
    .filter((d) => isSameMonth(d, currentMonth) && holidays.has(format(d, "yyyy-MM-dd")))
    .map((d) => ({
      date: d,
      holiday: holidays.get(format(d, "yyyy-MM-dd"))!,
    }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-full"
              onClick={() =>
                setCurrentMonth((month) =>
                  getCalendarNavigationMonth(
                    month,
                    "previous",
                    navigationYear
                  )
                )
              }
              disabled={
                navigationYear !== undefined &&
                currentMonth.getFullYear() === navigationYear &&
                currentMonth.getMonth() === 0
              }
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <button
              className="text-sm font-semibold min-w-[130px] text-center hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-accent"
              onClick={() =>
                setCurrentMonth((month) =>
                  getCalendarNavigationMonth(month, "today", navigationYear)
                )
              }
              disabled={
                navigationYear !== undefined &&
                navigationYear !== new Date().getFullYear()
              }
              title={
                navigationYear !== undefined &&
                navigationYear !== new Date().getFullYear()
                  ? `Viewing ${navigationYear}`
                  : "Go to today"
              }
            >
              {format(currentMonth, "MMMM yyyy")}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-full"
              onClick={() =>
                setCurrentMonth((month) =>
                  getCalendarNavigationMonth(month, "next", navigationYear)
                )
              }
              disabled={
                navigationYear !== undefined &&
                currentMonth.getFullYear() === navigationYear &&
                currentMonth.getMonth() === 11
              }
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        {onDateClick && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {selecting
              ? "Click another date to select a range \u00B7 Esc to cancel"
              : "Click a date to log a leave"}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-0.5">
          {weekDays.map((d) => (
            <div
              key={d}
              className={`text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider py-1.5 ${
                d === "Sat" || d === "Sun"
                  ? "text-red-400/80"
                  : "text-muted-foreground/60"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map((day) => {
            const info = getDayInfo(day);

            let bgClass = "";
            let textClass = "text-foreground";

            if (!info.inMonth) {
              textClass = "text-muted-foreground/30";
            } else if (info.selected) {
              bgClass = "bg-primary/20 dark:bg-primary/30";
              textClass = "text-primary font-semibold";
            } else if (info.onLeave) {
              bgClass = "bg-teal-100 dark:bg-teal-900/40";
              textClass = "text-teal-800 dark:text-teal-200";
            } else if (info.onPlannedLeave) {
              bgClass = "bg-teal-50 dark:bg-teal-950/30 border border-dashed border-teal-300 dark:border-teal-700";
              textClass = "text-teal-600 dark:text-teal-400";
            } else if (info.holiday) {
              bgClass = "bg-amber-100 dark:bg-amber-900/40";
              textClass = "text-amber-800 dark:text-amber-200";
            } else if (info.longWeekend && info.weekend) {
              bgClass = "bg-purple-50 dark:bg-purple-900/30";
              textClass = "text-purple-600 dark:text-purple-300";
            } else if (info.weekend) {
              bgClass = "bg-red-50 dark:bg-red-950/30";
              textClass = "text-red-400 dark:text-red-400";
            }

            const clickable = onDateClick && info.inMonth;
            const leavePeople = info.visibleLeaves;
            const ownerLeaves = getCalendarOwnerLeaves(leavePeople);

            return (
              <div
                key={info.key}
                className={`relative flex flex-col items-center justify-center rounded-lg p-0.5 sm:p-1 min-h-[36px] sm:min-h-[44px] text-sm transition-all duration-150 ${bgClass} ${
                  info.today ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                } ${clickable ? "cursor-pointer hover:bg-primary/10 active:scale-95" : ""} ${ownerLeaves.length > 0 ? "group hover:z-20" : ""}`}
                title={
                  info.holiday
                    ? `${info.holiday.name} (${info.holiday.localName})`
                    : info.onLeave
                      ? `Leave: ${info.actualLeaves.map((r) => r.type).join(", ")}`
                      : info.onPlannedLeave
                        ? `Planned: ${info.plannedLeaves.map((r) => r.type).join(", ")}`
                        : info.longWeekend
                          ? "Long weekend"
                          : undefined
                }
                onClick={() => clickable && handleDayClick(day, info)}
                onMouseEnter={() => handleDayHover(day)}
              >
                <span
                  className={`text-xs tabular-nums font-medium ${textClass}`}
                >
                  {format(day, "d")}
                </span>
                {info.inMonth && info.holiday && (
                  <span className="absolute bottom-0.5 size-1.5 rounded-full bg-amber-500" />
                )}
                {info.inMonth && info.onLeave && (
                  <span className="absolute bottom-0.5 size-1.5 rounded-full bg-teal-500" />
                )}
                {info.inMonth && info.onPlannedLeave && !info.onLeave && (
                  <span className="absolute bottom-0.5 size-1.5 rounded-full bg-teal-300 dark:bg-teal-600" />
                )}
                {ownerLeaves.length > 0 && info.inMonth && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-52 -translate-x-1/2 rounded-lg border border-border bg-popover p-2 text-left text-xs text-popover-foreground shadow-lg group-hover:block">
                    <p className="mb-1 font-semibold">On leave {format(day, "MMM d")}</p>
                    <div className="space-y-1">
                      {ownerLeaves.map((leave) => (
                        <div key={`${leave.id}-${leave.status}`} className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate font-medium" title={leave.personEmail ?? undefined}>
                            {leave.personName ?? leave.personEmail ?? "Unknown person"}
                          </span>
                          <span className="shrink-0 text-muted-foreground">{leave.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-border/40 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-50 ring-1 ring-red-200 dark:bg-red-950 dark:ring-red-800" />
            Weekend
          </span>
          {status !== "planned" && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-teal-500" />
              On Leave
            </span>
          )}
          {status !== "actual" && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-teal-300 dark:bg-teal-600" />
              Planned
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            Holiday
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-purple-300 dark:bg-purple-600" />
            Long Weekend
          </span>
        </div>

        {/* This month's holidays */}
        {monthHolidays.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Holidays this month
            </p>
            {monthHolidays.map(({ date, holiday }) => (
              <div
                key={holiday.date}
                className="flex items-center gap-2 text-xs"
                title={holiday.localName}
              >
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                >
                  {format(date, "MMM d")}
                </Badge>
                <span className="font-medium">{holiday.name}</span>
              </div>
            ))}
          </div>
        )}

        {loadingHolidays && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Loading holidays...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
