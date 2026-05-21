"use client";

import { useCallback, useEffect, useState } from "react";
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
  addMonths,
  subMonths,
  getYear,
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
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { LeaveRecord } from "@/lib/types";

interface Holiday {
  date: string;
  localName: string;
  name: string;
}

interface LeaveCalendarProps {
  records: LeaveRecord[];
  year: number;
  onDateClick?: (startDate: string, endDate: string) => void;
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

export function LeaveCalendar({ records, year, onDateClick }: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState<Map<string, Holiday>>(new Map());
  const [loadingHolidays, setLoadingHolidays] = useState(true);

  // Date range selection
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [selectEnd, setSelectEnd] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const res = await fetch(`/api/holidays?year=${year}`);
      if (res.ok) {
        const data: Holiday[] = await res.json();
        const map = new Map<string, Holiday>();
        data.forEach((h) => map.set(h.date, h));
        setHolidays(map);
      }
    } catch {
      // silently fail
    }
    setLoadingHolidays(false);
  }, [year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

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
    const actualLeaves = records.filter((r) => r.status === "actual" && isInLeaveRange(day, r));
    const plannedLeaves = records.filter((r) => r.status === "planned" && isInLeaveRange(day, r));
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        {onDateClick && (
          <p className="text-xs text-muted-foreground mt-1">
            {selecting
              ? "Click another date to select a range \u00B7 Esc to cancel"
              : "Click a date to log a leave"}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((d) => (
            <div
              key={d}
              className={`text-center text-xs font-medium py-1 ${
                d === "Sat" || d === "Sun"
                  ? "text-red-400"
                  : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
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

            return (
              <div
                key={info.key}
                className={`relative flex flex-col items-center justify-center rounded-lg p-1 min-h-[40px] text-sm transition-colors ${bgClass} ${
                  info.today ? "ring-2 ring-primary ring-offset-1" : ""
                } ${clickable ? "cursor-pointer hover:bg-primary/10" : ""}`}
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
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-50 ring-1 ring-red-200 dark:bg-red-950 dark:ring-red-800" />
            Weekend
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-teal-500" />
            On Leave
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-teal-300 dark:bg-teal-600" />
            Planned
          </span>
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
          <div className="mt-4 pt-3 border-t space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
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
