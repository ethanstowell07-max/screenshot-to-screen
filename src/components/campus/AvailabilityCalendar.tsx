import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fromDateKey, toDateKey } from "@/lib/campus/time";

const HEAD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Month calendar where only dates with open slots can be picked. */
export function AvailabilityCalendar({
  today,
  lastDay,
  openCounts,
  selected,
  onSelect,
}: {
  today: string;
  lastDay: string;
  openCounts: Record<string, number>;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(fromDateKey(selected ?? today)));
  const firstMonth = startOfMonth(fromDateKey(today));
  const lastMonth = startOfMonth(fromDateKey(lastDay));

  const cells = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const list: (string | null)[] = Array.from({ length: start.getDay() }, () => null);
    for (let d = 1; d <= end.getDate(); d++) {
      list.push(toDateKey(new Date(month.getFullYear(), month.getMonth(), d)));
    }
    return list;
  }, [month]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={month <= firstMonth}
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-lg font-semibold">{format(month, "MMMM yyyy")}</p>
        <button
          type="button"
          aria-label="Next month"
          disabled={month >= lastMonth}
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {HEAD.map((h) => (
          <span key={h} className="py-1 text-xs font-bold text-muted-foreground">
            {h}
          </span>
        ))}
        {cells.map((key, i) => {
          if (!key) return <span key={`blank-${i}`} />;
          const inRange = key >= today && key <= lastDay;
          const open = openCounts[key] ?? 0;
          const enabled = inRange && open > 0;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              aria-label={`${format(fromDateKey(key), "EEEE, MMMM d")}${enabled ? `, ${open} open slots` : ", unavailable"}`}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                enabled && !isSelected && "bg-secondary text-secondary-foreground hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground shadow-lift",
                !enabled && "text-muted-foreground/50 line-through decoration-muted-foreground/30",
                key === today && !isSelected && "ring-1 ring-ring",
              )}
            >
              {fromDateKey(key).getDate()}
              {enabled && (
                <span
                  className={cn(
                    "mt-0.5 text-[10px] font-bold",
                    isSelected ? "text-primary-foreground/80" : "text-primary-soft",
                  )}
                >
                  {open} open
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
