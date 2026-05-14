export const LEAVE_TYPES = [
  "Vacation",
  "Sick",
  "Emergency",
  "Personal",
  "Maternity/Paternity",
  "Bereavement",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_SOURCES = ["Current Year", "Carry-over"] as const;

export type LeaveSource = (typeof LEAVE_SOURCES)[number];

export const LEAVE_STATUSES = ["actual", "planned"] as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export interface LeaveRecord {
  id: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  days: number; // business days (auto-calculated or manually overridden)
  type: LeaveType;
  source: LeaveSource;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

export interface LeaveState {
  year: number;
  carryOver: number; // leaves carried from previous year (max 6)
  records: LeaveRecord[];
  previousYears?: PreviousYearData[];
}

export interface PreviousYearData {
  year: number;
  carryOver: number;
  records: LeaveRecord[];
}
