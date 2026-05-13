import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedUsers } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db
    .select()
    .from(allowedUsers)
    .orderBy(allowedUsers.createdAt);

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const [user] = await db
      .insert(allowedUsers)
      .values({ email, isAdmin: false })
      .returning();
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 409 }
    );
  }
}
