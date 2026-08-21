"use client";

import { useState } from "react";

export default function StatusPage() {
  const [srNumber, setSrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/status?srNumber=${encodeURIComponent(srNumber)}`);
      const payload = (await response.json()) as {
        error?: string;
        result?: Record<string, unknown>;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to look up service request.");
      }

      setResult(payload.result ?? null);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Unable to look up service request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        Track 311
      </p>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Check a service request</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        Enter a number like <code>311-12345678</code>. Live lookup needs a NYC 311 API key on the
        server.
      </p>

      <section className="card mt-8 p-5">
        <div className="field">
          <label htmlFor="srNumber">Service request number</label>
          <input
            id="srNumber"
            name="srNumber"
            autoComplete="off"
            spellCheck={false}
            value={srNumber}
            onChange={(event) => setSrNumber(event.target.value)}
            placeholder="311-12345678"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary mt-4"
          disabled={!srNumber || loading}
          onClick={() => void handleLookup()}
        >
          {loading ? "Looking up…" : "Look Up Status"}
        </button>
      </section>

      {error && (
        <p className="mt-4 text-sm font-medium text-[var(--error)]" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section className="card mt-4 p-5">
          <h2 className="text-2xl">Result</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-[var(--ink)] p-4 text-sm leading-6 text-[var(--background)]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
