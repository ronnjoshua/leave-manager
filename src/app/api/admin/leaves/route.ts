import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveRecords, users } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { getYear } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentYear = getYear(new Date());
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? Number.parseInt(yearParam, 10) : currentYear;
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const [records, years] = await Promise.all([
    db
      .select({
        id: leaveRecords.id,
        userId: leaveRecords.userId,
        email: users.email,
        name: users.name,
        startDate: leaveRecords.startDate,
        endDate: leaveRecords.endDate,
        days: leaveRecords.days,
        type: leaveRecords.type,
        reason: leaveRecords.reason,
        status: leaveRecords.status,
        halfDay: leaveRecords.halfDay,
      })
      .from(leaveRecords)
      .leftJoin(users, eq(leaveRecords.userId, users.id))
      .where(eq(leaveRecords.year, year))
      .orderBy(asc(leaveRecords.startDate), asc(leaveRecords.createdAt)),
    db
      .selectDistinct({ year: leaveRecords.year })
      .from(leaveRecords)
      .orderBy(asc(leaveRecords.year)),
  ]);

  return NextResponse.json({
    year,
    currentYear,
    availableYears: Array.from(
      new Set([currentYear, ...years.map((entry) => entry.year)])
    ).sort((a, b) => b - a),
    records: records.map((record) => ({
      ...record,
      email: record.email ?? "Unknown user",
      status: record.status === "planned" ? "planned" : "actual",
      halfDay: record.halfDay === "AM" || record.halfDay === "PM" ? record.halfDay : null,
    })),
  });
}
