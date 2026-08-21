"use client";

import { useState } from "react";

interface CopyPacketPanelProps {
  handoffUrl: string;
  summary: string;
  pages?: { title: string; lines: string[] }[];
}

export function CopyPacketPanel({ handoffUrl, summary, pages = [] }: CopyPacketPanelProps) {
  const [copied, setCopied] = useState(false);
  const description = summary.trim();

  async function copyDescription() {
    await navigator.clipboard.writeText(description);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="card space-y-5 p-5">
      <div>
        <h2 className="text-lg font-semibold">Description for NYC311</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Paste this into the <strong>Description</strong> field on step 1 (What) of the official
          form.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={handoffUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
          Open NYC311 form
        </a>
        <button type="button" className="btn btn-secondary" onClick={() => void copyDescription()}>
          {copied ? "Copied!" : "Copy description"}
        </button>
      </div>

      <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
        {description || pages[0]?.lines.join("\n") || "No description saved."}
      </pre>
    </section>
  );
}
