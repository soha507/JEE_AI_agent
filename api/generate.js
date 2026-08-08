function buildSubjectPrompt(subjectName, topics, difficulty, count) {
  return `You are an expert JEE Main question setter with full knowledge of previous years' JEE Main papers (Physics, Chemistry, Mathematics, 2019-2025).

Generate ${count} original JEE Main practice questions for:
Subject: ${subjectName}
Topics to draw from (spread across these, don't repeat one topic every time): ${topics.join(", ")}
Difficulty: ${difficulty === "Mixed" ? "a mix of easy, medium and hard" : difficulty}

Rules:
- Style, phrasing and difficulty must closely match real JEE Main previous year questions on these topics (do not copy any real question verbatim, write fresh ones inspired by the same patterns).
- Use a mix of question types: some "mcq" (single correct, 4 options) and some "numerical" (value-type answer, no options), roughly balanced.
- Use plain-text math notation only: x^2, sqrt(2), pi, Delta, ->, degree symbol, subscripts like v_0. No LaTeX commands, no markdown.
- Each explanation must be short: 1-3 sentences, just the key steps/formula used, no filler.
- For "numerical" questions give correctValue as a plain number (string), rounded sensibly (e.g. "2.5", "12", "-3.14").
- For "mcq" questions give exactly 4 options and correctIndex (0-based).
- difficultyTag must be one of "Easy", "Medium", "Hard".
- "id" must be unique within this array (e.g. "q1", "q2", ...).
- Every question object must include "subject": "${subjectName}".

Respond with ONLY a raw JSON array of exactly ${count} questions, no markdown fences, no commentary, matching exactly this shape:
[
  {
    "id": "q1",
    "subject": "${subjectName}",
    "type": "mcq",
    "difficultyTag": "Medium",
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 2,
    "explanation": "..."
  },
  {
    "id": "q2",
    "subject": "${subjectName}",
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

async function generateForSubject(subjectName, topics, difficulty, count, apiKey) {
  const prompt = buildSubjectPrompt(subjectName, topics, difficulty, count);

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
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
    throw new Error(`${subjectName}: Gemini API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

  if (!text) {
    throw new Error(`${subjectName}: model returned no text content.`);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanJson(text));
  } catch (parseErr) {
    throw new Error(`${subjectName}: could not parse model output as JSON.`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${subjectName}: model returned an empty question set.`);
  }

  // tag ids uniquely per subject so they never collide once merged
  return parsed.map((q, i) => ({ ...q, subject: subjectName, id: `${subjectName}_${i}` }));
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

  // Each subject gets its own dedicated Gemini call, so this can go as high as
  // real JEE Main sections do (25 per subject) without truncation risk.
  const safeCount = Math.min(Math.max(Math.round(Number(questionsPerSubject) || 1), 1), 25);

  try {
    const results = await Promise.allSettled(
      subjects.map((s) =>
        generateForSubject(s.name, s.topics, difficulty, safeCount, process.env.GEMINI_API_KEY)
      )
    );

    const questions = [];
    const errors = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        questions.push(...r.value);
      } else {
        errors.push(r.reason?.message || `${subjects[i].name}: unknown error`);
      }
    });

    if (questions.length === 0) {
      res.status(502).json({ error: errors.join(" | ") || "All subjects failed to generate." });
      return;
    }

    res.status(200).json({
      questions,
      questionsPerSubject: safeCount,
      partialErrors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error." });
  }
}
