import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveRecords, leaveSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getYear, differenceInMonths, parseISO } from "date-fns";
import {
  getAccruedLeaves,
  MAX_CARRY_OVER,
} from "@/lib/leave-calculator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentYear = getYear(new Date());
  const yearParam = req.nextUrl.searchParams.get("year");
  const requestedYear = yearParam ? parseInt(yearParam) : currentYear;
  const userId = session.user.id;

  let [settings] = await db
    .select()
    .from(leaveSettings)
    .where(
      and(
        eq(leaveSettings.userId, userId),
        eq(leaveSettings.year, requestedYear)
      )
    );

  // Auto year-rollover: if no settings for current year, calculate carry-over from last year
  if (!settings && requestedYear === currentYear) {
    const prevYear = currentYear - 1;

    const [prevSettings] = await db
      .select()
      .from(leaveSettings)
      .where(
        and(
          eq(leaveSettings.userId, userId),
          eq(leaveSettings.year, prevYear)
        )
      );

    const prevRecords = await db
      .select()
      .from(leaveRecords)
      .where(
        and(eq(leaveRecords.userId, userId), eq(leaveRecords.year, prevYear))
      );

    let carryOver = 0;
    if (prevSettings) {
      const prevCarryOver = Math.min(prevSettings.carryOver, MAX_CARRY_OVER);
      const prevAccrued = getAccruedLeaves(
        prevYear,
        new Date(prevYear, 11, 31), // Dec 31 of prev year
        (prevSettings.employmentStatus as "regular" | "probationary") ?? "regular",
        prevSettings.startDate
      );
      const prevUsed = prevRecords.reduce((sum, r) => sum + r.days, 0);
      const prevRemaining = prevCarryOver + prevAccrued - prevUsed;
      carryOver = Math.min(Math.max(prevRemaining, 0), MAX_CARRY_OVER);
    }

    // Create settings for current year with carry-over
    const [newSettings] = await db
      .insert(leaveSettings)
      .values({
        userId,
        year: currentYear,
        carryOver,
        employmentStatus: prevSettings?.employmentStatus ?? "regular",
        startDate: prevSettings?.startDate ?? null,
      })
      .returning();

    settings = newSettings;
  }

  // Auto-convert probationary to regular after 6 months (only for current year)
  let employmentStatus = settings?.employmentStatus ?? "regular";
  if (
    requestedYear === currentYear &&
    employmentStatus === "probationary" &&
    settings?.startDate &&
    differenceInMonths(new Date(), parseISO(settings.startDate)) >= 6
  ) {
    employmentStatus = "regular";
    await db
      .update(leaveSettings)
      .set({ employmentStatus: "regular", updatedAt: new Date() })
      .where(
        and(
          eq(leaveSettings.userId, userId),
          eq(leaveSettings.year, requestedYear)
        )
      );
  }

  const records = await db
    .select()
    .from(leaveRecords)
    .where(
      and(
        eq(leaveRecords.userId, userId),
        eq(leaveRecords.year, requestedYear)
      )
    )
    .orderBy(leaveRecords.createdAt);

  // Get all years that have records or settings
  const recordYears = await db
    .selectDistinct({ year: leaveRecords.year })
    .from(leaveRecords)
    .where(eq(leaveRecords.userId, userId));

  const settingYears = await db
    .selectDistinct({ year: leaveSettings.year })
    .from(leaveSettings)
    .where(eq(leaveSettings.userId, userId));

  const allYears = [
    ...new Set([
      currentYear,
      ...recordYears.map((r) => r.year),
      ...settingYears.map((s) => s.year),
    ]),
  ].sort((a, b) => b - a);

  return NextResponse.json({
    year: requestedYear,
    currentYear,
    availableYears: allYears,
    carryOver: settings?.carryOver ?? 0,
    employmentStatus,
    startDate: settings?.startDate ?? null,
    records: records.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      type: r.type,
      source: r.source,
      reason: r.reason,
      status: r.status ?? "actual",
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userId = session.user.id;
  // Use the year from the leave start date, not the current year
  const leaveYear = body.startDate
    ? getYear(parseISO(body.startDate))
    : getYear(new Date());

  const [record] = await db
    .insert(leaveRecords)
    .values({
      userId,
      year: leaveYear,
      startDate: body.startDate,
      endDate: body.endDate,
      days: body.days,
      type: body.type,
      source: body.source,
      reason: body.reason,
      status: body.status ?? "actual",
    })
    .returning();

  return NextResponse.json({
    id: record.id,
    startDate: record.startDate,
    endDate: record.endDate,
    days: record.days,
    type: record.type,
    source: record.source,
    reason: record.reason,
    status: record.status ?? "actual",
    createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
  });
}
