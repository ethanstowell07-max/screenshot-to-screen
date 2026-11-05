import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Video, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setRole, useCampus } from "@/lib/campus/store";
import type { DisplayStatus, MeetingFormat, Role } from "@/lib/campus/types";

const AVATAR_TONES = [
  "bg-primary text-primary-foreground",
  "bg-sky text-sky-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-primary-soft text-primary-foreground",
];

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export function PersonAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const tone = AVATAR_TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-2xl",
  };
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-semibold",
        tone,
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

const STATUS: Record<DisplayStatus, { label: string; variant: "success" | "warning" | "destructive" | "muted" | "secondary" }> = {
  confirmed: { label: "Confirmed", variant: "success" },
  pending: { label: "Awaiting tutor", variant: "warning" },
  cancelled: { label: "Canceled", variant: "destructive" },
  declined: { label: "Declined", variant: "destructive" },
  completed: { label: "Completed", variant: "secondary" },
  expired: { label: "Not answered", variant: "muted" },
};

export function StatusBadge({ status, tutorView = false }: { status: DisplayStatus; tutorView?: boolean }) {
  const s = STATUS[status];
  const label = tutorView && status === "pending" ? "Needs response" : s.label;
  return <Badge variant={s.variant}>{label}</Badge>;
}

export function FormatTag({ format, className }: { format: MeetingFormat; className?: string }) {
  const Icon = format === "virtual" ? Video : MapPin;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      <Icon className="h-4 w-4" />
      {format === "virtual" ? "Virtual" : "In person"}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary-soft">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-input bg-sky-wash px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Shows a friendly switch prompt when a page belongs to the other view. */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const state = useCampus();
  const navigate = useNavigate();
  if (state.role === role) return <>{children}</>;
  const isStudentPage = role === "student";
  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState
        icon={isStudentPage ? MapPin : Video}
        title={isStudentPage ? "This page is for students" : "This page is for peer tutors"}
        description={
          isStudentPage
            ? "You're currently viewing CampusConnect as a peer tutor. Switch to the student view to continue."
            : "You're currently viewing CampusConnect as a student. Switch to the tutor view to continue."
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setRole(role)}>
              Switch to {isStudentPage ? "student" : "tutor"} view
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: isStudentPage ? "/tutor-hub" : "/" })}
            >
              Back to my dashboard
            </Button>
          </div>
        }
      />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-xl font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function TextLink({ to, children }: { to: "/appointments" | "/tutors" | "/notifications" | "/tutor-hub/availability" | "/tutor-hub"; children: ReactNode }) {
  return (
    <Link to={to} className="text-sm font-semibold text-primary-soft hover:underline">
      {children}
    </Link>
  );
}
