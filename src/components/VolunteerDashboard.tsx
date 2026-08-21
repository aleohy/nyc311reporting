"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { issueLabel } from "@/lib/verification";
import type { StoredReport } from "@/types/report";

export function VolunteerDashboard() {
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Alexa");
  const [authed, setAuthed] = useState(false);
  const [queue, setQueue] = useState<StoredReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [srNumbers, setSrNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadQueue = useCallback(async () => {
    const response = await fetch("/api/volunteer/queue");
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    if (!response.ok) {
      throw new Error("Unable to load volunteer queue.");
    }
    const payload = (await response.json()) as { queue: StoredReport[] };
    setQueue(payload.queue);
    setAuthed(true);
  }, []);

  useEffect(() => {
    void loadQueue().catch(() => setAuthed(false));
  }, [loadQueue]);

  async function login() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/volunteer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Login failed.");
      }
      await loadQueue();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function act(reportId: string, action: "claim" | "unclaim" | "mark_filed") {
    setError(null);
    try {
      const response = await fetch("/api/volunteer/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          action,
          volunteerName: name,
          serviceRequestNumber: srNumbers[reportId],
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Action failed.");
      }
      await loadQueue();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    }
  }

  async function copyPacket(summary: string) {
    await navigator.clipboard.writeText(summary);
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
        <h1 className="text-3xl font-bold">Volunteer login</h1>
        <p className="text-sm text-[var(--muted)]">
          Password-protected for now. Open signup comes later.
        </p>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void login()}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Volunteer desk
          </p>
          <h1 className="mt-2 text-3xl font-bold">Filing queue</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Coffee tips appear first. Claim a report, paste into 311, then mark filed.
          </p>
        </div>
        <div className="field min-w-48">
          <label htmlFor="volunteerName">Your name</label>
          <input id="volunteerName" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <a href="/api/export/reports" className="btn btn-secondary">
          Download CSV
        </a>
      </div>

      {error && <p className="text-sm font-medium text-[var(--error)]">{error}</p>}

      {queue.length === 0 ? (
        <div className="card p-6 text-[var(--muted)]">No reports waiting. Nice.</div>
      ) : (
        <div className="space-y-4">
          {queue.map((report) => (
            <article key={report.id} className="card overflow-hidden">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="relative min-h-40 bg-slate-100">
                  <Image
                    src={report.photoDataUrl}
                    alt="Report photo"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-info">{issueLabel(report)}</span>
                    <span
                      className={
                        report.filingPath === "coffee_tip" ? "badge badge-warning" : "badge badge-success"
                      }
                    >
                      {report.filingPath === "coffee_tip" ? "Coffee priority" : "Free"}
                    </span>
                    <span className="badge badge-info">{report.status}</span>
                  </div>
                  <p className="font-semibold">{report.address.label}</p>
                  <p className="text-sm text-[var(--muted)]">{report.description}</p>
                  {report.contactEmail && (
                    <p className="text-sm text-[var(--muted)]">Contact: {report.contactEmail}</p>
                  )}
                  <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                    {report.submitResult.summary}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void copyPacket(report.submitResult.summary)}
                    >
                      Copy packet
                    </button>
                    <a
                      href={report.submitResult.handoffUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                    >
                      Open 311
                    </a>
                    {report.status === "queued" && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void act(report.id, "claim")}
                      >
                        Claim
                      </button>
                    )}
                    {report.status === "claimed" && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void act(report.id, "unclaim")}
                      >
                        Unclaim
                      </button>
                    )}
                  </div>
                  {report.status === "claimed" && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        placeholder="311-XXXXXXXX"
                        value={srNumbers[report.id] || ""}
                        onChange={(event) =>
                          setSrNumbers((current) => ({
                            ...current,
                            [report.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-[14px] border border-black/10 px-4 py-3"
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void act(report.id, "mark_filed")}
                      >
                        Mark filed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
