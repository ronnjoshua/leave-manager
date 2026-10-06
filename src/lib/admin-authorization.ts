import { isSuperAdmin } from "@/lib/departments";

export function canManageAllowedUsers(
  email: string | null | undefined
): boolean {
  return isSuperAdmin(email);
}
