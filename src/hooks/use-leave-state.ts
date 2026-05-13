"use client";

import { useCallback, useEffect, useState } from "react";
import { LeaveRecord } from "@/lib/types";

interface LeaveData {
  year: number;
  carryOver: number;
  records: LeaveRecord[];
}

export function useLeaveState() {
  const [data, setData] = useState<LeaveData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/leave");
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    }
  }, []);

  const setCarryOver = useCallback(async (carryOver: number) => {
    const capped = Math.min(Math.max(carryOver, 0), 6);
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

  const totalUsed =
    data?.records.reduce((sum, r) => sum + r.days, 0) ?? 0;
  const carryOverUsed =
    data?.records
      .filter((r) => r.source === "Carry-over")
      .reduce((sum, r) => sum + r.days, 0) ?? 0;

  // Map to the shape the dashboard expects
  const state = data
    ? {
        year: data.year,
        carryOver: data.carryOver,
        records: data.records,
        previousYears: [] as { year: number; carryOver: number; records: LeaveRecord[] }[],
      }
    : null;

  return {
    state,
    isLoaded,
    addRecord,
    updateRecord,
    removeRecord,
    setCarryOver,
    totalUsed,
    carryOverUsed,
  };
}
