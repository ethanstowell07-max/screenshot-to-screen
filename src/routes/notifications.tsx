import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BellOff, CalendarCheck, CalendarClock, CalendarX, CheckCheck, Inbox, MessageSquare, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/campus/shared";
import { currentIdentity, updateState, useCampus } from "@/lib/campus/store";
import { markNotificationsRead } from "@/lib/campus/actions";
import { formatTimestamp } from "@/lib/campus/time";
import type { NotificationKind } from "@/lib/campus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · CampusConnect" },
      { name: "description", content: "Booking confirmations, cancellations, reschedules and new session requests." },
      { property: "og:title", content: "Notifications · CampusConnect" },
      { property: "og:description", content: "Booking confirmations, cancellations, reschedules and new session requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notifications,
});

const ICONS: Record<NotificationKind, { icon: LucideIcon; tone: string }> = {
  request: { icon: Inbox, tone: "bg-secondary text-primary" },
  confirmed: { icon: CalendarCheck, tone: "bg-success-soft text-success" },
  declined: { icon: CalendarX, tone: "bg-destructive-soft text-destructive" },
  cancelled: { icon: CalendarX, tone: "bg-destructive-soft text-destructive" },
  rescheduled: { icon: CalendarClock, tone: "bg-warning-soft text-warning-foreground" },
  message: { icon: MessageSquare, tone: "bg-secondary text-primary" },
};

function Notifications() {
  const state = useCampus();
  const navigate = useNavigate();
  const me = currentIdentity(state);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const mine = state.notifications.filter((n) => n.role === me.role && n.recipientId === me.id);
  const unread = mine.filter((n) => !n.read).length;
  const list = filter === "unread" ? mine.filter((n) => !n.read) : mine;

  const open = (id: string) => {
    updateState((s) => markNotificationsRead(s, me.role, me.id, [id]));
    navigate({ to: me.role === "student" ? "/appointments" : "/tutor-hub" });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Notifications"
        title={unread ? `You have ${unread} new update${unread === 1 ? "" : "s"}` : "You're all caught up"}
        actions={
          <Button
            variant="outline"
            disabled={unread === 0}
            onClick={() => updateState((s) => markNotificationsRead(s, me.role, me.id))}
          >
            <CheckCheck /> Mark all as read
          </Button>
        }
      />
      <div className="mb-4 inline-flex rounded-full bg-secondary p-1">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            {f === "all" ? "All" : `Unread (${unread})`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description={
            me.role === "student"
              ? "You'll hear from us here when tutors confirm, cancel or reschedule your sessions."
              : "New session requests and changes from students will show up here."
          }
        />
      ) : (
        <ul className="card-surface divide-y divide-border overflow-hidden">
          {list.map((n) => {
            const { icon: Icon, tone } = ICONS[n.kind];
            return (
              <li key={n.id}>
                <button
                  onClick={() => open(n.id)}
                  className={cn(
                    "flex w-full gap-4 p-4 text-left transition-colors hover:bg-muted sm:p-5",
                    !n.read && "bg-sky-wash",
                  )}
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{n.title}</span>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-sky" aria-label="Unread" />}
                    </span>
                    <span className="block text-sm text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{formatTimestamp(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
