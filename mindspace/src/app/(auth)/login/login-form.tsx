"use client";
import { useActionState } from "react";
import { login } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus={!state?.email} defaultValue={state?.email} key={state?.email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus={!!state?.email} />
      </Field>
      {state?.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <Button className="w-full" loading={pending}>Sign in</Button>
    </form>
  );
}
