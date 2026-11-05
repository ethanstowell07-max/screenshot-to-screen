import { describe, expect, it } from "vitest";
import { createSeedState } from "./seed";
import { slotsForDate, validateWindow, displayStatus } from "./scheduling";
import {
  addWindows,
  bookSession,
  cancelAppointment,
  removeWindow,
  rescheduleAppointment,
  respondToRequest,
} from "./actions";
import { nextWeekday } from "./time";

// Thursday Nov 5 2026, 9:00 AM local
const NOW = new Date(2026, 10, 5, 9, 0);
const seed = () => createSeedState(NOW);
const h = (n: number) => n * 60;

describe("booking", () => {
  it("rejects a slot the tutor already has booked", () => {
    const s = seed();
    // Noah is confirmed with Jordan next Monday at 4 PM
    const res = bookSession(
      s,
      { tutorId: "t-jordan", studentId: "s-maya", courseCode: "CS 110", date: nextWeekday(NOW, 1), start: h(16), format: "in-person", note: "" },
      NOW,
    );
    expect(res.ok).toBe(false);
  });

  it("rejects times outside the tutor's availability", () => {
    const res = bookSession(
      seed(),
      { tutorId: "t-jordan", studentId: "s-maya", courseCode: "CS 110", date: nextWeekday(NOW, 1), start: h(9), format: "in-person", note: "" },
      NOW,
    );
    expect(res.ok).toBe(false);
  });

  it("creates a pending request and notifies the tutor", () => {
    const s = seed();
    const res = bookSession(
      s,
      { tutorId: "t-jordan", studentId: "s-maya", courseCode: "CS 220", date: nextWeekday(NOW, 1), start: h(15), format: "virtual", note: "" },
      NOW,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe("pending");
    expect(res.state.notifications[0]).toMatchObject({ role: "tutor", recipientId: "t-jordan", kind: "request" });
  });

  it("marks a booked slot as unavailable for other students", () => {
    const slots = slotsForDate(seed(), "t-jordan", nextWeekday(NOW, 1), NOW);
    expect(slots.find((x) => x.start === h(16))?.state).toBe("booked");
    expect(slots.find((x) => x.start === h(15))?.state).toBe("available");
  });

  it("blocks slots that clash with the student's own sessions", () => {
    // Jordan (Sat 10–12) and Amara (Sat 11–1) overlap at 11 AM
    const sat = nextWeekday(NOW, 6);
    const first = bookSession(
      seed(),
      { tutorId: "t-jordan", studentId: "s-maya", courseCode: "CS 110", date: sat, start: h(11), format: "in-person", note: "" },
      NOW,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = bookSession(
      first.state,
      { tutorId: "t-amara", studentId: "s-maya", courseCode: "ECON 101", date: sat, start: h(11), format: "in-person", note: "" },
      NOW,
    );
    expect(second.ok).toBe(false);
    const slots = slotsForDate(first.state, "t-amara", sat, NOW, { studentId: "s-maya" });
    expect(slots.find((x) => x.start === h(11))?.state).toBe("conflict");
  });
});

describe("tutor responses and changes", () => {
  it("accepting a request confirms it and notifies the student", () => {
    const res = respondToRequest(seed(), "a-6", "accept", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe("confirmed");
    expect(res.state.notifications[0]).toMatchObject({ role: "student", recipientId: "s-liam", kind: "confirmed" });
  });

  it("canceling frees the slot and notifies the student", () => {
    const s = seed();
    const res = cancelAppointment(s, "a-3", "student", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.notifications.some((n) => n.role === "student" && n.kind === "cancelled")).toBe(true);
    const slots = slotsForDate(res.state, "t-jordan", nextWeekday(NOW, 3), NOW);
    expect(slots.find((x) => x.start === h(15))?.state).toBe("available");
  });

  it("rescheduling moves the session back to pending and notifies the student", () => {
    const res = rescheduleAppointment(seed(), "a-3", { date: nextWeekday(NOW, 3), start: h(14), format: "in-person" }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe("pending");
    expect(res.value.start).toBe(h(14));
    expect(res.state.notifications.some((n) => n.role === "student" && n.kind === "rescheduled")).toBe(true);
  });

  it("past confirmed sessions show as completed", () => {
    const s = seed();
    expect(displayStatus(s.appointments.find((a) => a.id === "a-4")!, NOW)).toBe("completed");
  });
});

describe("availability", () => {
  it("rejects overlapping weekly slots", () => {
    const s = seed();
    // Jordan already has Monday 2–5 PM
    expect(validateWindow(s.availability, { tutorId: "t-jordan", weekday: 1, start: h(16), end: h(18) })).not.toBeNull();
    expect(validateWindow(s.availability, { tutorId: "t-jordan", weekday: 1, start: h(17), end: h(19) })).toBeNull();
  });

  it("new recurring slots immediately become bookable", () => {
    const s = seed();
    const res = addWindows(s, [{ tutorId: "t-jordan", weekday: 2, start: h(9), end: h(11) }]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const tue = nextWeekday(NOW, 2);
    expect(slotsForDate(res.state, "t-jordan", tue, NOW).filter((x) => x.state === "available")).toHaveLength(2);
    expect(slotsForDate(res.state, "t-jordan", nextWeekday(NOW, 2, 1), NOW)).toHaveLength(2);
  });

  it("removing a slot removes those booking times", () => {
    const s = seed();
    const sat = s.availability.find((w) => w.tutorId === "t-jordan" && w.weekday === 6)!;
    const res = removeWindow(s, sat.id);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(slotsForDate(res.state, "t-jordan", nextWeekday(NOW, 6), NOW)).toHaveLength(0);
  });
});
