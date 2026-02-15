"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CodeBlock({
  code,
  lang,
}: {
  code: string;
  lang: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group relative my-3 overflow-x-auto rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
          {lang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-foreground/80">{code}</code>
      </pre>
    </div>
  );
}
