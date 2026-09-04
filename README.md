NYC Street Report

A volunteer-built helper for New Yorkers filing illegal parking complaints on the official NYC311 form.

Photograph the vehicle, confirm the city’s complaint category, then copy a prepared description into NYC311.

Not affiliated with the City of New York.

Use the product: https://nyc311reporting.vercel.app/

Direct submission

This tool does not submit the complaint to 311 for you. There is no public city API that lets a website file a 311 request on someone’s behalf.

We have requested NYC’s partner / write API. If the city approves it, we can add one-tap filing. Until then, you copy the prepared packet into the official NYC311 form and submit there.

What it does





Upload a photo of the parked vehicle (plate, sign or curb marking, and enough context to show the violation).



Pick the 311 category the app suggests (hydrant, sidewalk, bike lane, and so on).



Copy the packet into the official NYC311 form and submit there.

There is also Track 311 (lookup an existing request) and a Feedback form.

Illegal parking only, for now. The tool is in beta.

Why it exists

NYC311 has dozens of parking categories. Neighbors who want to report a real hazard often give up before they finish the form. This app is meant to cut that friction so safety issues get reported.

Run it locally

You need Node.js 20+.

npm install
cp .env.example .env.local
npm run dev

Open http://localhost:3000.

On your machine, drafts and feedback are saved as JSON files under data/ (that folder is gitignored). On Vercel, set the Upstash Redis variables from .env.example so data is not written to a disposable disk.

Environment variables

Copy .env.example and fill in what you use. The important ones:







Variable



Purpose





GEMINI_API_KEY



Photo → category suggestions (Google AI Studio)





OPENAI_API_KEY



Optional vision fallback





CURSOR_API_KEY



Optional vision fallback





NYC_311_API_KEY



Optional status lookup on Track 311





VOLUNTEER_PASSWORD



Private operator login (not a public page)





ADMIN_EMAIL / RESEND_API_KEY



Optional email when someone sends Feedback





KV_REST_API_URL / KV_REST_API_TOKEN



Redis on Vercel (leave empty locally)

Do not commit .env.local or API keys.

Stack





Next.js (App Router) and TypeScript



NYC Open Data for nearby 311 requests



Gemini (or optional OpenAI / Cursor) for photo classification



Contributing

This is volunteer-run. If something is confusing, broken, or missing, use the Feedback tab on the live site, or open a GitHub issue.

Please do not open pull requests that add live filing to 311 until that city API is approved.

License

No license file yet. Ask before you reuse this commercially.
