import { addDays, format } from "date-fns";
import type { Weekday } from "./types";

export const SESSION_MINUTES = 60;

export const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

export function weekdayName(day: Weekday, style: "short" | "long" = "long") {
  const d = WEEKDAYS.find((w) => w.value === day)!;
  return style === "short" ? d.short : d.long;
}

/** Local YYYY-MM-DD for a Date. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function weekdayOf(key: string): Weekday {
  return fromDateKey(key).getDay() as Weekday;
}

export function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatRange(start: number, end: number) {
  return `${formatMinutes(start)} – ${formatMinutes(end)}`;
}

export function formatDateLong(key: string) {
  return format(fromDateKey(key), "EEEE, MMMM d");
}

export function formatDateShort(key: string) {
  return format(fromDateKey(key), "EEE, MMM d");
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** Compare a (date, minutes) moment against now. */
export function isPast(dateKey: string, minutes: number, now: Date) {
  const todayKey = toDateKey(now);
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  return minutes <= minutesOfDay(now);
}

/** The next date strictly after `from` that falls on `weekday`, plus extra weeks. */
export function nextWeekday(from: Date, weekday: Weekday, extraWeeks = 0): string {
  let diff = (weekday - from.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return toDateKey(addDays(from, diff + extraWeeks * 7));
}

/** The most recent date strictly before `from` that falls on `weekday`, minus extra weeks. */
export function previousWeekday(from: Date, weekday: Weekday, extraWeeks = 0): string {
  let diff = (from.getDay() - weekday + 7) % 7;
  if (diff === 0) diff = 7;
  return toDateKey(addDays(from, -(diff + extraWeeks * 7)));
}

export function upcomingDateKeys(now: Date, days: number): string[] {
  return Array.from({ length: days }, (_, i) => toDateKey(addDays(now, i)));
}

/** "14:30" -> 870 */
export function parseTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 870 -> "14:30" */
export function toTimeInput(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function formatTimestamp(iso: string) {
  return format(new Date(iso), "MMM d, h:mm a");
}
