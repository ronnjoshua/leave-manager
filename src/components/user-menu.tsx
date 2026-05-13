"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";

interface UserMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isAdmin?: boolean;
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium leading-none">{user?.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
      </div>
      {user?.image && (
        <img
          src={user.image}
          alt={user.name ?? "User"}
          className="size-8 rounded-full ring-2 ring-border"
        />
      )}
      {isAdmin && (
        <Link href="/admin">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <Shield className="size-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        </Link>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => signOut()}
      >
        <LogOut className="size-3.5" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}
