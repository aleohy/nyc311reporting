"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Submit a Request",
    match: (path: string) =>
      path === "/" || path.startsWith("/category") || path.startsWith("/handoff"),
  },
  {
    href: "/how-it-works",
    label: "How It Works",
    match: (path: string) => path.startsWith("/how-it-works"),
  },
  { href: "/about", label: "About Us", match: (path: string) => path.startsWith("/about") },
  { href: "/status", label: "Track 311", match: (path: string) => path.startsWith("/status") },
  { href: "/feedback", label: "Feedback", match: (path: string) => path.startsWith("/feedback") },
];

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path
        fill="#55841b"
        d="M11 1.2 13.4 8.6 21 11 13.4 13.4 11 20.8 8.6 13.4 1 11 8.6 8.6z"
      />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname() || "/";

  return (
    <header className="site-header">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Mark />
          <span>NYC Street Report</span>
        </Link>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "font-semibold text-[var(--ink)] underline decoration-[var(--accent)] decoration-2 underline-offset-4"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
