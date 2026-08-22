"use client";

import { useCallback, useEffect, useState } from "react";

import type { FeedbackCategory, FeedbackEntry } from "@/types/report";

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  wrong_category: "Wrong category",
  missing_field: "Missing field",
  bug: "Bug",
  idea: "Idea",
  other: "Other",
};

interface PeriodCounts {
  pageViews: number;
  photosUploaded: number;
  categoriesChosen: number;
  nyc311Opened: number;
  feedbackReceived: number;
}

interface OverviewPayload {
  usage: {
    last7Days: PeriodCounts;
    last30Days: PeriodCounts;
    allTime: PeriodCounts;
    topCategories: { label: string; count: number }[];
    topPages: { path: string; count: number }[];
    totalEvents: number;
  };
  feedback: FeedbackEntry[];
  notify: { email: boolean; webhook: boolean };
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [period, setPeriod] = useState<"last7Days" | "last30Days" | "allTime">("last7Days");

  const loadOverview = useCallback(async () => {
    const response = await fetch("/api/admin/overview");
    if (response.status === 401) {
      setAuthed(false);
      setData(null);
      return;
    }
    if (!response.ok) {
      throw new Error("Unable to load admin data.");
    }
    const payload = (await response.json()) as OverviewPayload;
    setData(payload);
    setAuthed(true);
  }, []);

  useEffect(() => {
    void loadOverview().catch(() => setAuthed(false));
  }, [loadOverview]);

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
      await loadOverview();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/volunteer/login", { method: "DELETE" });
    setAuthed(false);
    setData(null);
  }

  if (!authed) {
    return (
      <div className="page-shell max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Private
        </p>
        <h1 className="mt-3 text-4xl">Admin</h1>
        <p className="mt-2 text-[var(--muted)]">
          Feedback inbox and site usage. Use the same password as{" "}
          <code>VOLUNTEER_PASSWORD</code> in Railway.
        </p>
        <div className="field mt-6">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void login();
            }}
          />
        </div>
        {error && (
          <p className="mt-3 text-sm font-medium text-[var(--error)]" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-primary mt-4" disabled={loading} onClick={() => void login()}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    );
  }

  const counts = data?.usage[period] || {
    pageViews: 0,
    photosUploaded: 0,
    categoriesChosen: 0,
    nyc311Opened: 0,
    feedbackReceived: 0,
  };

  return (
    <div className="page-shell max-w-4xl flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Private
          </p>
          <h1 className="mt-2 text-4xl">Admin</h1>
          <p className="mt-2 max-w-xl text-[var(--muted)]">
            Page views and photo counts start from this deploy. Feedback appears here as soon as
            someone sends it.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void logout()}>
          Sign out
        </button>
      </div>

      {data && !data.notify.email && !data.notify.webhook && (
        <p className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--muted)]">
          Feedback is stored here. To also get an email, add <code>ADMIN_EMAIL</code> and{" "}
          <code>RESEND_API_KEY</code> in Railway. For Slack or Discord, add{" "}
          <code>ADMIN_NOTIFY_WEBHOOK</code>.
        </p>
      )}

      {data && (data.notify.email || data.notify.webhook) && (
        <p className="text-sm text-[var(--muted)]">
          Alerts on: {data.notify.email ? "email" : ""}
          {data.notify.email && data.notify.webhook ? " and " : ""}
          {data.notify.webhook ? "webhook" : ""}.
        </p>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Usage</h2>
          <label className="text-sm text-[var(--muted)]">
            Period{" "}
            <select
              className="ml-2 rounded-lg border border-[var(--line)] bg-white px-2 py-1"
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as "last7Days" | "last30Days" | "allTime")
              }
            >
              <option value="last7Days">Last 7 days</option>
              <option value="last30Days">Last 30 days</option>
              <option value="allTime">All time</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Page views" value={counts.pageViews} />
          <StatCard label="Photos uploaded" value={counts.photosUploaded} />
          <StatCard label="Categories chosen" value={counts.categoriesChosen} />
          <StatCard label="311 links opened" value={counts.nyc311Opened} />
          <StatCard label="Feedback" value={counts.feedbackReceived} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-semibold">Top categories chosen</h3>
            {data?.usage.topCategories.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {data.usage.topCategories.map((item) => (
                  <li key={item.label} className="flex justify-between gap-3">
                    <span>{item.label}</span>
                    <span className="tabular-nums text-[var(--muted)]">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No categories chosen yet.</p>
            )}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">Most visited pages</h3>
            {data?.usage.topPages.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {data.usage.topPages.map((item) => (
                  <li key={item.path} className="flex justify-between gap-3">
                    <span className="truncate">{item.path}</span>
                    <span className="tabular-nums text-[var(--muted)]">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No page views yet.</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl">Feedback inbox</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Newest first. Email is only shown if the person left one.
        </p>
        <div className="mt-4 space-y-3">
          {data?.feedback.length ? (
            data.feedback.map((entry) => (
              <article key={entry.id} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{CATEGORY_LABELS[entry.category]}</p>
                  <p className="text-xs text-[var(--muted)]">{formatWhen(entry.createdAt)}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[var(--muted)]">{entry.message}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {entry.email ? (
                    <>
                      Reply:{" "}
                      <a className="underline" href={`mailto:${entry.email}`}>
                        {entry.email}
                      </a>
                    </>
                  ) : (
                    "Anonymous"
                  )}
                  {entry.pagePath ? ` · ${entry.pagePath}` : ""}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
              No feedback yet. Ask someone to send a test note from the Feedback tab.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
