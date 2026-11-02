import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="font-serif text-3xl">Nothing here</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page or item doesn&apos;t exist, or it&apos;s in Trash.</p>
      <Link href="/" className="mt-6 text-sm text-primary hover:underline">Back to dashboard</Link>
    </div>
  );
}
