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
import { LogOut, Shield, Menu, BookOpen, User } from "lucide-react";
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
    <div className="flex items-center gap-2">
      {/* Desktop: full layout */}
      <div className="hidden md:flex items-center gap-2">
        <div className="text-right mr-1">
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
        <ThemeToggle />
        {isAdmin && (
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
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

      {/* Mobile: avatar + dropdown */}
      <div className="flex md:hidden items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors outline-none">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="size-7 rounded-full ring-2 ring-border"
                  />
                ) : (
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center">
                    <User className="size-3.5 text-muted-foreground" />
                  </div>
                )}
                <Menu className="size-4 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={8}>
            <div className="px-2 py-2">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
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
