"use client";
import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("flex items-center gap-1 border-b overflow-x-auto scrollbar-thin", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = T.Content;
