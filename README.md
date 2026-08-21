# NYC Street Report

Mobile-first web app that turns a street photo into a ready-to-file NYC 311 report.

## Flow

1. Capture a photo and GPS location
2. AI classifies the street issue and drafts the report
3. User edits the draft and passes trust checks
4. Choose how to file:
   - **Free volunteer queue** (capped capacity + wait estimate)
   - **Buy a coffee** ($5 priority queue for volunteers)
   - **File it yourself** (AI packet + NYC311 link)
5. Volunteers claim/file from `/volunteer` until the NYC partner API is approved

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Volunteer desk: [http://localhost:3000/volunteer](http://localhost:3000/volunteer)

## Environment variables

- `OPENAI_API_KEY` — photo classification via OpenAI Vision (recommended)
- `CURSOR_API_KEY` — fallback photo classification if OpenAI is not configured
- `VOLUNTEER_PASSWORD` — unlocks `/volunteer`
- `COFFEE_TIPS_MOCK=true` — treat coffee tips as paid in demo mode
- `NYC_311_API_KEY` — optional status lookup
- `NYC_311_PARTNER_API_KEY` / `NYC_311_PARTNER_SUBMIT_URL` — live filing once approved

## Free queue protection

Unlimited free filing would overwhelm volunteers. The free option:

- Caps at **12** pending free reports (`FREE_QUEUE_CAP`)
- Shows estimated wait time
- Disables itself when full and nudges users to coffee priority or self-file
- Requires email so users can get the 311 number later

Coffee-tip reports always sort above free reports in the volunteer queue.

## v1 scope

Street conditions and pavement parking: pothole / cave-in, street flooding, broken sidewalk, street repair, catch basin, illegal parking on pavement.

## Notes

- Public NYC 311 API is read-only until partner access is approved.
- Reports are stored in `data/reports.json`.
- Open volunteer signup can come later; password auth is enough for a small invited team now.
