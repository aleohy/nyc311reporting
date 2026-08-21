import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="page-shell max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        About us
      </p>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Why we built this</h1>

      <article className="mt-8 space-y-8 text-[var(--muted)] leading-7">
        <section className="space-y-4">
          <h2 className="text-2xl text-[var(--foreground)]">Why this exists</h2>
          <p>
            We built this after watching a driver consistently park illegally on a sidewalk in our
            neighborhood, creating a real hazard for pedestrians every single day. Complaints to the
            driver&apos;s employer went nowhere. Then we watched a near-miss happen at that exact
            same spot, and that&apos;s when we decided something had to be done.
          </p>
          <p>
            Our thinking is simple: if multiple residents who witness the same repeated behavior
            report it consistently, it&apos;s more likely to get attention sooner before someone
            actually gets hurt.
          </p>
          <p>
            We talked to a number of people about it, including neighbors who&apos;ve lived in NYC
            for years and still didn&apos;t know 311 existed. And even among those who did, most
            rarely used it. Once we went through the process of filing a complaint ourselves, we
            understood why: there are dozens of complaint categories, it&apos;s time-consuming to
            figure out which one applies to your situation, and having to write a description from
            scratch is enough friction to make most people give up before they finish.
          </p>
          <p>
            This tool exists to close that gap. It helps you quickly identify the right complaint
            category and drafts the description for you so a confusing form isn&apos;t the reason a
            real safety issue goes unreported.
          </p>
          <p>
            Illegal parking, unfixed potholes, and other everyday hazards have hurt people in this
            city. Filing a 311 report is one of the simplest things you can do to help fix that: for
            yourself, your neighbors, and the people you care about.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-[var(--foreground)]">A note on how this is built</h2>
          <p>
            This tool was built by a small group of residents with no formal technical background,
            and it&apos;s entirely volunteer-run. That means we&apos;re genuinely open to feedback
            — if something&apos;s confusing, broken, or missing, please tell us in the{" "}
            <Link href="/feedback" className="font-semibold text-[var(--ink)] underline">
              Feedback
            </Link>{" "}
            tab.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-[var(--foreground)]">What we&apos;re working on next</h2>
          <ol className="list-decimal space-y-4 pl-5">
            <li>
              <p className="font-semibold text-[var(--foreground)]">Direct submission to 311.</p>
              <p className="mt-2">
                We&apos;ve applied for NYC developer access that would let this tool submit requests
                straight to 311. This feature depends on that approval coming through.
              </p>
            </li>
            <li>
              <p className="font-semibold text-[var(--foreground)]">More complaint categories</p>
              <p className="mt-2">
                We&apos;d like to expand beyond illegal parking to cover other everyday issues. Your
                feedback helps us figure out what to prioritize.
              </p>
            </li>
          </ol>
        </section>
      </article>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">
          Submit a Request
        </Link>
        <Link href="/feedback" className="btn btn-secondary">
          Send Feedback
        </Link>
      </div>
    </div>
  );
}
