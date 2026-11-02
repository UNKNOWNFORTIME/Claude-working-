"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Feather, LogOut, Menu, Plus, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NAV_ITEMS } from "./nav-items";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QuickCapture } from "@/components/shared/quick-capture";
import { ThemeToggle } from "@/components/shared/theme";
import { Kbd } from "@/components/ui/misc";
import { CommandPalette } from "./command-palette";
import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

const ShellContext = createContext<{ openCapture: () => void; openSearch: () => void }>({ openCapture: () => {}, openSearch: () => {} });
export const useShell = () => useContext(ShellContext);

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function AppShell({ children, user, inboxCount, tagSuggestions }: { children: React.ReactNode; user: { name: string | null; email: string }; inboxCount: number; tagSuggestions: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => setMobileNav(false), [pathname]);

  // Keyboard: ⌘K search · C capture · G then <key> to navigate
  useEffect(() => {
    let gPressed = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (gPressed && Date.now() - gPressed < 1000) {
        const item = NAV_ITEMS.find((n) => n.key === k);
        gPressed = 0;
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        return;
      }
      if (k === "c" || k === "n") {
        e.preventDefault();
        setCaptureOpen(true);
      } else if (k === "/") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (k === "g") {
        gPressed = Date.now();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] text-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
            active(href) && "bg-muted font-medium text-foreground",
          )}
          aria-current={active(href) ? "page" : undefined}
        >
          <Icon className={cn("size-4 text-muted-foreground group-hover:text-foreground", active(href) && "text-foreground")} />
          {label}
          {href === "/inbox" && inboxCount > 0 && <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{inboxCount}</span>}
        </Link>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-5 px-3 py-4">
      <Link href="/" className="flex items-center gap-2 px-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Feather className="size-4" />
        </span>
        <span className="font-serif text-lg tracking-tight">Mindspace</span>
      </Link>
      <div className="flex flex-col gap-1.5">
        <button onClick={() => setCaptureOpen(true)} className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-[13px] text-foreground/80 shadow-xs transition-colors hover:border-ring/40 hover:text-foreground">
          <Plus className="size-4" /> Capture
          <Kbd className="ml-auto">C</Kbd>
        </button>
        <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Search className="size-4" /> Search
          <span className="ml-auto flex gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>
      </div>
      {nav}
      <div className="mt-auto space-y-3 px-1">
        <ThemeToggle />
        <div className="flex items-center gap-2 px-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
            {(user.name || user.email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{user.name || user.email}</div>
          <form action={logout}>
            <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sign out" title="Sign out">
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <ShellContext.Provider value={{ openCapture: () => setCaptureOpen(true), openSearch: () => setSearchOpen(true) }}>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r bg-sidebar lg:block">{sidebar}</aside>

        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur lg:hidden">
          <button onClick={() => setMobileNav(true)} className="rounded-md p-2 hover:bg-muted" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="font-serif text-lg">Mindspace</span>
          <button onClick={() => setSearchOpen(true)} className="ml-auto rounded-md p-2 hover:bg-muted" aria-label="Search">
            <Search className="size-5" />
          </button>
        </div>
        <AnimatePresence>
          {mobileNav && (
            <>
              <motion.div className="fixed inset-0 z-50 bg-black/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-sidebar lg:hidden"
                initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
              >
                <button onClick={() => setMobileNav(false)} className="absolute right-3 top-4 rounded p-1 hover:bg-muted" aria-label="Close menu">
                  <X className="size-4" />
                </button>
                {sidebar}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 pt-12 lg:pt-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">{children}</div>
        </main>

        {/* Mobile floating capture */}
        <button
          onClick={() => setCaptureOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 lg:hidden"
          aria-label="Capture a thought"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent title="Capture a thought" description="It goes straight to your Inbox. Sort it out later." className="max-w-xl">
          <QuickCapture variant="dialog" autoFocus onCaptured={() => setCaptureOpen(false)} tagSuggestions={tagSuggestions} />
        </DialogContent>
      </Dialog>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} onCapture={() => { setSearchOpen(false); setCaptureOpen(true); }} />
    </ShellContext.Provider>
  );
}
