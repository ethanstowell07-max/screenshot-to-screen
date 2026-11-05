import type { ReactNode } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { useCampus } from "@/lib/campus/store";
import { displayStatus } from "@/lib/campus/scheduling";
import { formatDateShort, formatRange } from "@/lib/campus/time";
import type { Appointment } from "@/lib/campus/types";
import { FormatTag, PersonAvatar, StatusBadge } from "./shared";

export function AppointmentCard({
  appointment,
  perspective,
  actions,
  now,
}: {
  appointment: Appointment;
  perspective: "student" | "tutor";
  actions?: ReactNode;
  now: Date;
}) {
  const state = useCampus();
  const tutor = state.tutors.find((t) => t.id === appointment.tutorId)!;
  const student = state.students.find((s) => s.id === appointment.studentId)!;
  const course = state.courses.find((c) => c.code === appointment.courseCode);
  const other = perspective === "student" ? tutor.name : student.name;
  const status = displayStatus(appointment, now);

  return (
    <article className="card-surface flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <PersonAvatar name={other} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-sans text-base font-bold">{other}</h3>
            <StatusBadge status={status} tutorView={perspective === "tutor"} />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{appointment.courseCode}</span>
            {course && ` · ${course.name}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDateShort(appointment.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatRange(appointment.start, appointment.end)}
            </span>
            <FormatTag format={appointment.format} />
          </div>
          {appointment.note && (
            <p className="mt-2 line-clamp-2 text-sm italic text-muted-foreground">
              “{appointment.note}”
            </p>
          )}
          {appointment.declineReason && (
            <p className="mt-2 text-sm text-destructive">Tutor note: {appointment.declineReason}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div>}
    </article>
  );
}
