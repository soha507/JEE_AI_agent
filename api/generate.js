function buildExamPrompt(subjects, difficulty, perSubject) {
  const sectionsText = subjects
    .map((s) => `- ${s.name}: use ONLY these topics — ${s.topics.join(", ")}`)
    .join("\n");

  return `You are an expert JEE Main question setter with full knowledge of previous years' JEE Main papers (Physics, Chemistry, Mathematics, 2019-2025).

Generate a JEE Main-style mock exam made up of these sections:
${sectionsText}

Difficulty: ${difficulty === "Mixed" ? "a mix of easy, medium and hard" : difficulty}

Rules:
- For EACH section listed above, generate exactly ${perSubject} original practice questions, drawn only from that section's listed topics, spread across those topics rather than repeating one topic every time.
- Every question object must include a "subject" field set to exactly one of the section names above.
- Style, phrasing and difficulty must closely match real JEE Main previous year questions on these topics (do not copy any real question verbatim, write fresh ones inspired by the same patterns).
- Within each section, use a mix of question types: some "mcq" (single correct, 4 options) and some "numerical" (value-type answer, no options), roughly balanced.
- Use plain-text math notation only: x^2, sqrt(2), pi, Delta, ->, degree symbol, subscripts like v_0. No LaTeX commands, no markdown.
- Each explanation must be short: 1-3 sentences, just the key steps/formula used, no filler.
- For "numerical" questions give correctValue as a plain number (string), rounded sensibly (e.g. "2.5", "12", "-3.14").
- For "mcq" questions give exactly 4 options and correctIndex (0-based).
- difficultyTag must be one of "Easy", "Medium", "Hard".
- "id" must be unique across the ENTIRE array (e.g. "phy_1", "phy_2", "chem_1", "math_1").

Respond with ONLY a single raw JSON array containing every question from every section (do not group into nested objects), no markdown fences, no commentary, matching exactly this shape:
[
  {
    "id": "phy_1",
    "subject": "Physics",
    "type": "mcq",
    "difficultyTag": "Medium",
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 2,
    "explanation": "..."
  },
  {
    "id": "chem_1",
    "subject": "Chemistry",
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

  const { subjects, difficulty, questionsPerSubject } = req.body || {};

  if (!Array.isArray(subjects) || subjects.length === 0) {
    res.status(400).json({ error: "Select at least one subject." });
    return;
  }
  for (const s of subjects) {
    if (!s || !s.name || !Array.isArray(s.topics) || s.topics.length === 0) {
      res.status(400).json({ error: `Subject "${s && s.name}" needs at least one topic selected.` });
      return;
    }
  }
  if (!difficulty) {
    res.status(400).json({ error: "Missing difficulty." });
    return;
  }

  let safePerSubject = Math.min(Math.max(Math.round(Number(questionsPerSubject) || 1), 1), 10);
  // keep the overall exam within a safe response-size budget
  const MAX_TOTAL = 30;
  if (subjects.length * safePerSubject > MAX_TOTAL) {
    safePerSubject = Math.max(1, Math.floor(MAX_TOTAL / subjects.length));
  }

  const prompt = buildExamPrompt(subjects, difficulty, safePerSubject);

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
            maxOutputTokens: 16384,
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

    res.status(200).json({ questions: parsed, questionsPerSubject: safePerSubject });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error." });
  }
}
