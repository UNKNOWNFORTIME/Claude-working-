"use client";
import { useActionState } from "react";
import { setupAccount } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAccount, undefined);
  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div>
        <h2 className="font-medium">Create your private account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Mindspace is single-user. Once this account exists, setup is closed.</p>
      </div>
      <Field label="Name (optional)" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" defaultValue={state?.name} key={`n${state?.name}`} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} key={`e${state?.email}`} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      {state?.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <Button className="w-full" loading={pending}>Create account</Button>
    </form>
  );
}
