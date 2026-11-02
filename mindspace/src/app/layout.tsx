import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif-display", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Mindspace", template: "%s · Mindspace" },
  description: "A place to think freely, evaluate honestly, and act intentionally.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#16161b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${serif.variable}`}>
      <body className="font-sans">
        <ThemeProvider>
          {children}
          <Toaster position="bottom-center" toastOptions={{ className: "!rounded-lg !border !bg-popover !text-popover-foreground !text-sm !shadow-lg" }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
