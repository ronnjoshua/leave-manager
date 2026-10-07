import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Avatar file is required" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Avatar must be a JPG, PNG, or WebP image" },
      { status: 400 }
    );
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Avatar must be 2 MB or smaller" },
      { status: 400 }
    );
  }

  try {
    const blob = await put(`avatars/${session.user.id}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    await db
      .update(users)
      .set({ customImageUrl: blob.url })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ image: blob.url, hasCustomImage: true });
  } catch {
    return NextResponse.json(
      { error: "Avatar storage is not configured" },
      { status: 503 }
    );
  }
}
