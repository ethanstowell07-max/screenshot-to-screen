import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarX, SearchX, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, FormatTag, PageHeader, PersonAvatar, RoleGate } from "@/components/campus/shared";
import { useCampus } from "@/lib/campus/store";
import { useNow } from "@/lib/campus/use-now";
import { nextOpenSlot, slotsForDate, windowsFor } from "@/lib/campus/scheduling";
import { formatDateShort, formatMinutes, upcomingDateKeys, weekdayName, weekdayOf } from "@/lib/campus/time";
import type { CampusState } from "@/lib/campus/types";

export const Route = createFileRoute("/tutors/")({
  head: () => ({
    meta: [
      { title: "Find a Peer Tutor · CampusConnect" },
      { name: "description", content: "Search peer tutors by subject, course and availability, then book a session." },
      { property: "og:title", content: "Find a Peer Tutor · CampusConnect" },
      { property: "og:description", content: "Search peer tutors by subject, course and availability, then book a session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate role="student">
      <FindTutor />
    </RoleGate>
  ),
});

const AVAILABILITY = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Open today" },
  { value: "week", label: "Open this week" },
  { value: "mornings", label: "Mornings (before 12)" },
  { value: "afternoons", label: "Afternoons (12–5)" },
  { value: "evenings", label: "Evenings (after 5)" },
  { value: "weekends", label: "Weekends" },
] as const;
type AvailabilityFilter = (typeof AVAILABILITY)[number]["value"];

function matchesAvailability(state: CampusState, tutorId: string, filter: AvailabilityFilter, now: Date) {
  if (filter === "any") return true;
  const days = filter === "today" ? 1 : filter === "week" ? 7 : 14;
  return upcomingDateKeys(now, days).some((date) => {
    const wd = weekdayOf(date);
    if (filter === "weekends" && wd !== 0 && wd !== 6) return false;
    return slotsForDate(state, tutorId, date, now).some((s) => {
      if (s.state !== "available") return false;
      if (filter === "mornings") return s.start < 12 * 60;
      if (filter === "afternoons") return s.start >= 12 * 60 && s.start < 17 * 60;
      if (filter === "evenings") return s.start >= 17 * 60;
      return true;
    });
  });
}

function FindTutor() {
  const state = useCampus();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [course, setCourse] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("any");

  const subjects = useMemo(() => [...new Set(state.courses.map((c) => c.subject))].sort(), [state.courses]);
  const courseOptions = state.courses.filter((c) => subject === "all" || c.subject === subject);

  const results = state.tutors.filter((t) => {
    const tutorCourses = state.courses.filter((c) => t.courses.includes(c.code));
    const q = query.trim().toLowerCase();
    if (
      q &&
      !t.name.toLowerCase().includes(q) &&
      !t.major.toLowerCase().includes(q) &&
      !tutorCourses.some(
        (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q),
      )
    )
      return false;
    if (subject !== "all" && !tutorCourses.some((c) => c.subject === subject)) return false;
    if (course !== "all" && !t.courses.includes(course)) return false;
    return matchesAvailability(state, t.id, availability, now);
  });

  const filtersActive = query || subject !== "all" || course !== "all" || availability !== "any";
  const clear = () => {
    setQuery("");
    setSubject("all");
    setCourse("all");
    setAvailability("any");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Find a peer tutor"
        title="Who can help you today?"
        description="Every tutor has earned an A in the courses they cover and completed peer-tutor training."
      />

      <div className="card-surface mb-6 grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, course or topic"
            aria-label="Search tutors"
            className="h-11 rounded-full pl-10"
          />
        </div>
        <Select
          value={subject}
          onValueChange={(v) => {
            setSubject(v);
            setCourse("all");
          }}
        >
          <SelectTrigger className="h-11 rounded-full" aria-label="Subject">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger className="h-11 rounded-full" aria-label="Course">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courseOptions.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={(v) => setAvailability(v as AvailabilityFilter)}>
          <SelectTrigger className="h-11 rounded-full" aria-label="Availability">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {results.length} tutor{results.length === 1 ? "" : "s"} found
        </p>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X /> Clear filters
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No tutors match those filters"
          description="Try a different course, widen the time of day, or clear your filters."
          action={<Button onClick={clear}>Clear filters</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((t) => {
            const next = nextOpenSlot(state, t.id, now);
            const days = [...new Set(windowsFor(state, t.id).map((w) => w.weekday))];
            return (
              <article key={t.id} className="card-surface lift flex flex-col p-5">
                <div className="flex items-start gap-4">
                  <PersonAvatar name={t.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-sans text-lg font-bold">{t.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {t.year} · {t.major}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-bold">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        {t.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.courses.map((c) => (
                        <Badge key={c} variant="secondary">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{t.bio}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {t.formats.map((f) => (
                    <FormatTag key={f} format={f} />
                  ))}
                  <span className="text-muted-foreground">
                    {days.length ? days.map((d) => weekdayName(d, "short")).join(", ") : "No weekly hours"}
                  </span>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 mt-5">
                  {next ? (
                    <p className="text-sm font-semibold text-success">
                      Next open: {formatDateShort(next.date)}, {formatMinutes(next.slot.start)}
                    </p>
                  ) : (
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <CalendarX className="h-4 w-4" /> No openings right now
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/tutors/$tutorId" params={{ tutorId: t.id }}>
                        View profile
                      </Link>
                    </Button>
                    {next ? (
                      <Button asChild size="sm">
                        <Link to="/book/$tutorId" params={{ tutorId: t.id }}>
                          Book Session
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" disabled>
                        Book Session
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
