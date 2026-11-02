"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** URL-driven filters so filtered views are linkable and survive refresh. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return { params, set, pending };
}

export function SearchInput({ param = "q", placeholder = "Search…", className }: { param?: string; placeholder?: string; className?: string }) {
  const { params, set, pending } = useQueryState();
  const [value, setValue] = useState(params.get(param) ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get(param) ?? "") !== value) set({ [param]: value || null });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-8 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      />
      {pending ? (
        <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : value ? (
        <button onClick={() => setValue("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({ param, label, options, className }: { param: string; label: string; options: { value: string; label: string }[]; className?: string }) {
  const { params, set } = useQueryState();
  return (
    <Select aria-label={label} value={params.get(param) ?? ""} onChange={(e) => set({ [param]: e.target.value || null })} className={cn("h-9 text-[13px]", className)}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  );
}

export function ClearFilters({ keys }: { keys: string[] }) {
  const { params, set } = useQueryState();
  if (!keys.some((k) => params.get(k))) return null;
  return (
    <button onClick={() => set(Object.fromEntries(keys.map((k) => [k, null])))} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">
      Clear filters
    </button>
  );
}
