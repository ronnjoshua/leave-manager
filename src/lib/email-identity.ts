import { eq, type SQL } from "drizzle-orm";
import { allowedUsers } from "@/lib/db/schema";

export function canonicalizeEmailIdentity(email: string): string {
  return email.trim().toLowerCase();
}

export function allowedUserEmailCondition(email: string): SQL {
  return eq(allowedUsers.email, canonicalizeEmailIdentity(email));
}
