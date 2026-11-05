import type {
  Appointment,
  AvailabilityWindow,
  CampusState,
  DisplayStatus,
  Weekday,
} from "./types";
import {
  SESSION_MINUTES,
  isPast,
  overlaps,
  upcomingDateKeys,
  weekdayOf,
  formatRange,
  weekdayName,
} from "./time";

export const BOOKING_HORIZON_DAYS = 21;

export function isActive(a: Appointment) {
  return a.status === "pending" || a.status === "confirmed";
}

export function displayStatus(a: Appointment, now: Date): DisplayStatus {
  const ended = isPast(a.date, a.end, now);
  if (a.status === "confirmed" && ended) return "completed";
  if (a.status === "pending" && isPast(a.date, a.start, now)) return "expired";
  return a.status;
}

/** Upcoming = still active and not yet started. */
export function isUpcoming(a: Appointment, now: Date) {
  return isActive(a) && !isPast(a.date, a.start, now);
}

export function sortByDate(list: Appointment[], dir: "asc" | "desc" = "asc") {
  return [...list].sort((a, b) => {
    const cmp = a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1;
    return dir === "asc" ? cmp : -cmp;
  });
}

export function windowsFor(state: CampusState, tutorId: string, weekday?: Weekday) {
  return state.availability
    .filter((w) => w.tutorId === tutorId && (weekday === undefined || w.weekday === weekday))
    .sort((a, b) => a.weekday - b.weekday || a.start - b.start);
}

export type SlotState = "available" | "booked" | "past" | "conflict";

export interface Slot {
  start: number;
  end: number;
  state: SlotState;
}

interface SlotOptions {
  /** The student booking — their own active sessions block overlapping slots. */
  studentId?: string;
  /** Ignore this appointment when checking conflicts (used while rescheduling it). */
  ignoreAppointmentId?: string;
}

/** Every 1-hour slot a tutor offers on a date, with whether it can be booked. */
export function slotsForDate(
  state: CampusState,
  tutorId: string,
  date: string,
  now: Date,
  opts: SlotOptions = {},
): Slot[] {
  const windows = windowsFor(state, tutorId, weekdayOf(date));
  const busy = state.appointments.filter(
    (a) => a.id !== opts.ignoreAppointmentId && a.date === date && isActive(a),
  );
  const slots: Slot[] = [];
  for (const w of windows) {
    for (let start = w.start; start + SESSION_MINUTES <= w.end; start += SESSION_MINUTES) {
      const end = start + SESSION_MINUTES;
      let slotState: SlotState = "available";
      if (isPast(date, start, now)) slotState = "past";
      else if (busy.some((a) => a.tutorId === tutorId && overlaps(start, end, a.start, a.end)))
        slotState = "booked";
      else if (
        opts.studentId &&
        busy.some((a) => a.studentId === opts.studentId && overlaps(start, end, a.start, a.end))
      )
        slotState = "conflict";
      slots.push({ start, end, state: slotState });
    }
  }
  return slots;
}

export function availableSlotCount(
  state: CampusState,
  tutorId: string,
  date: string,
  now: Date,
  opts: SlotOptions = {},
) {
  return slotsForDate(state, tutorId, date, now, opts).filter((s) => s.state === "available")
    .length;
}

/** Dates in the booking horizon that still have at least one open slot. */
export function bookableDates(
  state: CampusState,
  tutorId: string,
  now: Date,
  days = BOOKING_HORIZON_DAYS,
  opts: SlotOptions = {},
) {
  return upcomingDateKeys(now, days).filter(
    (d) => availableSlotCount(state, tutorId, d, now, opts) > 0,
  );
}

export function nextOpenSlot(state: CampusState, tutorId: string, now: Date) {
  for (const date of upcomingDateKeys(now, BOOKING_HORIZON_DAYS)) {
    const slot = slotsForDate(state, tutorId, date, now).find((s) => s.state === "available");
    if (slot) return { date, slot };
  }
  return null;
}

export interface BookingRequest {
  tutorId: string;
  studentId: string;
  date: string;
  start: number;
  ignoreAppointmentId?: string;
}

/** Returns a human-readable reason the slot can't be booked, or null if it can. */
export function validateBooking(state: CampusState, req: BookingRequest, now: Date): string | null {
  const end = req.start + SESSION_MINUTES;
  const fitsWindow = windowsFor(state, req.tutorId, weekdayOf(req.date)).some(
    (w) => req.start >= w.start && end <= w.end,
  );
  if (!fitsWindow) return "That time is outside the tutor's availability.";
  if (isPast(req.date, req.start, now)) return "That time has already passed.";
  const others = state.appointments.filter(
    (a) => a.id !== req.ignoreAppointmentId && a.date === req.date && isActive(a),
  );
  if (others.some((a) => a.tutorId === req.tutorId && overlaps(req.start, end, a.start, a.end)))
    return "Someone just booked that slot. Please pick another time.";
  if (others.some((a) => a.studentId === req.studentId && overlaps(req.start, end, a.start, a.end)))
    return "You already have a session at that time.";
  return null;
}

export interface WindowDraft {
  tutorId: string;
  weekday: Weekday;
  start: number;
  end: number;
}

/** Validates a recurring availability window against the tutor's other windows. */
export function validateWindow(
  windows: AvailabilityWindow[],
  draft: WindowDraft,
  ignoreId?: string,
): string | null {
  if (draft.end <= draft.start) return "End time must be after start time.";
  if (draft.end - draft.start < SESSION_MINUTES) return "Time slots must be at least 1 hour long.";
  if (draft.start < 7 * 60 || draft.end > 22 * 60)
    return "Availability must be between 7 AM and 10 PM.";
  const clash = windows.find(
    (w) =>
      w.id !== ignoreId &&
      w.tutorId === draft.tutorId &&
      w.weekday === draft.weekday &&
      overlaps(draft.start, draft.end, w.start, w.end),
  );
  if (clash)
    return `Overlaps your ${weekdayName(clash.weekday)} slot (${formatRange(clash.start, clash.end)}).`;
  return null;
}

/** Upcoming active sessions that fall inside a window — they stay booked if the window changes. */
export function sessionsInWindow(state: CampusState, window: AvailabilityWindow, now: Date) {
  return state.appointments.filter(
    (a) =>
      a.tutorId === window.tutorId &&
      isUpcoming(a, now) &&
      weekdayOf(a.date) === window.weekday &&
      overlaps(a.start, a.end, window.start, window.end),
  );
}
