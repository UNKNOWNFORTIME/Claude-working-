import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-mind text-[15px]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
