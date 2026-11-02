"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  const notFound = /not found/i.test(error.message);
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="font-serif text-2xl">{notFound ? "This item doesn't exist" : "Something went wrong"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {notFound ? "It may have been moved to Trash or deleted." : "Your data is safe. This is usually a temporary problem — for example the database being unreachable."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" onClick={() => (window.location.href = "/")}>Go to dashboard</Button>
        {!notFound && <Button onClick={reset}>Try again</Button>}
      </div>
    </div>
  );
}
