"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { saveAI, testAI } from "@/server/actions/settings";
import type { AISettingsView } from "@/server/services/settings";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function AISection({ initial }: { initial: AISettingsView }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.aiEnabled);
  const [baseUrl, setBaseUrl] = useState(initial.aiBaseUrl);
  const [model, setModel] = useState(initial.aiModel);
  const [key, setKey] = useState("");
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();

  const save = (opts: { clearKey?: boolean } = {}) =>
    start(async () => {
      const r = await saveAI({ aiEnabled: enabled, aiBaseUrl: baseUrl, aiModel: model, aiApiKey: opts.clearKey ? "" : key || undefined });
      if (!r.ok) return void toast.error(r.error);
      setKey("");
      toast.success("AI settings saved");
      router.refresh();
    });

  return (
    <div className="max-w-md space-y-4">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
        <span>
          <span className="block text-sm font-medium">Enable the thinking partner</span>
          <span className="block text-xs text-muted-foreground">Even when enabled, nothing is sent unless you click an AI action on an idea.</span>
        </span>
      </label>
      <Field label="API base URL" htmlFor="ai-url" hint={`Leave blank to use ${initial.effectiveBaseUrl}. Works with OpenAI, OpenRouter, Together, Groq, a local Ollama (http://localhost:11434/v1), etc.`}>
        <Input id="ai-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={initial.effectiveBaseUrl} />
      </Field>
      <Field label="Model" htmlFor="ai-model" hint={`Leave blank to use ${initial.effectiveModel}.`}>
        <Input id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={initial.effectiveModel} />
      </Field>
      <Field label="API key" htmlFor="ai-key" hint={initial.hasStoredKey ? "A key is stored (encrypted). Enter a new one to replace it." : initial.hasEnvKey ? "Using the key from the server environment (AI_API_KEY)." : "Stored encrypted on the server. Never sent back to the browser."}>
        <Input id="ai-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={initial.hasStoredKey ? "••••••••••••" : "sk-…"} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => save()} loading={pending}>Save</Button>
        <Button size="sm" variant="outline" disabled={!initial.ready} loading={testing} onClick={() => startTest(async () => { const r = await testAI(); r.ok ? toast.success(`Connected — model replied: “${r.data}”`) : toast.error(r.error); })}>
          Test connection
        </Button>
        {initial.hasStoredKey && <Button size="sm" variant="ghost" onClick={() => save({ clearKey: true })}>Remove stored key</Button>}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {initial.ready ? <CheckCircle2 className="size-3.5 text-success" /> : <Circle className="size-3.5" />}
          {initial.ready ? "Ready" : "Not active"}
        </span>
      </div>
    </div>
  );
}
