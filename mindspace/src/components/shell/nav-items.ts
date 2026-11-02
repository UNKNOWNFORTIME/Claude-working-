import { Archive, Compass, FolderKanban, Home, Inbox, Lightbulb, Settings, Target } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home, key: "d" },
  { href: "/inbox", label: "Inbox", icon: Inbox, key: "i" },
  { href: "/ideas", label: "Ideas", icon: Lightbulb, key: "e" },
  { href: "/projects", label: "Projects", icon: FolderKanban, key: "p" },
  { href: "/goals", label: "Goals", icon: Target, key: "g" },
  { href: "/reflections", label: "Reflections", icon: Compass, key: "r" },
  { href: "/archive", label: "Archive", icon: Archive, key: "a" },
  { href: "/settings", label: "Settings", icon: Settings, key: "s" },
] as const;
