import * as React from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground", className)} {...props} />;
}

export function EmptyState({ icon: Icon, title, children, action, className }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      {Icon && (
        <div className="mb-3 rounded-full bg-muted p-3">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      )}
      <p className="font-serif text-lg">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs text-muted-foreground">{eyebrow}</div>}
        <h1 className="font-serif text-3xl font-normal tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary/80 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function SectionLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground", className)} {...props} />;
}
