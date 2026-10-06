export type AdminTab = "leaves" | "departments" | "users";

export function getAvailableAdminTabs(isSuperAdmin: boolean): AdminTab[] {
  return isSuperAdmin
    ? ["leaves", "departments", "users"]
    : ["leaves", "departments"];
}

export function getNextAdminTab(
  tabs: AdminTab[],
  current: AdminTab,
  key: string
): AdminTab {
  if (tabs.length === 0) return current;
  if (key === "Home") return tabs[0];
  if (key === "End") return tabs[tabs.length - 1];
  if (key !== "ArrowLeft" && key !== "ArrowRight") return current;

  const currentIndex = Math.max(0, tabs.indexOf(current));
  const offset = key === "ArrowRight" ? 1 : -1;
  return tabs[(currentIndex + offset + tabs.length) % tabs.length];
}
