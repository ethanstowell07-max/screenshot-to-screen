import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarX, MapPin, MessageSquare, Star, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, FormatTag, PersonAvatar, RoleGate } from "@/components/campus/shared";
import { useCampus } from "@/lib/campus/store";
import { useNow } from "@/lib/campus/use-now";
import { nextOpenSlot, windowsFor } from "@/lib/campus/scheduling";
import { WEEKDAYS, formatDateLong, formatMinutes, formatRange } from "@/lib/campus/time";

export const Route = createFileRoute("/tutors/$tutorId")({
  head: () => ({
    meta: [
      { title: "Tutor Profile · CampusConnect" },
      { name: "description", content: "See a peer tutor's courses, weekly availability and bio, then book a session." },
      { property: "og:title", content: "Tutor Profile · CampusConnect" },
      { property: "og:description", content: "See a peer tutor's courses, weekly availability and bio, then book a session." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate role="student">
      <TutorProfile />
    </RoleGate>
  ),
});

function TutorProfile() {
  const { tutorId } = Route.useParams();
  const state = useCampus();
  const now = useNow();
  const tutor = state.tutors.find((t) => t.id === tutorId);

  if (!tutor) {
    return (
      <EmptyState
        icon={UserX}
        title="Tutor not found"
        description="This tutor may no longer be part of the program."
        action={
          <Button asChild>
            <Link to="/tutors">Back to tutors</Link>
          </Button>
        }
      />
    );
  }

  const courses = state.courses.filter((c) => tutor.courses.includes(c.code));
  const windows = windowsFor(state, tutor.id);
  const next = nextOpenSlot(state, tutor.id, now);

  return (
    <div>
      <Link
        to="/tutors"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All tutors
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card-surface overflow-hidden">
            <div className="h-24 bg-hero" />
            <div className="-mt-10 p-6 pt-0">
              <PersonAvatar name={tutor.name} size="xl" className="ring-4 ring-card" />
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold">{tutor.name}</h1>
                  <p className="text-muted-foreground">
                    {tutor.year} · {tutor.major}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 font-bold">
                    <Star className="h-4 w-4 fill-warning text-warning" /> {tutor.rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">{tutor.sessionsLed} sessions led</span>
                </div>
              </div>
              <p className="mt-5 leading-relaxed">{tutor.bio}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {tutor.formats.map((f) => (
                  <FormatTag key={f} format={f} />
                ))}
                {tutor.formats.includes("in-person") && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {tutor.location}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="card-surface p-6">
            <h2 className="mb-4 text-xl font-semibold">Subject expertise</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {courses.map((c) => (
                <li key={c.code} className="rounded-xl bg-muted p-4">
                  <Badge variant="secondary">{c.subject}</Badge>
                  <p className="mt-2 font-bold">{c.code}</p>
                  <p className="text-sm text-muted-foreground">{c.name}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card-surface p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold">Weekly availability</h2>
            <p className="mb-4 text-sm text-muted-foreground">1-hour sessions, repeating every week.</p>
            {windows.length === 0 ? (
              <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                <CalendarX className="mb-2 h-5 w-5" />
                {tutor.name.split(" ")[0]} hasn't set any hours right now. Check back soon or message another tutor.
              </div>
            ) : (
              <ul className="space-y-2">
                {WEEKDAYS.map((d) => {
                  const ws = windows.filter((w) => w.weekday === d.value);
                  return (
                    <li key={d.value} className="flex justify-between gap-4 text-sm">
                      <span className="font-semibold">{d.long}</span>
                      <span className={ws.length ? "text-right" : "text-muted-foreground"}>
                        {ws.length ? ws.map((w) => formatRange(w.start, w.end)).join(", ") : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-6 rounded-xl bg-secondary p-4">
              {next ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-secondary-foreground/70">
                    Next opening
                  </p>
                  <p className="mt-1 font-bold">
                    {formatDateLong(next.date)} · {formatMinutes(next.slot.start)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold">No openings in the next 3 weeks.</p>
              )}
            </div>
            <div className="mt-4 grid gap-2">
              {next ? (
                <Button asChild size="lg">
                  <Link to="/book/$tutorId" params={{ tutorId: tutor.id }}>
                    Book Session
                  </Link>
                </Button>
              ) : (
                <Button size="lg" disabled>
                  Book Session
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/messages" search={{ with: tutor.id }}>
                  <MessageSquare /> Message {tutor.name.split(" ")[0]}
                </Link>
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
