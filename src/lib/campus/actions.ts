import type {
  ActionResult,
  Appointment,
  AvailabilityWindow,
  CampusNotification,
  CampusState,
  MeetingFormat,
  Role,
} from "./types";
import { SESSION_MINUTES, formatDateShort, formatMinutes, overlaps } from "./time";
import { isActive, isUpcoming, validateBooking, validateWindow, type WindowDraft } from "./scheduling";

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const ok = <T>(state: CampusState, value: T): ActionResult<T> => ({ ok: true, state, value });
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

function notify(
  state: CampusState,
  n: Omit<CampusNotification, "id" | "createdAt" | "read">,
  now: Date,
): CampusState {
  return {
    ...state,
    notifications: [
      { ...n, id: uid("n"), createdAt: now.toISOString(), read: false },
      ...state.notifications,
    ],
  };
}

const names = (state: CampusState, a: Pick<Appointment, "studentId" | "tutorId">) => ({
  student: state.students.find((s) => s.id === a.studentId)?.name ?? "A student",
  tutor: state.tutors.find((t) => t.id === a.tutorId)?.name ?? "Your tutor",
});

const when = (a: Pick<Appointment, "date" | "start">) =>
  `${formatDateShort(a.date)} at ${formatMinutes(a.start)}`;

export interface BookInput {
  tutorId: string;
  studentId: string;
  courseCode: string;
  date: string;
  start: number;
  format: MeetingFormat;
  note: string;
}

export function bookSession(state: CampusState, input: BookInput, now: Date): ActionResult<Appointment> {
  const tutor = state.tutors.find((t) => t.id === input.tutorId);
  if (!tutor) return fail("That tutor could not be found.");
  if (!tutor.courses.includes(input.courseCode)) return fail("Please choose a course this tutor covers.");
  if (!tutor.formats.includes(input.format))
    return fail(`${tutor.name} doesn't offer ${input.format} sessions.`);
  const error = validateBooking(state, input, now);
  if (error) return fail(error);

  const appointment: Appointment = {
    id: uid("a"),
    studentId: input.studentId,
    tutorId: input.tutorId,
    courseCode: input.courseCode,
    date: input.date,
    start: input.start,
    end: input.start + SESSION_MINUTES,
    format: input.format,
    note: input.note.trim(),
    status: "pending",
    createdAt: now.toISOString(),
    rescheduledCount: 0,
  };
  let next: CampusState = { ...state, appointments: [...state.appointments, appointment] };
  const n = names(next, appointment);
  next = notify(
    next,
    {
      role: "tutor",
      recipientId: appointment.tutorId,
      kind: "request",
      title: "New session request",
      body: `${n.student} requested a ${appointment.courseCode} session on ${when(appointment)}.`,
      appointmentId: appointment.id,
    },
    now,
  );
  return ok(next, appointment);
}

function findUpcoming(state: CampusState, id: string, now: Date) {
  const a = state.appointments.find((x) => x.id === id);
  if (!a) return { error: "That appointment could not be found." } as const;
  if (!isUpcoming(a, now)) return { error: "Only upcoming sessions can be changed." } as const;
  return { appointment: a } as const;
}

function replace(state: CampusState, updated: Appointment): CampusState {
  return {
    ...state,
    appointments: state.appointments.map((a) => (a.id === updated.id ? updated : a)),
  };
}

export function cancelAppointment(
  state: CampusState,
  id: string,
  by: Role,
  now: Date,
): ActionResult<Appointment> {
  const found = findUpcoming(state, id, now);
  if ("error" in found) return fail(found.error!);
  const updated: Appointment = { ...found.appointment, status: "cancelled" };
  let next = replace(state, updated);
  const n = names(next, updated);
  next = notify(
    next,
    {
      role: "student",
      recipientId: updated.studentId,
      kind: "cancelled",
      title: "Session canceled",
      body:
        by === "student"
          ? `Your ${updated.courseCode} session with ${n.tutor} on ${when(updated)} was canceled.`
          : `${n.tutor} canceled your ${updated.courseCode} session on ${when(updated)}.`,
      appointmentId: updated.id,
    },
    now,
  );
  next = notify(
    next,
    {
      role: "tutor",
      recipientId: updated.tutorId,
      kind: "cancelled",
      title: "Session canceled",
      body:
        by === "student"
          ? `${n.student} canceled their ${updated.courseCode} session on ${when(updated)}. The slot is open again.`
          : `You canceled ${n.student}'s ${updated.courseCode} session on ${when(updated)}.`,
      appointmentId: updated.id,
    },
    now,
  );
  return ok(next, updated);
}

export function rescheduleAppointment(
  state: CampusState,
  id: string,
  change: { date: string; start: number; format: MeetingFormat },
  now: Date,
): ActionResult<Appointment> {
  const found = findUpcoming(state, id, now);
  if ("error" in found) return fail(found.error!);
  const current = found.appointment;
  if (current.date === change.date && current.start === change.start && current.format === change.format)
    return fail("Pick a different time or format to reschedule.");
  const error = validateBooking(
    state,
    {
      tutorId: current.tutorId,
      studentId: current.studentId,
      date: change.date,
      start: change.start,
      ignoreAppointmentId: current.id,
    },
    now,
  );
  if (error) return fail(error);

  const updated: Appointment = {
    ...current,
    date: change.date,
    start: change.start,
    end: change.start + SESSION_MINUTES,
    format: change.format,
    status: "pending",
    rescheduledCount: current.rescheduledCount + 1,
  };
  let next = replace(state, updated);
  const n = names(next, updated);
  next = notify(
    next,
    {
      role: "student",
      recipientId: updated.studentId,
      kind: "rescheduled",
      title: "Session rescheduled",
      body: `Your ${updated.courseCode} session moved to ${when(updated)}. Waiting for ${n.tutor} to confirm.`,
      appointmentId: updated.id,
    },
    now,
  );
  next = notify(
    next,
    {
      role: "tutor",
      recipientId: updated.tutorId,
      kind: "request",
      title: "Reschedule request",
      body: `${n.student} moved their ${updated.courseCode} session to ${when(updated)}. Please confirm.`,
      appointmentId: updated.id,
    },
    now,
  );
  return ok(next, updated);
}

export function respondToRequest(
  state: CampusState,
  id: string,
  decision: "accept" | "decline",
  now: Date,
  reason = "",
): ActionResult<Appointment> {
  const found = findUpcoming(state, id, now);
  if ("error" in found) return fail(found.error!);
  const a = found.appointment;
  if (a.status !== "pending") return fail("This request has already been answered.");

  if (decision === "accept") {
    const clash = state.appointments.find(
      (x) =>
        x.id !== a.id &&
        x.tutorId === a.tutorId &&
        x.status === "confirmed" &&
        x.date === a.date &&
        overlaps(a.start, a.end, x.start, x.end),
    );
    if (clash) return fail("You already have a confirmed session at that time.");
  }

  const updated: Appointment =
    decision === "accept"
      ? { ...a, status: "confirmed" }
      : { ...a, status: "declined", declineReason: reason.trim() || undefined };
  let next = replace(state, updated);
  const n = names(next, updated);
  next = notify(
    next,
    decision === "accept"
      ? {
          role: "student",
          recipientId: updated.studentId,
          kind: "confirmed",
          title: "Session confirmed",
          body: `${n.tutor} confirmed your ${updated.courseCode} session on ${when(updated)}.`,
          appointmentId: updated.id,
        }
      : {
          role: "student",
          recipientId: updated.studentId,
          kind: "declined",
          title: "Request declined",
          body: `${n.tutor} can't make ${when(updated)} for ${updated.courseCode}.${
            updated.declineReason ? ` “${updated.declineReason}”` : ""
          } Try booking another time.`,
          appointmentId: updated.id,
        },
    now,
  );
  return ok(next, updated);
}

export function addWindows(
  state: CampusState,
  drafts: WindowDraft[],
): ActionResult<AvailabilityWindow[]> {
  if (drafts.length === 0) return fail("Choose at least one day.");
  let windows = state.availability;
  const created: AvailabilityWindow[] = [];
  for (const draft of drafts) {
    const error = validateWindow(windows, draft);
    if (error) return fail(error);
    const w: AvailabilityWindow = { ...draft, id: uid("w") };
    windows = [...windows, w];
    created.push(w);
  }
  return ok({ ...state, availability: windows }, created);
}

export function updateWindow(
  state: CampusState,
  id: string,
  draft: WindowDraft,
): ActionResult<AvailabilityWindow> {
  const existing = state.availability.find((w) => w.id === id);
  if (!existing) return fail("That time slot could not be found.");
  const error = validateWindow(state.availability, draft, id);
  if (error) return fail(error);
  const updated = { ...existing, ...draft };
  return ok(
    { ...state, availability: state.availability.map((w) => (w.id === id ? updated : w)) },
    updated,
  );
}

export function removeWindow(state: CampusState, id: string): ActionResult<AvailabilityWindow> {
  const existing = state.availability.find((w) => w.id === id);
  if (!existing) return fail("That time slot could not be found.");
  return ok({ ...state, availability: state.availability.filter((w) => w.id !== id) }, existing);
}

export function sendMessage(
  state: CampusState,
  input: { studentId: string; tutorId: string; from: Role; body: string },
  now: Date,
): ActionResult<undefined> {
  const body = input.body.trim();
  if (!body) return fail("Write a message first.");
  if (body.length > 1000) return fail("Messages must be under 1000 characters.");
  return ok(
    {
      ...state,
      messages: [
        ...state.messages,
        { id: uid("m"), ...input, body, createdAt: now.toISOString() },
      ],
    },
    undefined,
  );
}

export function markNotificationsRead(state: CampusState, role: Role, recipientId: string, ids?: string[]) {
  return {
    ...state,
    notifications: state.notifications.map((n) =>
      n.role === role && n.recipientId === recipientId && (!ids || ids.includes(n.id))
        ? { ...n, read: true }
        : n,
    ),
  };
}

export { isActive };
