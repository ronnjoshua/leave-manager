"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Building2,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  groupUsersByDepartment,
  sortDepartmentsForDisplay,
  type DepartmentUser,
} from "@/lib/admin-department-ui";
import { getDescendantDepartmentIds } from "@/lib/departments";
import type { DepartmentNode } from "@/lib/departments";
import { cn } from "@/lib/utils";

type Department = DepartmentNode & {
  memberCount: number;
};

type DepartmentResponse = {
  departments: Department[];
  users: DepartmentUser[];
};

const ROOT_VALUE = "__root__";

async function responseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" && body.error ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function AdminDepartmentManager() {
  const [data, setData] = useState<DepartmentResponse | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(
    null
  );
  const [dataRevision, setDataRevision] = useState(0);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchDepartments = useCallback(async () => {
    const response = await fetch("/api/admin/departments");
    if (!response.ok) {
      throw new Error(
        await responseError(response, "Unable to load departments")
      );
    }
    return (await response.json()) as DepartmentResponse;
  }, []);

  const applyDepartmentData = useCallback((nextData: DepartmentResponse) => {
    setData(nextData);
    setSelectedDepartmentId((current) =>
      current && nextData.departments.some(({ id }) => id === current)
        ? current
        : (nextData.departments[0]?.id ?? null)
    );
    setDataRevision((current) => current + 1);
    setError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDepartments()
      .then((nextData) => {
        if (!cancelled) applyDepartmentData(nextData);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load departments"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyDepartmentData, fetchDepartments]);

  const departments = useMemo(() => data?.departments ?? [], [data]);
  const users = useMemo(() => data?.users ?? [], [data]);
  const departmentRows = useMemo(
    () => sortDepartmentsForDisplay(departments),
    [departments]
  );
  const selectedDepartment = departments.find(
    ({ id }) => id === selectedDepartmentId
  );
  const departmentNames = useMemo(
    () => new Map(departments.map(({ id, name }) => [id, name])),
    [departments]
  );

  async function mutate(
    action: string,
    input: RequestInfo,
    init: RequestInit
  ): Promise<Response | null> {
    setPendingAction(action);
    setError("");
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        throw new Error(await responseError(response, "Department update failed"));
      }
      applyDepartmentData(await fetchDepartments());
      return response;
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Department update failed"
      );
      return null;
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;
    const response = await mutate("create", "/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, parentId: newParentId }),
    });
    if (response) {
      const created = (await response.clone().json()) as Department;
      setNewName("");
      setNewParentId(null);
      setSelectedDepartmentId(created.id);
    }
  }

  if (loading && !data) {
    return <LoadingDepartments />;
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Departments could not be loaded</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchDepartments()
                .then(applyDepartmentData)
                .catch((loadError: unknown) =>
                  setError(
                    loadError instanceof Error
                      ? loadError.message
                      : "Unable to load departments"
                  )
                )
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4" />
                Create department
              </CardTitle>
              <CardDescription>
                Add a top-level department or place it under an existing one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-department-name">Name</Label>
                  <Input
                    id="new-department-name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. Engineering"
                    required
                  />
                </div>
                <ParentSelect
                  id="new-department-parent"
                  label="Parent department"
                  value={newParentId}
                  onValueChange={setNewParentId}
                  rows={departmentRows}
                />
                <Button type="submit" disabled={pendingAction !== null}>
                  <Plus />
                  {pendingAction === "create" ? "Creating..." : "Create"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4" />
                Department hierarchy
                <Badge variant="secondary" className="ml-auto">
                  {departments.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Select a department to edit its details and membership.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {departmentRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No departments yet. Create the first one above.
                </p>
              ) : (
                <div className="space-y-1" role="list" aria-label="Departments">
                  {departmentRows.map(({ department, depth }) => (
                    <button
                      key={department.id}
                      type="button"
                      role="listitem"
                      onClick={() => setSelectedDepartmentId(department.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg py-2 pr-3 text-left text-sm transition-colors",
                        selectedDepartmentId === department.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                    >
                      {depth > 0 ? (
                        <ChevronRight className="size-3.5 opacity-60" />
                      ) : (
                        <Building2 className="size-3.5" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {department.name}
                      </span>
                      <span className="text-xs opacity-75">
                        {department.memberCount}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedDepartment ? (
          <div className="space-y-6">
            <DepartmentDetails
              key={`${selectedDepartment.id}:${dataRevision}`}
              department={selectedDepartment}
              departments={departments}
              departmentRows={departmentRows}
              users={users}
              departmentNames={departmentNames}
              pendingAction={pendingAction}
              mutate={mutate}
            />
          </div>
        ) : (
          <Card className="min-h-64 items-center justify-center">
            <CardContent className="text-center text-sm text-muted-foreground">
              Create a department to begin assigning employees.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DepartmentDetails({
  department,
  departments,
  departmentRows,
  users,
  departmentNames,
  pendingAction,
  mutate,
}: {
  department: Department;
  departments: Department[];
  departmentRows: ReturnType<typeof sortDepartmentsForDisplay<Department>>;
  users: DepartmentUser[];
  departmentNames: Map<string, string>;
  pendingAction: string | null;
  mutate: (
    action: string,
    input: RequestInfo,
    init: RequestInit
  ) => Promise<Response | null>;
}) {
  const [editName, setEditName] = useState(department.name);
  const [editParentId, setEditParentId] = useState<string | null>(
    department.parentId
  );
  const membersByDepartment = useMemo(
    () => groupUsersByDepartment(users),
    [users]
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    () =>
      new Set(
        (membersByDepartment.get(department.id) ?? []).map(({ id }) => id)
      )
  );
  const excludedParentIds = useMemo(
    () =>
      new Set(getDescendantDepartmentIds(departments, department.id)),
    [department.id, departments]
  );
  const editParentOptions = departmentRows.filter(
    ({ department: option }) => !excludedParentIds.has(option.id)
  );

  async function handleSaveDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editName.trim()) return;
    await mutate("edit", `/api/admin/departments/${department.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, parentId: editParentId }),
    });
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${department.name}? Its employees will become unassigned and its direct child departments will be promoted.`
    );
    if (!confirmed) return;
    await mutate("delete", `/api/admin/departments/${department.id}`, {
      method: "DELETE",
    });
  }

  async function handleSaveMembers() {
    await mutate(
      "members",
      `/api/admin/departments/${department.id}/members`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selectedMemberIds] }),
      }
    );
  }

  function toggleMember(userId: string, checked: boolean) {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage {department.name}</CardTitle>
          <CardDescription>
            Rename this department or move it elsewhere in the hierarchy. It
            cannot be placed beneath itself or one of its descendants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDepartment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-department-name">Name</Label>
              <Input
                id="edit-department-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </div>
            <ParentSelect
              id="edit-department-parent"
              label="Parent department"
              value={editParentId}
              onValueChange={setEditParentId}
              rows={editParentOptions}
            />
            <div className="flex flex-wrap justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={pendingAction !== null}
              >
                <Trash2 />
                {pendingAction === "delete" ? "Deleting..." : "Delete"}
              </Button>
              <Button type="submit" disabled={pendingAction !== null}>
                <Save />
                {pendingAction === "edit" ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Employees
            <Badge variant="secondary" className="ml-auto">
              {selectedMemberIds.size}
            </Badge>
          </CardTitle>
          <CardDescription>
            Choose this department&apos;s complete member list. Selecting an
            employee assigned elsewhere moves them here; deselecting a current
            member leaves them unassigned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No allowed users are available to assign.
            </p>
          ) : (
            <div className="max-h-[28rem] divide-y overflow-y-auto rounded-lg border">
              {users.map((user) => {
                const checked = selectedMemberIds.has(user.id);
                const currentDepartmentName = user.departmentId
                  ? departmentNames.get(user.departmentId) ?? "Unknown department"
                  : "Unassigned";
                const moving =
                  checked &&
                  user.departmentId !== null &&
                  user.departmentId !== department.id;
                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={checked}
                      onChange={(event) =>
                        toggleMember(user.id, event.target.checked)
                      }
                      disabled={pendingAction !== null}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {user.email}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {user.departmentId === department.id
                          ? `Currently in ${department.name}`
                          : `Currently: ${currentDepartmentName}`}
                        {moving ? ` · Will move to ${department.name}` : ""}
                      </span>
                    </span>
                    {user.isAdmin && <Badge variant="outline">Admin</Badge>}
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSaveMembers}
              disabled={pendingAction !== null}
            >
              <Save />
              {pendingAction === "members"
                ? "Saving assignments..."
                : "Save assignments"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ParentSelect({
  id,
  label,
  value,
  onValueChange,
  rows,
}: {
  id: string;
  label: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  rows: ReturnType<typeof sortDepartmentsForDisplay>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? ROOT_VALUE}
        onValueChange={(nextValue) =>
          onValueChange(nextValue === ROOT_VALUE || !nextValue ? null : nextValue)
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ROOT_VALUE}>No parent (top level)</SelectItem>
          {rows.map(({ department, depth }) => (
            <SelectItem key={department.id} value={department.id}>
              {`${"— ".repeat(depth)}${department.name}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LoadingDepartments() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading departments...</p>
      </div>
    </div>
  );
}
