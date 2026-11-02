import type { MetadataRoute } from "next";

/** Lets Android "Install app" / "Add to Home screen" run Mindspace like a native app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mindspace",
    short_name: "Mindspace",
    description: "Think freely. Evaluate honestly. Act intentionally.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#3b3f8f",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Capture a thought", url: "/inbox", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
