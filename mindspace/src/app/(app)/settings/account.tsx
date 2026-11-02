"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changePassword, signOutEverywhere, updateProfile } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ProfileSection({ name, email }: { name: string; email: string }) {
  const [v, setV] = useState(name);
  const [pending, start] = useTransition();
  return (
    <form className="max-w-sm space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateProfile({ name: v }); r.ok ? toast.success("Saved") : toast.error(r.error); }); }}>
      <Field label="Name" htmlFor="name"><Input id="name" value={v} onChange={(e) => setV(e.target.value)} /></Field>
      <Field label="Email" htmlFor="email"><Input id="email" value={email} disabled /></Field>
      <Button size="sm" loading={pending} disabled={v === name}>Save</Button>
    </form>
  );
}

export function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="max-w-sm space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== confirm) return void toast.error("New passwords don't match");
        start(async () => {
          const r = await changePassword({ current, next });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Password changed. Other sessions were signed out.");
          setCurrent(""); setNext(""); setConfirm("");
        });
      }}
    >
      <Field label="Current password" htmlFor="pw-current"><Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
      <Field label="New password" htmlFor="pw-new" hint="At least 10 characters."><Input id="pw-new" type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
      <Field label="Confirm new password" htmlFor="pw-confirm"><Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></Field>
      <Button size="sm" loading={pending}>Change password</Button>
    </form>
  );
}

export function SecuritySection() {
  return (
    <form action={signOutEverywhere} className="space-y-2">
      <p className="text-sm text-muted-foreground">Signs out every browser and device, including this one.</p>
      <Button variant="outline" size="sm">Sign out everywhere</Button>
    </form>
  );
}
