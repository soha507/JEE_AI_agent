const SUBJECT_TOPICS = {
  Physics: true,
  Chemistry: true,
  Mathematics: true,
};

function buildPrompt(subject, topic, difficulty, count) {
  return `You are an expert JEE Main question setter with full knowledge of previous years' JEE Main papers (Physics, Chemistry, Mathematics, 2019-2025).

Generate ${count} original practice questions for:
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty === "Mixed" ? "a mix of easy, medium and hard" : difficulty}

Rules:
- Style, phrasing and difficulty must closely match real JEE Main previous year questions on this exact topic (do not copy any real question verbatim, write fresh ones inspired by the same patterns).
- Use a mix of question types: some "mcq" (single correct, 4 options) and some "numerical" (value-type answer, no options), roughly balanced.
- Use plain-text math notation only: x^2, sqrt(2), pi, Delta, ->, degree symbol, subscripts like v_0. No LaTeX commands, no markdown.
- Each explanation must be short: 1-3 sentences, just the key steps/formula used, no filler.
- For "numerical" questions give correctValue as a plain number (string), rounded sensibly (e.g. "2.5", "12", "-3.14").
- For "mcq" questions give exactly 4 options and correctIndex (0-based).
- difficultyTag must be one of "Easy", "Medium", "Hard".

Respond with ONLY a raw JSON array, no markdown fences, no commentary, matching exactly this shape:
[
  {
    "id": "q1",
    "type": "mcq",
    "difficultyTag": "Medium",
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 2,
    "explanation": "..."
  },
  {
    "id": "q2",
    "type": "numerical",
    "difficultyTag": "Hard",
    "question": "...",
    "correctValue": "4.5",
    "explanation": "..."
  }
]`;
}

function cleanJson(text) {
  let t = text.trim();
  t = t.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  return t;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Set it in your Vercel project's Environment Variables." });
    return;
  }

  const { subject, topic, difficulty, count } = req.body || {};

  if (!subject || !topic || !difficulty) {
    res.status(400).json({ error: "Missing subject, topic, or difficulty." });
    return;
  }

  const safeCount = Math.min(Math.max(Math.round(Number(count) || 1), 1), 15);
  const prompt = buildPrompt(subject, topic, difficulty, safeCount);

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      res.status(response.status).json({ error: `Gemini API error (${response.status}): ${errText.slice(0, 300)}` });
      return;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

    if (!text) {
      res.status(502).json({ error: "Model returned no text content.", raw: JSON.stringify(data).slice(0, 300) });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanJson(text));
    } catch (parseErr) {
      res.status(502).json({ error: "Could not parse model output as JSON.", raw: text.slice(0, 500) });
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      res.status(502).json({ error: "Model returned an empty question set." });
      return;
    }

    res.status(200).json({ questions: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error." });
  }
}
