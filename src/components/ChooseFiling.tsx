"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { COFFEE_TIP_CENTS } from "@/lib/queue-client";
import type { FilingPath, QueueStats, StoredReport } from "@/types/report";

interface ChooseFilingProps {
  report: StoredReport;
  initialStats: QueueStats;
}

export function ChooseFiling({ report, initialStats }: ChooseFilingProps) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [email, setEmail] = useState(report.contactEmail || "");
  const [loading, setLoading] = useState<FilingPath | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coffeeDollars = useMemo(() => (COFFEE_TIP_CENTS / 100).toFixed(0), []);

  async function refreshStats() {
    const response = await fetch("/api/queue");
    if (!response.ok) return;
    const payload = (await response.json()) as { stats: QueueStats };
    setStats(payload.stats);
  }

  async function choose(filingPath: FilingPath, tipPaid = false) {
    setLoading(filingPath);
    setError(null);

    try {
      if (filingPath !== "self_file" && !email.includes("@")) {
        throw new Error("Enter an email so we can send you the 311 number.");
      }

      const response = await fetch(`/api/reports/${report.id}/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filingPath,
          contactEmail: email,
          tipPaid,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        next?: string;
        stats?: QueueStats;
      };

      if (!response.ok) {
        if (payload.stats) setStats(payload.stats);
        else await refreshStats();
        throw new Error(payload.error || "Unable to save your choice.");
      }

      router.push(payload.next || `/success/${report.id}`);
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "Unable to save your choice.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Almost done
        </p>
        <h1 className="mt-2 text-3xl font-bold">How should we file this?</h1>
        <p className="mt-2 text-[var(--muted)]">
          AI already filled the 311 packet. Pick how it gets to the city.
        </p>
      </div>

      <div className="card space-y-2 p-5 text-sm text-[var(--muted)]">
        <p>
          Free queue: {stats.freePending}/{stats.freeCap} · Coffee priority: {stats.coffeePending}
        </p>
        {stats.coffeeRecommended && (
          <p className="font-medium text-[var(--warning)]">
            Free filing is busy right now — buying a coffee gets you priority, or file it yourself in a few minutes.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="email">Email (needed for volunteer filing updates)</label>
        <input
          id="email"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="grid gap-4">
        <button
          type="button"
          className="card p-5 text-left transition hover:border-[var(--accent)]"
          disabled={!stats.freeAvailable || loading !== null}
          onClick={() => void choose("free_queue")}
          style={{ opacity: stats.freeAvailable ? 1 : 0.55 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">We will try to file this for you for free</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Volunteers file as capacity allows. Limited slots so the queue stays workable.
              </p>
            </div>
            <span className="badge badge-info">Free</span>
          </div>
          {!stats.freeAvailable && (
            <p className="mt-3 text-sm font-medium text-[var(--error)]">
              Free queue is full. Choose coffee priority or file it yourself.
            </p>
          )}
          {loading === "free_queue" && <p className="mt-3 text-sm">Joining free queue...</p>}
        </button>

        <button
          type="button"
          className="card p-5 text-left transition hover:border-[var(--accent)]"
          disabled={loading !== null}
          onClick={() => void choose("coffee_tip", true)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Buy your volunteer a coffee (${coffeeDollars})</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Priority filing. Your tip supports the person who submits this on 311 for you.
              </p>
            </div>
            <span className="badge badge-warning">Priority</span>
          </div>
          {stats.coffeeRecommended && (
            <p className="mt-3 text-sm font-medium text-[var(--accent-dark)]">Recommended right now</p>
          )}
          {loading === "coffee_tip" && <p className="mt-3 text-sm">Saving priority request...</p>}
        </button>

        <button
          type="button"
          className="card p-5 text-left transition hover:border-[var(--accent)]"
          disabled={loading !== null}
          onClick={() => void choose("self_file")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">File it yourself</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Get the AI-filled packet and finish on NYC311 Online in a couple of minutes. Fastest option.
              </p>
            </div>
            <span className="badge badge-success">Instant</span>
          </div>
          {loading === "self_file" && <p className="mt-3 text-sm">Preparing packet...</p>}
        </button>
      </div>

      {error && <p className="text-sm font-medium text-[var(--error)]">{error}</p>}
    </div>
  );
}
