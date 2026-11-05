import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CalendarCheck, CalendarDays, Hourglass, MessageSquare, Search, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "@/components/campus/AppointmentCard";
import { EmptyState, PersonAvatar, RoleGate, SectionTitle, TextLink } from "@/components/campus/shared";
import { useCampus } from "@/lib/campus/store";
import { useNow } from "@/lib/campus/use-now";
import { displayStatus, isUpcoming, nextOpenSlot, sortByDate } from "@/lib/campus/scheduling";
import { formatDateShort, formatMinutes, formatTimestamp } from "@/lib/campus/time";
import studyImage from "@/assets/campus-study.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard · CampusConnect" },
      { name: "description", content: "See your upcoming tutoring sessions and find a peer tutor in seconds." },
      { property: "og:title", content: "Student Dashboard · CampusConnect" },
      { property: "og:description", content: "See your upcoming tutoring sessions and find a peer tutor in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate role="student">
      <StudentDashboard />
    </RoleGate>
  ),
});

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function StudentDashboard() {
  const state = useCampus();
  const now = useNow();
  const me = state.students.find((s) => s.id === state.currentStudentId)!;
  const mine = state.appointments.filter((a) => a.studentId === me.id);
  const upcoming = sortByDate(mine.filter((a) => isUpcoming(a, now)));
  const pending = upcoming.filter((a) => a.status === "pending").length;
  const completed = mine.filter((a) => displayStatus(a, now) === "completed").length;
  const notes = state.notifications
    .filter((n) => n.role === "student" && n.recipientId === me.id)
    .slice(0, 3);
  const featured = state.tutors
    .map((t) => ({ tutor: t, next: nextOpenSlot(state, t.id, now) }))
    .filter((x) => x.next)
    .slice(0, 3);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-hero text-primary-foreground shadow-lift">
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <div className="relative z-10 p-6 sm:p-10">
            <p className="text-sm font-semibold text-primary-foreground/70">
              {greeting(now)}, {me.name.split(" ")[0]}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              Learn together, <br className="hidden sm:block" />
              <span className="italic text-sky">succeed together.</span>
            </h1>
            <p className="mt-4 max-w-md text-primary-foreground/80">
              {upcoming.length === 0
                ? "You have no sessions coming up. Book time with a peer tutor who's taken your course."
                : `You have ${upcoming.length} upcoming session${upcoming.length === 1 ? "" : "s"}${
                    pending ? `, ${pending} waiting for a tutor to confirm` : ""
                  }.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/tutors">
                  <Search /> Find a Tutor
                </Link>
              </Button>
              <Button asChild variant="hero-outline" size="lg">
                <Link to="/appointments">My Appointments</Link>
              </Button>
            </div>
          </div>
          <div className="relative hidden min-h-64 md:block">
            <img
              src={studyImage}
              alt="Two students studying together in the campus library"
              width={1600}
              height={912}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/30 to-transparent" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: CalendarCheck, label: "Upcoming", value: upcoming.length },
          { icon: Hourglass, label: "Awaiting tutor", value: pending },
          { icon: Sparkles, label: "Completed", value: completed },
        ].map((s) => (
          <div key={s.label} className="card-surface p-4 sm:p-5">
            <s.icon className="h-5 w-5 text-primary-soft" />
            <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground sm:text-sm">{s.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionTitle action={<TextLink to="/appointments">View all</TextLink>}>
            Upcoming appointments
          </SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming sessions"
              description="When you book a tutor, your sessions will show up here."
              action={
                <Button asChild>
                  <Link to="/tutors">Find a Tutor</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((a) => (
                <AppointmentCard key={a.id} appointment={a} perspective="student" now={now} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-8">
          <section>
            <SectionTitle>Quick links</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              {[
                { to: "/appointments" as const, icon: CalendarDays, label: "Appointments" },
                { to: "/messages" as const, icon: MessageSquare, label: "Messages" },
                { to: "/profile" as const, icon: User, label: "Profile" },
              ].map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className="card-surface lift flex flex-col items-center gap-2 p-4 text-center text-xs font-bold"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <q.icon className="h-5 w-5" />
                  </span>
                  {q.label}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle action={<TextLink to="/notifications">See all</TextLink>}>
              Latest updates
            </SectionTitle>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're all caught up.</p>
            ) : (
              <ul className="card-surface divide-y divide-border">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-3 p-4">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary-soft" />
                    <div>
                      <p className="text-sm font-bold">
                        {n.title}
                        {!n.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-sky" />}
                      </p>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section>
        <SectionTitle action={<TextLink to="/tutors">Browse all tutors</TextLink>}>
          Tutors with open slots
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {featured.map(({ tutor, next }) => (
            <Link
              key={tutor.id}
              to="/tutors/$tutorId"
              params={{ tutorId: tutor.id }}
              className="card-surface lift flex items-center gap-4 p-4"
            >
              <PersonAvatar name={tutor.name} />
              <div className="min-w-0">
                <p className="font-bold">{tutor.name}</p>
                <p className="truncate text-sm text-muted-foreground">{tutor.courses.join(" · ")}</p>
                <p className="mt-1 text-xs font-semibold text-success">
                  Next open: {formatDateShort(next!.date)}, {formatMinutes(next!.slot.start)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
