export type Role = "student" | "tutor";

/** 0 = Sunday … 6 = Saturday (matches Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MeetingFormat = "in-person" | "virtual";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "declined";

/** Status as shown to people, which also accounts for time passing. */
export type DisplayStatus = AppointmentStatus | "completed" | "expired";

export interface Course {
  code: string;
  name: string;
  subject: string;
}

export interface Tutor {
  id: string;
  name: string;
  major: string;
  year: string;
  courses: string[];
  bio: string;
  rating: number;
  sessionsLed: number;
  location: string;
  formats: MeetingFormat[];
}

export interface Student {
  id: string;
  name: string;
  major: string;
  year: string;
  email: string;
  preferredFormat: MeetingFormat;
}

/** A recurring weekly window when a tutor can be booked. Times are minutes from midnight. */
export interface AvailabilityWindow {
  id: string;
  tutorId: string;
  weekday: Weekday;
  start: number;
  end: number;
}

export interface Appointment {
  id: string;
  studentId: string;
  tutorId: string;
  courseCode: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  start: number;
  end: number;
  format: MeetingFormat;
  status: AppointmentStatus;
  note: string;
  createdAt: string;
  rescheduledCount: number;
  declineReason?: string;
}

export type NotificationKind =
  | "request"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "rescheduled"
  | "message";

export interface CampusNotification {
  id: string;
  role: Role;
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  appointmentId?: string;
  createdAt: string;
  read: boolean;
}

export interface Message {
  id: string;
  studentId: string;
  tutorId: string;
  from: Role;
  body: string;
  createdAt: string;
}

export interface CampusState {
  version: number;
  role: Role;
  currentStudentId: string;
  currentTutorId: string;
  courses: Course[];
  tutors: Tutor[];
  students: Student[];
  availability: AvailabilityWindow[];
  appointments: Appointment[];
  notifications: CampusNotification[];
  messages: Message[];
}

export type ActionResult<T = undefined> =
  | { ok: true; state: CampusState; value: T }
  | { ok: false; error: string };
