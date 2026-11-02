"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, Globe, Laptop } from "lucide-react";
import { saveAI, testAI } from "@/server/actions/settings";
import type { AISettingsView } from "@/server/services/settings";
import { MODEL_CATALOG, formatBytes } from "@/lib/ai-models";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Kbd } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export function AISection({ initial }: { initial: AISettingsView }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.aiEnabled);
  const [provider, setProvider] = useState(initial.aiProvider);
  const [localModel, setLocalModel] = useState(initial.localModel ?? "");
  const [baseUrl, setBaseUrl] = useState(initial.aiBaseUrl);
  const [model, setModel] = useState(initial.aiModel);
  const [key, setKey] = useState("");
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();
  const laptopModels = initial.localModels;

  const save = (opts: { clearKey?: boolean } = {}) =>
    start(async () => {
      const r = await saveAI({ aiEnabled: enabled, aiProvider: provider, localModel, aiBaseUrl: baseUrl, aiModel: model, aiApiKey: opts.clearKey ? "" : key || undefined });
      if (!r.ok) return void toast.error(r.error);
      setKey("");
      toast.success("AI settings saved");
      router.refresh();
    });

  return (
    <div className="max-w-lg space-y-5">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
        <span>
          <span className="block text-sm font-medium">Enable the thinking partner</span>
          <span className="block text-xs text-muted-foreground">Even when enabled, it only runs when you click an AI action on an idea.</span>
        </span>
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="AI provider">
        {([
          { v: "local", icon: Laptop, title: "Built-in offline model", text: "Runs inside Mindspace on this computer. No internet, nothing leaves your machine." },
          { v: "remote", icon: Globe, title: "OpenAI-compatible API", text: "OpenAI, OpenRouter, Groq… or a local Ollama server." },
        ] as const).map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={provider === o.v} onClick={() => setProvider(o.v)}
            className={cn("rounded-lg border p-3 text-left transition-colors hover:bg-muted/50", provider === o.v && "border-primary/50 bg-accent/40")}>
            <o.icon className="mb-1.5 size-4 text-muted-foreground" />
            <div className="text-sm font-medium">{o.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{o.text}</div>
          </button>
        ))}
      </div>

      {provider === "local" ? (
        <div className="space-y-3">
          {laptopModels.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm">
              <p className="font-medium">No model downloaded yet</p>
              <p className="mt-1 text-muted-foreground">Run this once in the <code>mindspace</code> folder (needs internet only for the download):</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">npm run ai:download</pre>
              <p className="mt-2 text-xs text-muted-foreground">It fetches the recommended laptop model ({MODEL_CATALOG.find((m) => m.target === "laptop" && m.recommended)?.label}, {MODEL_CATALOG.find((m) => m.target === "laptop" && m.recommended)?.sizeLabel}) and the phone model. Then reload this page.</p>
            </div>
          ) : (
            <Field label="Model" htmlFor="local-model" hint="Larger models give better answers but are slower. Phone-sized models work here too.">
              <Select id="local-model" value={localModel} onChange={(e) => setLocalModel(e.target.value)} className="w-full">
                <option value="">Automatic (recommended)</option>
                {laptopModels.map((m) => <option key={m.file} value={m.file}>{m.label} · {formatBytes(m.sizeBytes)}{m.target === "phone" ? " · phone-sized" : ""}</option>)}
              </Select>
            </Field>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="API base URL" htmlFor="ai-url" hint={`Leave blank to use ${initial.effectiveBaseUrl}. For Ollama use http://localhost:11434/v1.`}>
            <Input id="ai-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={initial.effectiveBaseUrl} />
          </Field>
          <Field label="Model" htmlFor="ai-model" hint={`Leave blank to use ${initial.effectiveModel}.`}>
            <Input id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={initial.effectiveModel} />
          </Field>
          <Field label="API key" htmlFor="ai-key" hint={initial.hasStoredKey ? "A key is stored (encrypted). Enter a new one to replace it." : initial.hasEnvKey ? "Using the key from the server environment (AI_API_KEY)." : "Stored encrypted on the server. Never sent back to the browser."}>
            <Input id="ai-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={initial.hasStoredKey ? "••••••••••••" : "sk-…"} />
          </Field>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => save()} loading={pending}>Save</Button>
        <Button size="sm" variant="outline" disabled={!initial.ready} loading={testing} onClick={() => startTest(async () => { const r = await testAI(); r.ok ? toast.success(`Working — the model replied: “${r.data}”`) : toast.error(r.error); })}>
          Test
        </Button>
        {provider === "remote" && initial.hasStoredKey && <Button size="sm" variant="ghost" onClick={() => save({ clearKey: true })}>Remove stored key</Button>}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {initial.ready ? <CheckCircle2 className="size-3.5 text-success" /> : <Circle className="size-3.5" />}
          {initial.ready ? (initial.aiProvider === "local" ? `Ready · ${initial.localModel}` : "Ready") : "Not active"}
        </span>
      </div>
      {provider === "local" && <p className="text-xs text-muted-foreground">The first answer after starting Mindspace takes a few extra seconds while the model loads. <Kbd>Test</Kbd> warms it up.</p>}
    </div>
  );
}
