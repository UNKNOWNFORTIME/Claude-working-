"use client";
import { useEffect, useState } from "react";
import { getDevicePrefs, type DevicePrefs } from "@/lib/device-ai";

/** On-device AI preference for this browser (kept in localStorage). */
export function useDeviceAI(): DevicePrefs & { active: boolean } {
  const [prefs, setPrefs] = useState<DevicePrefs>({ enabled: false, file: null });
  useEffect(() => {
    const sync = () => setPrefs(getDevicePrefs());
    sync();
    window.addEventListener("mindspace-device-ai", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mindspace-device-ai", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { ...prefs, active: prefs.enabled && !!prefs.file };
}
