"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  readonly code: string;
  readonly language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative">
      <div className="rounded-lg bg-[#0d0d1a] text-[13px] leading-relaxed overflow-x-auto">
        {language && (
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-1.5">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {language}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-[#00ff88]" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
        <pre className="px-4 py-3 overflow-x-auto">
          <code className="font-mono text-zinc-300 whitespace-pre">
            {code}
          </code>
        </pre>
        {!language && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-[#00ff88]" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
