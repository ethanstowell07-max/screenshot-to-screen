import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, CheckCircle2, Clock, FileQuestion, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PersonAvatar, RoleGate, StatusBadge } from "@/components/campus/shared";
import { useCampus } from "@/lib/campus/store";
import { useNow } from "@/lib/campus/use-now";
import { displayStatus } from "@/lib/campus/scheduling";
import { formatDateLong, formatRange, fromDateKey } from "@/lib/campus/time";
import type { Appointment } from "@/lib/campus/types";

export const Route = createFileRoute("/booking/$appointmentId")({
  head: () => ({
    meta: [
      { title: "Booking Confirmed · CampusConnect" },
      { name: "description", content: "Your tutoring request has been sent. Review the session details." },
      { property: "og:title", content: "Booking Confirmed · CampusConnect" },
      { property: "og:description", content: "Your tutoring request has been sent. Review the session details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate role="student">
      <Confirmation />
    </RoleGate>
  ),
});

function icsFor(a: Appointment, title: string, location: string) {
  const d = fromDateKey(a.date);
  const stamp = (mins: number) => {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(mins / 60), mins % 60);
    return t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusConnect//EN",
    "BEGIN:VEVENT",
    `UID:${a.id}@campusconnect`,
    `DTSTAMP:${stamp(0)}`,
    `DTSTART:${stamp(a.start)}`,
    `DTEND:${stamp(a.end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function Confirmation() {
  const { appointmentId } = Route.useParams();
  const state = useCampus();
  const now = useNow();
  const a = state.appointments.find((x) => x.id === appointmentId && x.studentId === state.currentStudentId);

  if (!a) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="We couldn't find that booking"
        description="It may have been removed. Your current sessions are in My Appointments."
        action={
          <Button asChild>
            <Link to="/appointments">My Appointments</Link>
          </Button>
        }
      />
    );
  }

  const tutor = state.tutors.find((t) => t.id === a.tutorId)!;
  const course = state.courses.find((c) => c.code === a.courseCode);
  const location = a.format === "virtual" ? "Virtual (video link)" : tutor.location;

  const download = () => {
    const blob = new Blob([icsFor(a, `${a.courseCode} tutoring with ${tutor.name}`, location)], {
      type: "text/calendar",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campusconnect-${a.courseCode.replace(" ", "")}-${a.date}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-semibold md:text-4xl">Your request is in!</h1>
        <p className="mt-2 text-muted-foreground">
          We've let {tutor.name.split(" ")[0]} know. You'll get a notification as soon as they confirm.
        </p>
      </div>

      <section className="card-surface mt-8 overflow-hidden">
        <div className="flex items-center gap-4 bg-sky-wash p-5">
          <PersonAvatar name={tutor.name} size="lg" />
          <div className="flex-1">
            <p className="text-lg font-bold">{tutor.name}</p>
            <p className="text-sm text-muted-foreground">
              {a.courseCode} · {course?.name}
            </p>
          </div>
          <StatusBadge status={displayStatus(a, now)} />
        </div>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-primary-soft" />
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">When</dt>
              <dd className="font-semibold">{formatDateLong(a.date)}</dd>
              <dd className="text-sm text-muted-foreground">{formatRange(a.start, a.end)}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            {a.format === "virtual" ? (
              <Video className="mt-0.5 h-5 w-5 text-primary-soft" />
            ) : (
              <MapPin className="mt-0.5 h-5 w-5 text-primary-soft" />
            )}
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Where</dt>
              <dd className="font-semibold">{a.format === "virtual" ? "Virtual" : "In person"}</dd>
              <dd className="text-sm text-muted-foreground">
                {a.format === "virtual" ? "Video link arrives after confirmation" : tutor.location}
              </dd>
            </div>
          </div>
          {a.note && (
            <div className="rounded-xl bg-muted p-4 text-sm sm:col-span-2">
              <span className="font-bold">Your note: </span>
              {a.note}
            </div>
          )}
        </dl>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Confirmation #{a.id.toUpperCase()}
        </p>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/appointments">View My Appointments</Link>
        </Button>
        <Button variant="outline" size="lg" onClick={download}>
          <CalendarPlus /> Add to calendar
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
