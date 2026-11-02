import { Feather } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_60%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Feather className="size-5" />
          </span>
          <h1 className="font-serif text-3xl tracking-tight">Mindspace</h1>
          <p className="mt-1.5 font-serif text-[15px] italic text-muted-foreground">Think freely. Evaluate honestly. Act intentionally.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
