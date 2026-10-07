import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  allowedUsers,
  departments,
  leaveRecords,
  users,
} from "@/lib/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getYear } from "date-fns";
import {
  canonicalizeEmailIdentity,
  filterEmployeesForDepartment,
  getAdminLeaveAvailableYears,
  resolveAdminLeaveName,
} from "@/lib/admin-leaves";

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

  const departmentId = req.nextUrl.searchParams.get("departmentId") ?? "all";
  const departmentRows = await db
    .select({
      id: departments.id,
      name: departments.name,
      parentId: departments.parentId,
    })
    .from(departments)
    .orderBy(asc(departments.name));

  if (
    departmentId !== "all" &&
    !departmentRows.some((department) => department.id === departmentId)
  ) {
    return NextResponse.json(
      { error: "Department not found" },
      { status: 404 }
    );
  }

  const employeeRows = await db
    .select({
      email: allowedUsers.email,
      departmentId: allowedUsers.departmentId,
    })
    .from(allowedUsers);
  const visibleEmployeeRows =
    departmentId === "all"
      ? employeeRows
      : filterEmployeesForDepartment(departmentRows, employeeRows, departmentId);
  const scopedEmployeeEmails = Array.from(
    new Set(
      visibleEmployeeRows.map((employee) =>
        canonicalizeEmailIdentity(employee.email)
      )
    )
  );

  const departmentCondition =
    scopedEmployeeEmails.length > 0
      ? inArray(sql<string>`lower(trim(${users.email}))`, scopedEmployeeEmails)
      : sql<boolean>`false`;

  const [records, years] = await Promise.all([
    db
      .select({
        id: leaveRecords.id,
        userId: leaveRecords.userId,
        email: users.email,
        customName: users.displayName,
        providerName: users.name,
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
      .where(and(eq(leaveRecords.year, year), departmentCondition))
      .orderBy(asc(leaveRecords.startDate), asc(leaveRecords.createdAt)),
    db
      .selectDistinct({ year: leaveRecords.year })
      .from(leaveRecords)
      .leftJoin(users, eq(leaveRecords.userId, users.id))
      .where(departmentCondition)
      .orderBy(asc(leaveRecords.year)),
  ]);

  return NextResponse.json({
    year,
    currentYear,
    departmentId,
    departments: departmentRows,
    availableYears: getAdminLeaveAvailableYears(
      currentYear,
      year,
      years.map((entry) => entry.year)
    ),
    records: records.map((record) => ({
      ...record,
      email: record.email ?? "Unknown user",
      name: resolveAdminLeaveName(record.customName, record.providerName, record.email ?? "Unknown user"),
      status: record.status === "planned" ? "planned" : "actual",
      halfDay: record.halfDay === "AM" || record.halfDay === "PM" ? record.halfDay : null,
    })),
  });
}
