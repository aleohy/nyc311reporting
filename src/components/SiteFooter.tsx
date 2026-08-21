import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold">NYC Street Report</p>
          <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
            A helper for filing illegal parking complaints on the official NYC311 form. Not affiliated
            with the City of New York.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <Link href="/" className="hover:underline">
            Submit a Request
          </Link>
          <Link href="/how-it-works" className="hover:underline">
            How It Works
          </Link>
          <Link href="/about" className="hover:underline">
            About Us
          </Link>
          <Link href="/status" className="hover:underline">
            Track 311
          </Link>
          <Link href="/feedback" className="hover:underline">
            Feedback
          </Link>
        </nav>
      </div>
    </footer>
  );
}
