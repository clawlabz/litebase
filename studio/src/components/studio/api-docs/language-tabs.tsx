"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block";

interface LanguageExample {
  readonly label: string;
  readonly language: string;
  readonly code: string;
}

interface LanguageTabsProps {
  readonly examples: readonly LanguageExample[];
}

export function LanguageTabs({ examples }: LanguageTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (examples.length === 0) return null;

  const active = examples[activeIndex];

  return (
    <div>
      <div className="flex gap-1 border-b border-border/50 mb-0">
        {examples.map((ex, i) => (
          <button
            key={ex.label}
            onClick={() => setActiveIndex(i)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
              i === activeIndex
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {ex.label}
            {i === activeIndex && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ff88]" />
            )}
          </button>
        ))}
      </div>
      {active && <CodeBlock code={active.code} language={active.language} />}
    </div>
  );
}
