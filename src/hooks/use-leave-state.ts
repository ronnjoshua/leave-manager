"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LeaveRecord } from "@/lib/types";
import type { EmploymentStatus } from "@/lib/leave-calculator";

interface LeaveData {
  year: number;
  currentYear: number;
  availableYears: number[];
  carryOver: number;
  employmentStatus: EmploymentStatus;
  startDate: string | null;
  records: LeaveRecord[];
}

export function useLeaveState() {
  const [data, setData] = useState<LeaveData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewingYear, setViewingYear] = useState<number | null>(null);

  const fetchData = useCallback(async (year?: number) => {
    const url = year ? `/api/leave?year=${year}` : "/api/leave";
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    fetchData(viewingYear ?? undefined);
  }, [fetchData, viewingYear]);

  const switchYear = useCallback((year: number) => {
    setIsLoaded(false);
    setViewingYear(year);
  }, []);

  const addRecord = useCallback(
    async (record: Omit<LeaveRecord, "id" | "createdAt">) => {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const newRecord = await res.json();
        setData((prev) => {
          if (!prev) return prev;
          return { ...prev, records: [newRecord, ...prev.records] };
        });
        toast.success(
          record.status === "planned"
            ? "Planned leave saved"
            : "Leave logged successfully"
        );
      } else {
        toast.error("Failed to save leave");
      }
    },
    []
  );

  const updateRecord = useCallback(
    async (
      id: string,
      updates: Partial<Omit<LeaveRecord, "id" | "createdAt">>
    ) => {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            records: prev.records.map((r) => (r.id === id ? updated : r)),
          };
        });
        toast.success("Leave updated");
      } else {
        toast.error("Failed to update leave");
      }
    },
    []
  );

  const removeRecord = useCallback(async (id: string) => {
    const res = await fetch(`/api/leave/${id}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, records: prev.records.filter((r) => r.id !== id) };
      });
      toast.success("Leave removed");
    } else {
      toast.error("Failed to remove leave");
    }
  }, []);

  const setCarryOver = useCallback(async (carryOver: number) => {
    const capped = Math.min(Math.max(carryOver, 0), 5);
    const res = await fetch("/api/leave/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carryOver: capped }),
    });
    if (res.ok) {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, carryOver: capped };
      });
    }
  }, []);

  const updateSettings = useCallback(
    async (settings: {
      employmentStatus?: EmploymentStatus;
      startDate?: string | null;
      carryOver?: number;
    }) => {
      const res = await fetch("/api/leave/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            carryOver: updated.carryOver ?? prev.carryOver,
            employmentStatus:
              updated.employmentStatus ?? prev.employmentStatus,
            startDate: updated.startDate ?? prev.startDate,
          };
        });
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    },
    []
  );

  const confirmPlanned = useCallback(async (id: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "actual" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.map((r) => (r.id === id ? updated : r)),
        };
      });
      toast.success("Leave confirmed");
    } else {
      toast.error("Failed to confirm leave");
    }
  }, []);

  const actualRecords =
    data?.records.filter((r) => r.status === "actual") ?? [];
  const plannedRecords =
    data?.records.filter((r) => r.status === "planned") ?? [];

  const totalUsed = actualRecords.reduce((sum, r) => sum + r.days, 0);
  const totalPlanned = plannedRecords.reduce((sum, r) => sum + r.days, 0);
  const carryOverUsed = actualRecords
    .filter((r) => r.source === "Carry-over")
    .reduce((sum, r) => sum + r.days, 0);

  const isViewingCurrentYear = !data || data.year === data.currentYear;

  const state = data
    ? {
        year: data.year,
        currentYear: data.currentYear,
        availableYears: data.availableYears,
        carryOver: data.carryOver,
        employmentStatus: data.employmentStatus,
        startDate: data.startDate,
        records: data.records,
        previousYears: [] as {
          year: number;
          carryOver: number;
          records: LeaveRecord[];
        }[],
      }
    : null;

  return {
    state,
    isLoaded,
    isViewingCurrentYear,
    switchYear,
    addRecord,
    updateRecord,
    removeRecord,
    confirmPlanned,
    setCarryOver,
    updateSettings,
    totalUsed,
    totalPlanned,
    carryOverUsed,
  };
}
