"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Cpu, Download, Smartphone, Trash2, Zap } from "lucide-react";
import { deviceCapabilities, deviceChat, getDevicePrefs, isModelCached, loadDeviceModel, removeDeviceModel, setDevicePrefs } from "@/lib/device-ai";
import { formatBytes, modelByFile } from "@/lib/ai-models";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";

type ServerModel = { file: string; sizeBytes: number; target: string; label: string };

/** Settings for AI that runs on this phone/browser, using a model from the Mindspace server. */
export function DeviceAISection() {
  const [models, setModels] = useState<ServerModel[] | null>(null);
  const [file, setFile] = useState<string>("");
  const [enabled, setEnabled] = useState(false);
  const [cached, setCached] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [testOut, setTestOut] = useState("");
  const [caps, setCaps] = useState<ReturnType<typeof deviceCapabilities> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCaps(deviceCapabilities());
    const prefs = getDevicePrefs();
    setEnabled(prefs.enabled);
    fetch("/api/models")
      .then((r) => r.json())
      .then((d: { models: ServerModel[] }) => {
        setModels(d.models);
        const phone = d.models.filter((m) => m.target === "phone");
        const pick = prefs.file && d.models.some((m) => m.file === prefs.file) ? prefs.file : (phone.find((m) => modelByFile(m.file)?.recommended) ?? phone[0] ?? d.models[0])?.file;
        if (pick) setFile(pick);
      })
      .catch(() => setModels([]));
  }, []);

  useEffect(() => {
    if (file) isModelCached(file).then(setCached);
  }, [file]);

  const persist = (next: { enabled?: boolean; file?: string }) => {
    const p = { enabled: next.enabled ?? enabled, file: next.file ?? file };
    setDevicePrefs(p);
    if (next.enabled !== undefined) setEnabled(next.enabled);
  };

  const download = async () => {
    setBusy(true);
    setProgress(0);
    try {
      await loadDeviceModel(file, setProgress);
      setCached(await isModelCached(file));
      persist({ enabled: true, file });
      toast.success("Model ready on this device — on-device AI is on");
    } catch (e) {
      toast.error(`Couldn't load the model: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const test = async () => {
    setBusy(true);
    setTestOut("");
    abortRef.current = new AbortController();
    const t0 = performance.now();
    try {
      const out = await deviceChat(file, [
        { role: "system", content: "You are a concise, critical thinking partner." },
        { role: "user", content: "In two short bullet points: what is the biggest risk of starting a side project without testing demand first?" },
      ], { onToken: setTestOut, onLoadProgress: setProgress, signal: abortRef.current.signal });
      setProgress(null);
      setTestOut(out + `\n\n_${((performance.now() - t0) / 1000).toFixed(1)}s on this device_`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const selected = models?.find((m) => m.file === file);

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Runs a small AI model directly on this phone or browser. The model is copied once from your Mindspace computer — no internet and no cloud needed — and your thinking never leaves the device.
      </p>
      {caps && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1"><Zap className="size-3" /> {caps.webgpu ? "GPU acceleration available" : "No WebGPU — runs on CPU"}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1"><Cpu className="size-3" /> {caps.multithread ? `${caps.cores} CPU threads` : "Single-thread mode"}</span>
          {caps.memoryGB && <span className="rounded-md bg-muted px-2 py-1">~{caps.memoryGB} GB RAM</span>}
          {!caps.secure && <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">Not HTTPS: the model can&apos;t be stored and will re-download each session</span>}
        </div>
      )}

      {models === null ? (
        <p className="text-sm text-muted-foreground">Checking available models…</p>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          <p className="font-medium">No models on the Mindspace computer yet</p>
          <p className="mt-1 text-muted-foreground">On the computer running Mindspace, run:</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">npm run ai:download -- phone</pre>
        </div>
      ) : (
        <>
          <Select value={file} onChange={(e) => { setFile(e.target.value); persist({ file: e.target.value }); }} className="w-full" aria-label="On-device model">
            {models.map((m) => (
              <option key={m.file} value={m.file}>{m.label} · {formatBytes(m.sizeBytes)}{m.target === "laptop" ? " · large for a phone" : ""}</option>
            ))}
          </Select>
          {selected && <p className="text-xs text-muted-foreground">{modelByFile(selected.file)?.description ?? "Custom model."}</p>}

          {progress != null && (
            <div className="space-y-1">
              <Progress value={progress * 100} />
              <p className="text-xs text-muted-foreground">Copying model to this device… {Math.round(progress * 100)}%{selected ? ` of ${formatBytes(selected.sizeBytes)}` : ""}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!cached ? (
              <Button size="sm" onClick={download} loading={busy}><Download /> Download to this device</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={test} loading={busy}><Smartphone /> Test on this device</Button>
            )}
            {cached && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={async () => { await removeDeviceModel(file).catch(() => undefined); setCached(false); persist({ enabled: false }); toast.success("Removed from this device"); }}>
                <Trash2 /> Remove from device
              </Button>
            )}
          </div>

          <label className="flex items-start gap-3">
            <input type="checkbox" checked={enabled} disabled={!file} onChange={(e) => persist({ enabled: e.target.checked })} className="mt-1 size-4 accent-[var(--color-primary)]" />
            <span>
              <span className="block text-sm font-medium">Use on-device AI in this browser</span>
              <span className="block text-xs text-muted-foreground">When on, AI actions on this device run here instead of on the Mindspace computer. This setting is per device.</span>
            </span>
          </label>
          {testOut && <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{testOut}</div>}
        </>
      )}
    </div>
  );
}
