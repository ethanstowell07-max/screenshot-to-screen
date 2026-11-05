import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, CalendarX, MapPin, UserX, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvailabilityCalendar } from "@/components/campus/AvailabilityCalendar";
import { EmptyState, PersonAvatar, RoleGate } from "@/components/campus/shared";
import { runAction, useCampus } from "@/lib/campus/store";
import { useNow } from "@/lib/campus/use-now";
import { bookSession, rescheduleAppointment } from "@/lib/campus/actions";
import { BOOKING_HORIZON_DAYS, isUpcoming, slotsForDate, type Slot } from "@/lib/campus/scheduling";
import { formatDateLong, formatMinutes, formatRange, toDateKey, upcomingDateKeys } from "@/lib/campus/time";
import type { MeetingFormat } from "@/lib/campus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$tutorId")({
  validateSearch: (search: Record<string, unknown>): { reschedule?: string } =>
    typeof search.reschedule === "string" ? { reschedule: search.reschedule } : {},
  head: () => ({
    meta: [
      { title: "Schedule a Session · CampusConnect" },
      { name: "description", content: "Pick a date, time and meeting format to book a peer tutoring session." },
      { property: "og:title", content: "Schedule a Session · CampusConnect" },
      { property: "og:description", content: "Pick a date, time and meeting format to book a peer tutoring session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate role="student">
      <BookSession />
    </RoleGate>
  ),
});

const SLOT_LABEL: Record<Slot["state"], string> = {
  available: "",
  booked: "Booked",
  past: "Passed",
  conflict: "You're busy",
};

function BookSession() {
  const { tutorId } = Route.useParams();
  const { reschedule } = Route.useSearch();
  const navigate = useNavigate();
  const state = useCampus();
  const now = useNow();
  const tutor = state.tutors.find((t) => t.id === tutorId);
  const studentId = state.currentStudentId;
  const existing = reschedule
    ? state.appointments.find((a) => a.id === reschedule && a.studentId === studentId && a.tutorId === tutorId)
    : undefined;
  const student = state.students.find((s) => s.id === studentId)!;

  const [course, setCourse] = useState<string>(existing?.courseCode ?? tutor?.courses[0] ?? "");
  const [date, setDate] = useState<string | null>(existing?.date ?? null);
  const [start, setStart] = useState<number | null>(existing?.start ?? null);
  const [format, setFormat] = useState<MeetingFormat>(
    existing?.format ??
      (tutor?.formats.includes(student.preferredFormat) ? student.preferredFormat : tutor?.formats[0] ?? "in-person"),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const slotOpts = { studentId, ignoreAppointmentId: existing?.id };
  const days = upcomingDateKeys(now, BOOKING_HORIZON_DAYS);
  const openCounts = useMemo(() => {
    if (!tutor) return {};
    return Object.fromEntries(
      days.map((d) => [d, slotsForDate(state, tutor.id, d, now, slotOpts).filter((s) => s.state === "available").length]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tutor, now.getMinutes(), existing?.id]);

  if (!tutor) {
    return (
      <EmptyState
        icon={UserX}
        title="Tutor not found"
        description="We couldn't find that tutor. Head back and choose another."
        action={
          <Button asChild>
            <Link to="/tutors">Find a Tutor</Link>
          </Button>
        }
      />
    );
  }

  if (reschedule && (!existing || !isUpcoming(existing, now))) {
    return (
      <EmptyState
        icon={CalendarX}
        title="This session can't be rescheduled"
        description="It may have been canceled, declined, or already happened."
        action={
          <Button asChild>
            <Link to="/appointments">Back to My Appointments</Link>
          </Button>
        }
      />
    );
  }

  const slots = date ? slotsForDate(state, tutor.id, date, now, slotOpts) : [];
  const selectedSlot = slots.find((s) => s.start === start);
  const slotStillOpen = selectedSlot?.state === "available";
  const totalOpen = Object.values(openCounts).reduce((n, c) => n + c, 0);
  const courseInfo = state.courses.find((c) => c.code === course);

  const confirm = () => {
    setShowErrors(true);
    setError(null);
    if (!course || !date || start === null || !slotStillOpen) return;
    if (existing) {
      const res = runAction((s, n) => rescheduleAppointment(s, existing.id, { date, start, format }, n));
      if (!res.ok) return setError(res.error);
      toast.success("Session rescheduled", {
        description: `Now ${formatDateLong(date)} at ${formatMinutes(start)}. ${tutor.name.split(" ")[0]} will confirm the new time.`,
      });
      navigate({ to: "/appointments" });
    } else {
      const res = runAction((s, n) =>
        bookSession(s, { tutorId: tutor.id, studentId, courseCode: course, date, start, format, note }, n),
      );
      if (!res.ok) return setError(res.error);
      navigate({ to: "/booking/$appointmentId", params: { appointmentId: res.value.id } });
    }
  };

  return (
    <div>
      <Link
        to={existing ? "/appointments" : "/tutors/$tutorId"}
        params={existing ? undefined : { tutorId: tutor.id }}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {existing ? "My appointments" : `${tutor.name}'s profile`}
      </Link>
      <h1 className="text-3xl font-semibold md:text-4xl">
        {existing ? "Reschedule your session" : "Schedule a tutoring session"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {existing
          ? `Currently ${formatDateLong(existing.date)} at ${formatMinutes(existing.start)}. Pick a new time below.`
          : "All sessions are 1 hour. Your tutor will confirm the request."}
      </p>

      {totalOpen === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarX}
            title={`${tutor.name.split(" ")[0]} has no openings right now`}
            description="Every slot in the next three weeks is taken or outside their hours. Try another tutor for this course."
            action={
              <Button asChild>
                <Link to="/tutors">Browse other tutors</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <section className="card-surface p-5 sm:p-6">
              <StepTitle n={1}>Course</StepTitle>
              <Select value={course} onValueChange={setCourse} disabled={!!existing}>
                <SelectTrigger className="h-11 rounded-full" aria-label="Course">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {tutor.courses.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code} · {state.courses.find((c) => c.code === code)?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="card-surface p-5 sm:p-6">
              <StepTitle n={2}>Date</StepTitle>
              <AvailabilityCalendar
                today={toDateKey(now)}
                lastDay={days[days.length - 1]}
                openCounts={openCounts}
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setStart(null);
                  setError(null);
                }}
              />
              {showErrors && !date && <FieldError>Choose a date with open slots.</FieldError>}
            </section>

            <section className="card-surface p-5 sm:p-6">
              <StepTitle n={3}>Time</StepTitle>
              {!date ? (
                <p className="text-sm text-muted-foreground">Pick a date to see open times.</p>
              ) : (
                <>
                  <p className="mb-3 text-sm font-semibold">{formatDateLong(date)}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((s) => {
                      const disabled = s.state !== "available";
                      const active = s.start === start;
                      return (
                        <button
                          key={s.start}
                          type="button"
                          disabled={disabled}
                          aria-pressed={active}
                          onClick={() => {
                            setStart(s.start);
                            setError(null);
                          }}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors",
                            !disabled && !active && "border-input bg-card hover:border-primary hover:bg-secondary",
                            active && "border-primary bg-primary text-primary-foreground shadow-lift",
                            disabled && "cursor-not-allowed border-dashed border-border bg-muted text-muted-foreground",
                          )}
                        >
                          <span className={cn(disabled && "line-through")}>{formatMinutes(s.start)}</span>
                          <span className="block text-xs font-medium opacity-80">
                            {disabled ? SLOT_LABEL[s.state] : `until ${formatMinutes(s.end)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {showErrors && date && (start === null || !slotStillOpen) && (
                <FieldError>Choose an open time slot.</FieldError>
              )}
            </section>

            <section className="card-surface p-5 sm:p-6">
              <StepTitle n={4}>Meeting format</StepTitle>
              <div role="radiogroup" aria-label="Meeting format" className="grid gap-3 sm:grid-cols-2">
                {(["in-person", "virtual"] as MeetingFormat[]).map((f) => {
                  const offered = tutor.formats.includes(f);
                  const active = format === f;
                  const Icon = f === "virtual" ? Video : MapPin;
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={!offered}
                      onClick={() => setFormat(f)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                        active ? "border-primary bg-secondary" : "border-input bg-card hover:bg-muted",
                        !offered && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block font-bold">{f === "virtual" ? "Virtual" : "In person"}</span>
                        <span className="block text-sm text-muted-foreground">
                          {!offered
                            ? "Not offered by this tutor"
                            : f === "virtual"
                              ? "Video link sent after confirmation"
                              : tutor.location}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {!existing && (
              <section className="card-surface p-5 sm:p-6">
                <StepTitle n={5} optional>
                  What do you want to work on?
                </StepTitle>
                <Label htmlFor="note" className="sr-only">
                  Note for your tutor
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  maxLength={300}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Problem set 4, questions 2–6"
                  className="min-h-24 rounded-xl"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/300</p>
              </section>
            )}
          </div>

          <aside>
            <div className="card-surface p-6 lg:sticky lg:top-24">
              <div className="flex items-center gap-3">
                <PersonAvatar name={tutor.name} />
                <div>
                  <p className="font-bold">{tutor.name}</p>
                  <p className="text-sm text-muted-foreground">Peer tutor · {tutor.major}</p>
                </div>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                <SummaryRow label="Course" value={courseInfo ? `${courseInfo.code} · ${courseInfo.name}` : "—"} />
                <SummaryRow label="Date" value={date ? formatDateLong(date) : "Not selected"} muted={!date} />
                <SummaryRow
                  label="Time"
                  value={start !== null && slotStillOpen ? formatRange(start, start + 60) : "Not selected"}
                  muted={start === null || !slotStillOpen}
                />
                <SummaryRow label="Format" value={format === "virtual" ? "Virtual" : `In person · ${tutor.location}`} />
              </dl>
              {error && (
                <div
                  role="alert"
                  className="mt-5 flex gap-2 rounded-xl bg-destructive-soft p-3 text-sm font-semibold text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <Button size="lg" className="mt-6 w-full" onClick={confirm}>
                {existing ? "Confirm new time" : "Confirm Booking"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Free for students · Cancel anytime before the session
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function StepTitle({ n, children, optional }: { n: number; children: React.ReactNode; optional?: boolean }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 font-sans text-base font-bold">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs text-primary">
        {n}
      </span>
      {children}
      {optional && <span className="text-xs font-semibold text-muted-foreground">Optional</span>}
    </h2>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-destructive">
      <AlertCircle className="h-4 w-4" />
      {children}
    </p>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-3 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right font-semibold", muted && "font-normal text-muted-foreground")}>{value}</dd>
    </div>
  );
}
