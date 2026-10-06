"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Building2, CalendarDays, Users } from "lucide-react";
import { AdminDepartmentManager } from "@/components/admin-department-manager";
import { AdminLeaveManager } from "@/components/admin-leave-manager";
import { AdminUserManager } from "@/components/admin-user-manager";
import { getNextAdminTab, type AdminTab } from "@/lib/admin-tabs";
import { cn } from "@/lib/utils";

export function AdminTabs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("leaves");
  const tabRefs = useRef(new Map<AdminTab, HTMLButtonElement>());
  const availableTabs: AdminTab[] = isSuperAdmin
    ? ["leaves", "departments", "users"]
    : ["leaves", "departments"];

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: AdminTab
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const nextTab = getNextAdminTab(availableTabs, currentTab, event.key);
    setActiveTab(nextTab);
    tabRefs.current.get(nextTab)?.focus();
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border bg-card p-1" role="tablist" aria-label="Admin sections">
        <TabButton
          tab="leaves"
          active={activeTab === "leaves"}
          onClick={() => setActiveTab("leaves")}
          onKeyDown={(event) => handleKeyDown(event, "leaves")}
          setRef={(element) => {
            if (element) tabRefs.current.set("leaves", element);
            else tabRefs.current.delete("leaves");
          }}
          label="All Leaves"
          icon={<CalendarDays className="size-4" />}
        />
        <TabButton
          tab="departments"
          active={activeTab === "departments"}
          onClick={() => setActiveTab("departments")}
          onKeyDown={(event) => handleKeyDown(event, "departments")}
          setRef={(element) => {
            if (element) tabRefs.current.set("departments", element);
            else tabRefs.current.delete("departments");
          }}
          label="Departments"
          icon={<Building2 className="size-4" />}
        />
        {isSuperAdmin && (
          <TabButton
            tab="users"
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            onKeyDown={(event) => handleKeyDown(event, "users")}
            setRef={(element) => {
              if (element) tabRefs.current.set("users", element);
              else tabRefs.current.delete("users");
            }}
            label="Allowed Users"
            icon={<Users className="size-4" />}
          />
        )}
      </div>

      <div
        id="admin-panel-leaves"
        role="tabpanel"
        aria-labelledby="admin-tab-leaves"
        tabIndex={0}
        hidden={activeTab !== "leaves"}
      >
        {activeTab === "leaves" && <AdminLeaveManager />}
      </div>
      <div
        id="admin-panel-departments"
        role="tabpanel"
        aria-labelledby="admin-tab-departments"
        tabIndex={0}
        hidden={activeTab !== "departments"}
      >
        {activeTab === "departments" && <AdminDepartmentManager />}
      </div>
      {isSuperAdmin && (
        <div
          id="admin-panel-users"
          role="tabpanel"
          aria-labelledby="admin-tab-users"
          tabIndex={0}
          hidden={activeTab !== "users"}
        >
          {activeTab === "users" && <AdminUserManager />}
        </div>
      )}
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
  onKeyDown,
  setRef,
  label,
  icon,
}: {
  tab: AdminTab;
  active: boolean;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  setRef: (element: HTMLButtonElement | null) => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`admin-tab-${tab}`}
      aria-controls={`admin-panel-${tab}`}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      ref={setRef}
      onClick={onClick}
      onKeyDown={onKeyDown}
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
