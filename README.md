# JEE Main Question Generator

A React app that generates fresh JEE Main-style practice questions (MCQ + numerical) for a chosen subject, topic, and difficulty, using Google's Gemini API (free tier). The API key stays server-side in a Vercel serverless function (`/api/generate.js`) — it is never exposed to the browser.

## 1. Get a free Gemini API key

1. Go to **aistudio.google.com/apikey** (Google AI Studio).
2. Sign in with a Google account — no credit card required for the free tier.
3. Click **Create API key**, and copy it.

Free tier notes (subject to change by Google):
- Uses the `gemini-2.5-flash` model by default (good balance of quality and speed for this use case).
- Free tier limits are per-minute and per-day request caps (roughly 10 requests/minute, a few hundred/day depending on current Google policy) — plenty for personal use.
- Google may use free-tier prompts/responses to improve their products. If that matters to you, keep this in mind before deploying it publicly.

Keep the key secret. Never put it in frontend code or commit it to a public repo.

## 2. Run it locally

```bash
npm install
npm install -g vercel   # only needed once, lets you run the /api function locally too
```

Create a `.env` file in the project root (copy `.env.example`):

```
GEMINI_API_KEY=your-real-key
```

Then run:

```bash
vercel dev
```

This serves both the React frontend and the `/api/generate` function locally. Open the printed local URL in your browser.

(If you just want to see the UI without wiring the backend yet, `npm run dev` also works, but question generation will fail until the API route is available — use `vercel dev` for the full experience.)

## 3. Deploy to Vercel

**Option A — via the Vercel website (easiest):**
1. Push this project to a GitHub repo.
2. Go to vercel.com, click **Add New → Project**, and import that repo.
3. Vercel auto-detects the Vite framework and the `/api` folder — no extra config needed.
4. Before the first deploy, open **Project Settings → Environment Variables** and add:
   - Key: `GEMINI_API_KEY`
   - Value: your key from Step 1
5. Click **Deploy**.

**Option B — via the CLI:**
```bash
vercel login
vercel
# follow the prompts, then set the env var:
vercel env add GEMINI_API_KEY
vercel --prod
```

Once deployed, Vercel gives you a live URL (e.g. `https://your-app.vercel.app`) — that's your working site.

## Notes

- Model used: `gemini-2.5-flash`. You can swap this in `api/generate.js` for `gemini-2.5-flash-lite` (faster, higher free daily quota, slightly less capable) or `gemini-2.5-pro` (stronger reasoning, much lower free quota) — check current model names, quotas, and pricing at ai.google.dev before switching.
- The request asks Gemini to respond in native JSON mode (`responseMimeType: "application/json"`), so parsing is more reliable than free-text extraction.
- Question count is capped at 15 per request to stay within a reasonable response size.
- Math is written in plain text (`x^2`, `sqrt(2)`, `pi`) rather than rendered LaTeX. Let me know if you want KaTeX-rendered equations added later.
- If you outgrow the free tier or want a different quality/cost tradeoff later, swapping back to Anthropic's API (or adding it as a fallback) only requires changing `api/generate.js` — the frontend calls `/api/generate` either way.
