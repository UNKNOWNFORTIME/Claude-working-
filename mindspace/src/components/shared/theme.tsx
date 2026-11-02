"use client";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const opts = [
    { v: "light", icon: Sun, label: "Light" },
    { v: "dark", icon: Moon, label: "Dark" },
    { v: "system", icon: Monitor, label: "System" },
  ];
  return (
    <div className={cn("flex rounded-md border bg-card p-0.5", className)} role="radiogroup" aria-label="Theme">
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          role="radio"
          aria-checked={mounted && theme === v}
          aria-label={label}
          title={label}
          onClick={() => setTheme(v)}
          className={cn("flex-1 rounded px-2 py-1 text-muted-foreground transition-colors hover:text-foreground", mounted && theme === v && "bg-muted text-foreground")}
        >
          <Icon className="mx-auto size-3.5" />
        </button>
      ))}
    </div>
  );
}
