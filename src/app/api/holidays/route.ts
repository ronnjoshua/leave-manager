import { NextRequest, NextResponse } from "next/server";
import { getYear } from "date-fns";

export const dynamic = "force-dynamic";

export interface Holiday {
  date: string;
  localName: string;
  name: string;
}

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : getYear(new Date());

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/PH`,
      { next: { revalidate: 86400 } } // cache for 24 hours
    );

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    const holidays: Holiday[] = data.map(
      (h: { date: string; localName: string; name: string }) => ({
        date: h.date,
        localName: h.localName,
        name: h.name,
      })
    );

    return NextResponse.json(holidays);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
