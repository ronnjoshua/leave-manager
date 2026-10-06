"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { getAllowedUserControls } from "@/lib/admin-user-ui";

interface AllowedUser {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" && body.error ? body.error : fallback;
  } catch {
    return fallback;
  }
}

async function requestAllowedUsers(): Promise<AllowedUser[]> {
  const response = await fetch("/api/admin/users");
  if (!response.ok) {
    throw new Error(await responseError(response, "Failed to load users"));
  }
  return (await response.json()) as AllowedUser[];
}

export function AdminUserManager({
  canManageRoles,
}: {
  canManageRoles: boolean;
}) {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    requestAllowedUsers()
      .then((nextUsers) => {
        if (!cancelled) {
          setUsers(nextUsers);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load users"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setAdding(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      const user = await res.json();
      setUsers((prev) => [...prev, user]);
      setNewEmail("");
    } else {
      setError(await responseError(res, "Failed to add user"));
    }
    setAdding(false);
  }

  async function handleRoleChange(user: AllowedUser) {
    if (!canManageRoles) return;
    setPendingUserId(user.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !user.isAdmin }),
      });
      if (!res.ok) {
        throw new Error(await responseError(res, "Failed to update user role"));
      }
      const updated = (await res.json()) as AllowedUser;
      setUsers((current) =>
        current.map((candidate) =>
          candidate.id === updated.id ? updated : candidate
        )
      );
    } catch (roleError) {
      setError(
        roleError instanceof Error
          ? roleError.message
          : "Failed to update user role"
      );
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleRemove(user: AllowedUser) {
    if (!window.confirm(`Remove access for ${user.email}?`)) return;
    setPendingUserId(user.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await responseError(res, "Failed to remove user"));
      }
      setUsers((prev) => prev.filter((candidate) => candidate.id !== user.id));
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove user"
      );
    } finally {
      setPendingUserId(null);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {/* Add User */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="size-4" />
            Add Allowed User
          </CardTitle>
          <CardDescription>
            Enter an email address to grant access to the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-email" className="sr-only">
                Email
              </Label>
              <Input
                id="new-email"
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setError("");
                }}
                required
              />
            </div>
            <Button type="submit" className="gap-2" disabled={adding}>
              <Plus className="size-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            Allowed Users
            <Badge variant="secondary" className="ml-auto tabular-nums">
              {users.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Users who can sign in with Google or GitHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users added yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const controls = getAllowedUserControls(user);
                  const pending = pendingUserId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {controls.isProtected ? (
                          <span className="text-xs text-muted-foreground">
                            Fixed superadmin
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {canManageRoles && controls.roleAction && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRoleChange(user)}
                                disabled={pending}
                                aria-label={`${controls.roleAction === "grant" ? "Grant" : "Revoke"} admin access for ${user.email}`}
                              >
                                <ShieldCheck />
                                {controls.roleAction === "grant"
                                  ? "Grant admin"
                                  : "Revoke admin"}
                              </Button>
                            )}
                            {controls.canRemove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemove(user)}
                                disabled={pending}
                                aria-label={`Remove access for ${user.email}`}
                              >
                                <Trash2 />
                                Remove
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
