"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Building2, CalendarDays, Users } from "lucide-react";
import { AdminDepartmentManager } from "@/components/admin-department-manager";
import { AdminLeaveManager } from "@/components/admin-leave-manager";
import { AdminUserManager } from "@/components/admin-user-manager";
import { cn } from "@/lib/utils";

type AdminTab = "leaves" | "departments" | "users";

export function AdminTabs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("leaves");

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border bg-card p-1" role="tablist" aria-label="Admin sections">
        <TabButton
          active={activeTab === "leaves"}
          onClick={() => setActiveTab("leaves")}
          label="All Leaves"
          icon={<CalendarDays className="size-4" />}
        />
        <TabButton
          active={activeTab === "departments"}
          onClick={() => setActiveTab("departments")}
          label="Departments"
          icon={<Building2 className="size-4" />}
        />
        {isSuperAdmin && (
          <TabButton
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            label="Allowed Users"
            icon={<Users className="size-4" />}
          />
        )}
      </div>

      {activeTab === "leaves" && <AdminLeaveManager />}
      {activeTab === "departments" && <AdminDepartmentManager />}
      {activeTab === "users" && isSuperAdmin && <AdminUserManager />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
