import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring disabled:opacity-50 aria-invalid:border-destructive",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { autoGrow?: boolean }>(
  ({ className, autoGrow, onInput, ...props }, ref) => {
    const inner = React.useRef<HTMLTextAreaElement | null>(null);
    const resize = React.useCallback(() => {
      const el = inner.current;
      if (!autoGrow || !el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    }, [autoGrow]);
    React.useLayoutEffect(resize, [resize, props.value]);
    return (
      <textarea
        ref={(el) => {
          inner.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        className={cn(
          "flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed shadow-xs placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring disabled:opacity-50",
          autoGrow && "resize-none overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-foreground/80", className)} {...props} />;
}

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 rounded-md border border-input bg-card pl-3 pr-8 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring appearance-none bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat",
      "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Field({ label, hint, children, className, htmlFor }: { label: string; hint?: string; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
