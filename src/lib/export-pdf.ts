import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { LeaveRecord } from "./types";

interface PdfData {
  year: number;
  employeeName: string;
  employmentStatus: string;
  startDate: string | null;
  carryOver: number;
  accrued: number;
  totalUsed: number;
  available: number;
  forecast: number;
  records: LeaveRecord[];
}

export function exportToPdf(data: PdfData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Leave Summary Report", pageWidth / 2, 20, { align: "center" });

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.employeeName} — ${data.year}`, pageWidth / 2, 28, {
    align: "center",
  });
  doc.text(
    `Generated on ${format(new Date(), "MMMM d, yyyy")}`,
    pageWidth / 2,
    34,
    { align: "center" }
  );

  // Summary table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 46);

  autoTable(doc, {
    startY: 50,
    theme: "grid",
    headStyles: { fillColor: [71, 145, 130] },
    body: [
      ["Employment Status", data.employmentStatus],
      ...(data.startDate
        ? [
            [
              "Start Date",
              format(new Date(data.startDate), "MMMM d, yyyy"),
            ],
          ]
        : []),
      ["Carry-over from " + (data.year - 1), data.carryOver.toFixed(1) + " days"],
      ["Accrued (" + data.year + ")", data.accrued.toFixed(1) + " days"],
      ["Total Used", data.totalUsed.toFixed(1) + " days"],
      ["Available Balance", data.available.toFixed(1) + " days"],
      ["Year-end Forecast", data.forecast.toFixed(1) + " days"],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
    },
  });

  // Leave records table
  const actualRecords = data.records.filter((r) => r.status === "actual");
  if (actualRecords.length > 0) {
    const finalY = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((doc as any).lastAutoTable?.finalY as number) ??120;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Leave Records", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      theme: "striped",
      headStyles: { fillColor: [71, 145, 130] },
      head: [["Date", "Days", "Type", "Source", "Reason"]],
      body: actualRecords.map((r) => {
        const start = format(new Date(r.startDate), "MMM d");
        const end = format(new Date(r.endDate), "MMM d, yyyy");
        const dateStr =
          r.startDate === r.endDate
            ? format(new Date(r.startDate), "MMM d, yyyy")
            : `${start} - ${end}`;
        return [dateStr, r.days.toString(), r.type, r.source, r.reason];
      }),
    });
  }

  // Planned leaves
  const plannedRecords = data.records.filter((r) => r.status === "planned");
  if (plannedRecords.length > 0) {
    const finalY = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((doc as any).lastAutoTable?.finalY as number) ??180;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Planned Leaves", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      theme: "striped",
      headStyles: { fillColor: [180, 140, 60] },
      head: [["Date", "Days", "Type", "Source", "Reason"]],
      body: plannedRecords.map((r) => {
        const start = format(new Date(r.startDate), "MMM d");
        const end = format(new Date(r.endDate), "MMM d, yyyy");
        const dateStr =
          r.startDate === r.endDate
            ? format(new Date(r.startDate), "MMM d, yyyy")
            : `${start} - ${end}`;
        return [dateStr, r.days.toString(), r.type, r.source, r.reason];
      }),
    });
  }

  doc.save(`leave-report-${data.year}.pdf`);
}
