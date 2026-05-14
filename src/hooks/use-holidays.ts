"use client";

import { useCallback, useEffect, useState } from "react";

interface Holiday {
  date: string;
  localName: string;
  name: string;
}

export function useHolidays(year: number) {
  const [holidays, setHolidays] = useState<Map<string, Holiday>>(new Map());
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays?year=${year}`);
      if (res.ok) {
        const data: Holiday[] = await res.json();
        const map = new Map<string, Holiday>();
        const set = new Set<string>();
        data.forEach((h) => {
          map.set(h.date, h);
          set.add(h.date);
        });
        setHolidays(map);
        setHolidaySet(set);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  return { holidays, holidaySet, loading };
}
