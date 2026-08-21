import Link from "next/link";

const STEPS = [
  {
    title: "Photograph the vehicle",
    body: "Take a clear photo from a safe distance. Make sure the license plate, the relevant curb marking or sign, and enough of the surroundings are visible so it's obvious what the violation is (e.g. blocking a sidewalk, hydrant, bike lane, or crosswalk).",
  },
  {
    title: "Confirm the 311 category",
    body: "The app suggests official NYC311 illegal parking types. Pick the one that matches what you saw — hydrant, sidewalk, bike lane, and so on.",
  },
  {
    title: "Copy into the official form",
    body: "We open the matching NYC311 form and give you a packet to paste. You submit on the city’s site. We cannot file on your behalf yet.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="page-shell">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        How it works
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
        Three steps between you and a filed 311 complaint.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
        Currently built for illegal parking only. The city still owns the ticket. This tool is in
        beta, and it&apos;s here to help you (1) identify the right complaint category and (2) get
        your description ready, saving you time.
      </p>

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="card p-6">
            <p className="text-sm font-semibold text-[var(--accent)]">{index + 1}</p>
            <h2 className="mt-3 text-2xl">{step.title}</h2>
            <p className="mt-3 text-[var(--muted)]">
              {step.body}
              {index === 2 && (
                <>
                  {" "}
                  <Link href="/about" className="font-semibold text-[var(--ink)] underline">
                    Click here
                  </Link>{" "}
                  to find out more about why.
                </>
              )}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <Link href="/" className="btn btn-primary">
          Submit a Request
        </Link>
      </div>
    </div>
  );
}
