import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CalendarDays, History, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppointmentCard } from "@/components/campus/AppointmentCard";
import { EmptyState, PageHeader, RoleGate } from "@/components/campus/shared";
import { runAction, useCampus } from "@/lib/campus/store";
import { useNow } from "@/lib/campus/use-now";
import { cancelAppointment } from "@/lib/campus/actions";
import { displayStatus, isUpcoming, sortByDate } from "@/lib/campus/scheduling";
import { formatDateLong, formatMinutes } from "@/lib/campus/time";
import type { Appointment } from "@/lib/campus/types";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "My Appointments · CampusConnect" },
      { name: "description", content: "Review, cancel or reschedule your upcoming and past tutoring sessions." },
      { property: "og:title", content: "My Appointments · CampusConnect" },
      { property: "og:description", content: "Review, cancel or reschedule your upcoming and past tutoring sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate role="student">
      <MyAppointments />
    </RoleGate>
  ),
});

function MyAppointments() {
  const state = useCampus();
  const now = useNow();
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const mine = state.appointments.filter((a) => a.studentId === state.currentStudentId);
  const upcoming = sortByDate(mine.filter((a) => isUpcoming(a, now)));
  const previous = sortByDate(
    mine.filter((a) => !isUpcoming(a, now)),
    "desc",
  );

  const confirmCancel = () => {
    if (!toCancel) return;
    const res = runAction((s, n) => cancelAppointment(s, toCancel.id, "student", n));
    if (res.ok) {
      const tutor = state.tutors.find((t) => t.id === toCancel.tutorId)!;
      toast.success("Session canceled", {
        description: `${tutor.name} has been notified and the slot is open again.`,
      });
    } else {
      toast.error("Couldn't cancel", { description: res.error });
    }
    setToCancel(null);
  };

  const cancelTutor = toCancel ? state.tutors.find((t) => t.id === toCancel.tutorId) : null;

  return (
    <div>
      <PageHeader
        eyebrow="My appointments"
        title="Your tutoring sessions"
        actions={
          <Button asChild>
            <Link to="/tutors">Book a new session</Link>
          </Button>
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6 h-auto rounded-full bg-secondary p-1">
          <TabsTrigger value="upcoming" className="rounded-full px-4 py-2 font-semibold">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="previous" className="rounded-full px-4 py-2 font-semibold">
            Previous ({previous.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing on the calendar"
              description="Book a session with a peer tutor and it'll appear here."
              action={
                <Button asChild>
                  <Link to="/tutors">Find a Tutor</Link>
                </Button>
              }
            />
          ) : (
            upcoming.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                perspective="student"
                now={now}
                actions={
                  <>
                    <Button asChild variant="ghost" size="sm" aria-label="Message tutor">
                      <Link to="/messages" search={{ with: a.tutorId }}>
                        <MessageSquare />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/book/$tutorId" params={{ tutorId: a.tutorId }} search={{ reschedule: a.id }}>
                        <CalendarClock /> Reschedule
                      </Link>
                    </Button>
                    <Button variant="destructive-soft" size="sm" onClick={() => setToCancel(a)}>
                      <X /> Cancel
                    </Button>
                  </>
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="previous" className="space-y-3">
          {previous.length === 0 ? (
            <EmptyState
              icon={History}
              title="No past sessions yet"
              description="Completed, canceled and declined sessions will be listed here."
            />
          ) : (
            previous.map((a) => {
              const status = displayStatus(a, now);
              return (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  perspective="student"
                  now={now}
                  actions={
                    <Button asChild variant={status === "completed" ? "outline" : "default"} size="sm">
                      <Link to="/book/$tutorId" params={{ tutorId: a.tutorId }}>
                        {status === "completed" ? "Book again" : "Book a new time"}
                      </Link>
                    </Button>
                  }
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {toCancel && cancelTutor
                ? `${toCancel.courseCode} with ${cancelTutor.name} on ${formatDateLong(toCancel.date)} at ${formatMinutes(toCancel.start)}. Your tutor will be notified.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep session</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
