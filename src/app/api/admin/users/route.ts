import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageAllowedUsers } from "@/lib/admin-authorization";
import { createAllowedUsersRouteHandlers } from "@/lib/admin-user-route-handlers";
import { db } from "@/lib/db";
import { allowedUsers } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

async function listAllowedUsers() {
  const users = await db
    .select()
    .from(allowedUsers)
    .orderBy(allowedUsers.createdAt);

  return NextResponse.json(users);
}

async function createAllowedUser(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const rawEmail = (body as Record<string, unknown>).email;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
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

const handlers = createAllowedUsersRouteHandlers(
  {
    getSessionEmail: async () => (await auth())?.user?.email,
    canManageAllowedUsers,
  },
  {
    get: listAllowedUsers,
    post: createAllowedUser,
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
