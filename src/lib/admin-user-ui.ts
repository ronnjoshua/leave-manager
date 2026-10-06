import { isSuperAdmin } from "@/lib/departments";

export type AllowedUserControls = {
  isProtected: boolean;
  roleAction: "grant" | "revoke" | null;
  canRemove: boolean;
};

export function getAllowedUserControls(user: {
  email: string;
  isAdmin: boolean;
}): AllowedUserControls {
  if (isSuperAdmin(user.email)) {
    return {
      isProtected: true,
      roleAction: null,
      canRemove: false,
    };
  }

  return {
    isProtected: false,
    roleAction: user.isAdmin ? "revoke" : "grant",
    canRemove: true,
  };
}
