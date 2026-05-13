"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Plus, Trash2, UserPlus, Users } from "lucide-react";

interface AllowedUser {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export function AdminUserManager() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
      const data = await res.json();
      setError(data.error || "Failed to add user");
    }
    setAdding(false);
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to remove user");
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
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                    <TableCell className="text-right">
                      {user.isAdmin ? (
                        <span className="text-xs text-muted-foreground">
                          Protected
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(user.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
