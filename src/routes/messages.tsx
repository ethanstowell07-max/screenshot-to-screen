import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageSquareDashed, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, PersonAvatar } from "@/components/campus/shared";
import { currentIdentity, runAction, useCampus } from "@/lib/campus/store";
import { sendMessage } from "@/lib/campus/actions";
import { formatTimestamp } from "@/lib/campus/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): { with?: string } =>
    typeof search.with === "string" ? { with: search.with } : {},
  head: () => ({
    meta: [
      { title: "Messages · CampusConnect" },
      { name: "description", content: "Chat with your peer tutors and students before and after sessions." },
      { property: "og:title", content: "Messages · CampusConnect" },
      { property: "og:description", content: "Chat with your peer tutors and students before and after sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Messages,
});

function Messages() {
  const state = useCampus();
  const { with: withId } = Route.useSearch();
  const navigate = useNavigate();
  const me = currentIdentity(state);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Contacts: anyone you've messaged or had a session with.
  const contacts = useMemo(() => {
    const ids = new Set<string>();
    const pick = (x: { studentId: string; tutorId: string }) => {
      if (me.role === "student" && x.studentId === me.id) ids.add(x.tutorId);
      if (me.role === "tutor" && x.tutorId === me.id) ids.add(x.studentId);
    };
    state.messages.forEach(pick);
    state.appointments.forEach(pick);
    if (withId) ids.add(withId);
    return [...ids]
      .map((id) => {
        const person =
          me.role === "student" ? state.tutors.find((t) => t.id === id) : state.students.find((s) => s.id === id);
        if (!person) return null;
        const thread = state.messages.filter((m) =>
          me.role === "student" ? m.studentId === me.id && m.tutorId === id : m.tutorId === me.id && m.studentId === id,
        );
        return { id, name: person.name, subtitle: person.major, last: thread[thread.length - 1] };
      })
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? ""));
  }, [state, me.role, me.id, withId]);

  const active = contacts.find((c) => c.id === withId) ?? null;
  const pair = active
    ? me.role === "student"
      ? { studentId: me.id, tutorId: active.id }
      : { studentId: active.id, tutorId: me.id }
    : null;
  const thread = pair
    ? state.messages.filter((m) => m.studentId === pair.studentId && m.tutorId === pair.tutorId)
    : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, active?.id]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair) return;
    const res = runAction((s, n) => sendMessage(s, { ...pair, from: me.role, body: draft }, n));
    if (!res.ok) return toast.error(res.error);
    setDraft("");
  };

  return (
    <div>
      <PageHeader eyebrow="Messages" title="Conversations" />
      {contacts.length === 0 ? (
        <EmptyState
          icon={MessageSquareDashed}
          title="No conversations yet"
          description={
            me.role === "student"
              ? "Message a tutor from their profile to ask a question before booking."
              : "When students book with you, you can chat with them here."
          }
          action={
            me.role === "student" ? (
              <Button asChild>
                <Link to="/tutors">Find a Tutor</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="card-surface grid h-[calc(100vh-15rem)] min-h-[28rem] overflow-hidden md:grid-cols-[18rem_1fr]">
          <ul className={cn("overflow-y-auto border-r border-border", active && "hidden md:block")}>
            {contacts.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate({ to: "/messages", search: { with: c.id }, replace: true })}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-muted",
                    c.id === active?.id && "bg-secondary",
                  )}
                >
                  <PersonAvatar name={c.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{c.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {c.last ? c.last.body : c.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className={cn("flex min-h-0 flex-col", !active && "hidden md:flex")}>
            {!active ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
                Select a conversation to start chatting.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <button
                    className="md:hidden"
                    aria-label="Back to conversations"
                    onClick={() => navigate({ to: "/messages", search: {}, replace: true })}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <PersonAvatar name={active.name} size="sm" />
                  <div>
                    <p className="font-bold">{active.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {me.role === "student" ? "Peer tutor" : "Student"} · {active.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto bg-sky-wash p-4">
                  {thread.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Say hello to {active.name.split(" ")[0]} 👋
                    </p>
                  )}
                  {thread.map((m) => {
                    const mine = m.from === me.role;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                            mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card shadow-card",
                          )}
                        >
                          <p>{m.body}</p>
                          <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {formatTimestamp(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${active.name.split(" ")[0]}…`}
                    aria-label="Message"
                    className="h-11 rounded-full"
                  />
                  <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim()}>
                    <Send />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
