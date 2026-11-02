import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";

export function ListRow({ href, title, meta, right, className }: { href: string; title: React.ReactNode; meta?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-3 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-muted/70", className)}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground/90 group-hover:text-foreground">{title}</div>
        {meta && <div className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </Link>
  );
}

export function TimeAgo({ date, className }: { date: Date | string; className?: string }) {
  const d = typeof date === "string" ? new Date(date) : date;
  return (
    <time dateTime={d.toISOString()} title={d.toLocaleString()} className={cn("tabular-nums", className)} suppressHydrationWarning>
      {timeAgo(d)}
    </time>
  );
}
