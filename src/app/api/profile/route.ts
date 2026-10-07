import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      displayName: users.displayName,
      customImageUrl: users.customImageUrl,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  return user ?? null;
}

function profileResponse(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return {
    name: user.displayName ?? user.name,
    email: user.email,
    image: user.customImageUrl ?? user.image,
    hasCustomName: Boolean(user.displayName),
    hasCustomImage: Boolean(user.customImageUrl),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(profileResponse(user));
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawName = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).displayName
    : undefined;
  if (typeof rawName !== "string") {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  const displayName = rawName.trim();
  if (displayName.length > 100) {
    return NextResponse.json({ error: "Display name must be 100 characters or fewer" }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ displayName: displayName || null })
    .where(eq(users.id, user.id))
    .returning({ displayName: users.displayName });

  return NextResponse.json({
    name: updated.displayName ?? user.name,
    hasCustomName: Boolean(updated.displayName),
  });
}
