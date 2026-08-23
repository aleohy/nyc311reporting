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
    const payload: OverviewPayload = await response.json();
