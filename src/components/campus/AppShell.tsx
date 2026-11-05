import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageSquare,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { currentIdentity, hydrateCampus, setRole, useCampusMaybe } from "@/lib/campus/store";
import type { CampusState, Role } from "@/lib/campus/types";
import { PersonAvatar } from "./shared";

type NavTo = "/" | "/tutors" | "/appointments" | "/messages" | "/profile" | "/tutor-hub" | "/tutor-hub/availability";

const NAV: Record<Role, { to: NavTo; label: string; icon: LucideIcon; exact?: boolean }[]> = {
  student: [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/tutors", label: "Find a Tutor", icon: Search },
    { to: "/appointments", label: "Appointments", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/profile", label: "Profile", icon: User },
  ],
  tutor: [
    { to: "/tutor-hub", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/tutor-hub/availability", label: "Availability", icon: CalendarClock },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/profile", label: "Profile", icon: User },
  ],
};

function displayName(state: CampusState) {
  return state.role === "student"
    ? state.students.find((s) => s.id === state.currentStudentId)!.name
    : state.tutors.find((t) => t.id === state.currentTutorId)!.name;
}

function RoleSwitcher({ state, compact = false }: { state: CampusState; compact?: boolean }) {
  const navigate = useNavigate();
  const choose = (role: Role) => {
    if (role === state.role) return;
    setRole(role);
    navigate({ to: role === "student" ? "/" : "/tutor-hub" });
    const name =
      role === "student"
        ? state.students.find((s) => s.id === state.currentStudentId)!.name
        : state.tutors.find((t) => t.id === state.currentTutorId)!.name;
    toast.success(`Now viewing as ${name}`, {
      description: role === "student" ? "Student view" : "Peer tutor view",
    });
  };
  return (
    <div
      role="radiogroup"
      aria-label="Switch view"
      className="inline-flex rounded-full border border-border bg-muted p-1"
    >
      {(["student", "tutor"] as Role[]).map((r) => (
        <button
          key={r}
          role="radio"
          aria-checked={state.role === r}
          onClick={() => choose(r)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
            state.role === r
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r === "student" ? "Student" : compact ? "Tutor" : "Peer Tutor"}
        </button>
      ))}
    </div>
  );
}

function Header({ state }: { state: CampusState }) {
  const me = currentIdentity(state);
  const unread = state.notifications.filter(
    (n) => n.role === me.role && n.recipientId === me.id && !n.read,
  ).length;
  const name = displayName(state);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          to={state.role === "student" ? "/" : "/tutor-hub"}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold">CampusConnect</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
              Peer Tutor Scheduling
            </span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV[state.role].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <RoleSwitcher state={state} />
          </div>
          <div className="sm:hidden">
            <RoleSwitcher state={state} compact />
          </div>
          <Link
            to="/notifications"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
            activeProps={{ className: "bg-secondary" }}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread}
              </span>
            )}
          </Link>
          <Link to="/profile" aria-label="Your profile" className="hidden md:block">
            <PersonAvatar name={name} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ state }: { state: CampusState }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-xl justify-around px-2">
        {NAV[state.role].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-secondary",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                {item.label}
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function LoadingShell() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b border-border bg-card" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <div className="h-48 animate-pulse rounded-3xl bg-secondary" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const state = useCampusMaybe();
  useEffect(() => {
    hydrateCampus();
  }, []);
  if (!state) return <LoadingShell />;
  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <Header state={state} />
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main>
      <BottomNav state={state} />
    </div>
  );
}
