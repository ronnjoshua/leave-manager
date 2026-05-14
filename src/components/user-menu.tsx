"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Shield, ChevronDown, BookOpen, User } from "lucide-react";
import Link from "next/link";

interface UserMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isAdmin?: boolean;
}

function UserAvatar({
  user,
  size = "sm",
}: {
  user?: UserMenuProps["user"];
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "size-9" : "size-7";

  if (user?.image) {
    return (
      <img
        src={user.image}
        alt={user.name ?? "User"}
        className={`${sizeClass} rounded-full ring-2 ring-border object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center`}
    >
      <User className="size-3.5 text-primary" />
    </div>
  );
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <ThemeToggle />

      {/* Desktop: full layout */}
      <div className="hidden md:flex items-center gap-2">
        <div className="text-right mr-0.5">
          <p className="text-sm font-medium leading-none">{user?.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
        </div>
        <UserAvatar user={user} size="md" />
        {isAdmin && (
          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
            >
              <Shield className="size-3.5" />
              Admin
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
          Sign out
        </Button>
      </div>

      {/* Mobile: avatar + chevron dropdown */}
      <div className="flex md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-1 rounded-full pl-0.5 pr-1.5 py-0.5 hover:bg-accent transition-colors outline-none">
                <UserAvatar user={user} />
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={8}>
            <div className="flex items-center gap-2.5 px-2 py-2.5">
              <UserAvatar user={user} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <Link href="/policy">
              <DropdownMenuItem>
                <BookOpen className="size-4 mr-2" />
                Leave Policy
              </DropdownMenuItem>
            </Link>
            {isAdmin && (
              <Link href="/admin">
                <DropdownMenuItem>
                  <Shield className="size-4 mr-2" />
                  Admin Panel
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
