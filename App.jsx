import React, { useState, useRef } from "react";

const SUBJECT_TOPICS = {
  Physics: [
    "Units and Measurements",
    "Kinematics",
    "Laws of Motion",
    "Work, Energy and Power",
    "Rotational Motion",
    "Gravitation",
    "Properties of Solids and Liquids",
    "Thermodynamics",
    "Kinetic Theory of Gases",
    "Oscillations and Waves",
    "Electrostatics",
    "Current Electricity",
    "Magnetic Effects of Current and Magnetism",
    "Electromagnetic Induction and Alternating Currents",
    "Electromagnetic Waves",
    "Ray and Wave Optics",
    "Dual Nature of Matter and Radiation",
    "Atoms and Nuclei",
    "Electronic Devices",
    "Communication Systems",
  ],
  Chemistry: [
    "Some Basic Concepts in Chemistry (Mole Concept)",
    "Atomic Structure",
    "Chemical Bonding and Molecular Structure",
    "Chemical Thermodynamics",
    "Solutions",
    "Equilibrium",
    "Redox Reactions and Electrochemistry",
    "Chemical Kinetics",
    "Surface Chemistry",
    "Classification of Elements and Periodicity",
    "General Principles of Metallurgy",
    "Hydrogen",
    "s-Block Elements (Alkali and Alkaline Earth Metals)",
    "p-Block Elements",
    "d- and f-Block Elements",
    "Coordination Compounds",
    "Environmental Chemistry",
    "Purification and Characterisation of Organic Compounds",
    "Basic Principles of Organic Chemistry",
    "Hydrocarbons",
    "Organic Compounds Containing Halogens",
    "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids",
    "Organic Compounds Containing Nitrogen",
    "Biomolecules",
  ],
  Mathematics: [
    "Sets, Relations and Functions",
    "Complex Numbers and Quadratic Equations",
    "Matrices and Determinants",
    "Permutations and Combinations",
    "Binomial Theorem",
    "Sequence and Series",
    "Limit, Continuity and Differentiability",
    "Integral Calculus",
    "Differential Equations",
    "Straight Lines and Circles",
    "Conic Sections",
    "Three Dimensional Geometry",
    "Vector Algebra",
    "Statistics and Probability",
    "Trigonometry",
    "Mathematical Reasoning",
  ],
};

const SUBJECTS = Object.keys(SUBJECT_TOPICS);
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"];

export default function App() {
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState(SUBJECT_TOPICS["Physics"][0]);
  const [difficulty, setDifficulty] = useState("Mixed");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState({});
  const [numericInput, setNumericInput] = useState({});
  const [revealed, setRevealed] = useState({});
  const resultsRef = useRef(null);

  function handleSubjectChange(newSubject) {
    setSubject(newSubject);
    setTopic(SUBJECT_TOPICS[newSubject][0]);
  }

  async function handleGenerate() {
    if (!count || count < 1) {
      setError("Enter a valid number of questions (1 or more).");
      return;
    }
    setLoading(true);
    setError(null);
    setQuestions([]);
    setSelected({});
    setNumericInput({});
    setRevealed({});

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, difficulty, count }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No questions returned.");
      }

      setQuestions(data.questions);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      let msg = "Unknown error.";
      try {
        msg = e && e.message ? e.message : String(e);
      } catch (_) {
        msg = String(e);
      }
      console.error("JEE generator error:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function selectMcq(qid, idx) {
    if (revealed[qid]) return;
    setSelected((s) => ({ ...s, [qid]: idx }));
  }

  function reveal(qid) {
    setRevealed((r) => ({ ...r, [qid]: true }));
  }

  return (
    <div className="jee-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        * { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; }

        .jee-root {
          --paper: #edf1f7;
          --paper-line: #d3dce8;
          --card: #ffffff;
          --ink: #1d2a44;
          --ink-soft: #56637e;
          --ink-faint: #8794ab;
          --red-pen: #b5282e;
          --red-pen-bg: #fbeceb;
          --green-ok: #2f8f5b;
          --green-ok-bg: #eaf6ef;
          --amber: #c8811a;
          --amber-bg: #fbf1de;
          --shadow: rgba(29, 42, 68, 0.10);
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--ink);
          background:
            repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent 31px,
              var(--paper-line) 31px,
              var(--paper-line) 32px
            ),
            var(--paper);
          min-height: 100vh;
          padding: 28px 20px 64px;
          position: relative;
        }
        .jee-root::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 46px;
          width: 2px;
          background: rgba(181, 40, 46, 0.28);
          pointer-events: none;
        }
        .jee-shell {
          max-width: 780px;
          margin: 0 auto;
          position: relative;
        }

        .jee-eyebrow {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: var(--ink-faint);
          text-transform: uppercase;
          margin-bottom: 6px;
          padding-left: 4px;
        }
        .jee-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 30px;
          letter-spacing: -0.01em;
          margin: 0 0 22px 4px;
          color: var(--ink);
        }
        .jee-title span { color: var(--red-pen); }

        .jee-form {
          background: var(--card);
          border-radius: 10px;
          padding: 22px 22px 20px;
          box-shadow: 0 1px 2px var(--shadow), 0 8px 24px -12px var(--shadow);
          border: 1px solid rgba(29,42,68,0.06);
          margin-bottom: 30px;
        }
        .jee-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }
        .jee-field label {
          display: block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }
        .jee-field select,
        .jee-field input[type="number"] {
          width: 100%;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14.5px;
          color: var(--ink);
          background: var(--paper);
          border: 1px solid var(--paper-line);
          border-radius: 6px;
          padding: 9px 11px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .jee-field select:focus,
        .jee-field input[type="number"]:focus { border-color: var(--ink-soft); }
        .jee-field-full { grid-column: 1 / -1; }

        .jee-generate-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 18px;
        }
        .jee-error {
          font-size: 12.5px;
          color: var(--red-pen);
          font-weight: 500;
          line-height: 1.5;
          word-break: break-word;
          background: var(--red-pen-bg);
          border-radius: 6px;
          padding: 8px 10px;
          margin-top: 12px;
        }
        .jee-generate-btn {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          color: #fff;
          background: var(--ink);
          border: none;
          border-radius: 7px;
          padding: 11px 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .jee-generate-btn:hover:not(:disabled) { background: #14203a; }
        .jee-generate-btn:active:not(:disabled) { transform: scale(0.98); }
        .jee-generate-btn:disabled { opacity: 0.55; cursor: default; }

        .jee-results { display: flex; flex-direction: column; gap: 18px; }

        .jee-card {
          background: var(--card);
          border-radius: 10px;
          padding: 20px 22px 18px;
          box-shadow: 0 1px 2px var(--shadow), 0 8px 24px -14px var(--shadow);
          border: 1px solid rgba(29,42,68,0.06);
        }
        .jee-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .jee-qnum { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; }
        .jee-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 20px;
          font-weight: 600;
        }
        .jee-tag-easy { background: var(--green-ok-bg); color: var(--green-ok); }
        .jee-tag-medium { background: var(--amber-bg); color: var(--amber); }
        .jee-tag-hard { background: var(--red-pen-bg); color: var(--red-pen); }
        .jee-marks { margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-faint); }

        .jee-question-text { font-size: 15.5px; line-height: 1.6; margin: 4px 0 16px; }

        .jee-options { display: flex; flex-direction: column; gap: 9px; margin-bottom: 8px; }
        .jee-option { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 6px 4px; border-radius: 6px; }
        .jee-option:hover .jee-bubble:not(.filled) { border-color: var(--ink-soft); }
        .jee-bubble {
          flex: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1.6px solid var(--ink-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          transition: all 0.12s ease;
        }
        .jee-bubble.filled { background: var(--ink); border-color: var(--ink); color: #fff; }
        .jee-bubble.correct { background: var(--green-ok); border-color: var(--green-ok); color: #fff; }
        .jee-bubble.wrong { background: var(--red-pen); border-color: var(--red-pen); color: #fff; }
        .jee-option-text { font-size: 14.5px; }

        .jee-numeric-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .jee-numeric-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); }
        .jee-numeric-input {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          background: var(--paper);
          border: 1.6px solid var(--paper-line);
          border-radius: 6px;
          padding: 8px 12px;
          width: 120px;
          outline: none;
        }
        .jee-numeric-input:focus { border-color: var(--ink-soft); }
        .jee-numeric-input.correct { border-color: var(--green-ok); background: var(--green-ok-bg); color: var(--green-ok); }
        .jee-numeric-input.wrong { border-color: var(--red-pen); background: var(--red-pen-bg); color: var(--red-pen); }

        .jee-reveal-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--ink-soft);
          background: transparent;
          border: 1px solid var(--paper-line);
          border-radius: 20px;
          padding: 7px 14px;
          cursor: pointer;
          margin-top: 6px;
        }
        .jee-reveal-btn:hover { border-color: var(--ink-soft); color: var(--ink); }

        .jee-answer-panel {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 8px;
          background: var(--red-pen-bg);
          border-left: 3px solid var(--red-pen);
        }
        .jee-answer-line { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--red-pen); margin-bottom: 4px; }
        .jee-explanation { font-size: 13.5px; line-height: 1.55; color: #7a2b2b; }

        .jee-loading { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--ink-soft); text-align: center; padding: 30px 0; }
        .jee-empty { font-size: 13.5px; color: var(--ink-faint); text-align: center; padding: 20px 0 0; }

        @media (max-width: 560px) {
          .jee-row { grid-template-columns: 1fr; }
          .jee-title { font-size: 24px; }
          .jee-root::before { left: 26px; }
        }
      `}</style>

      <div className="jee-shell">
        <div className="jee-eyebrow">
          <span>JEE Main · Practice Paper Generator</span>
          <span>Session 2026</span>
        </div>
        <h1 className="jee-title">Set your <span>own</span> paper</h1>

        <div className="jee-form">
          <div className="jee-row">
            <div className="jee-field">
              <label>Subject</label>
              <select value={subject} onChange={(e) => handleSubjectChange(e.target.value)}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="jee-field">
              <label>Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="jee-row">
            <div className="jee-field jee-field-full">
              <label>Topic</label>
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                {SUBJECT_TOPICS[subject].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="jee-row">
            <div className="jee-field">
              <label>Number of questions</label>
              <input
                type="number"
                min={1}
                max={15}
                value={count}
                onChange={(e) => setCount(e.target.value === "" ? "" : Number(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              />
            </div>
          </div>

          <div className="jee-generate-row">
            <button className="jee-generate-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? "Setting paper…" : "Generate Paper →"}
            </button>
          </div>
          {error && <div className="jee-error">{error}</div>}
        </div>

        <div ref={resultsRef} className="jee-results">
          {loading && <div className="jee-loading">Drawing up questions from past JEE Main patterns…</div>}

          {!loading && questions.length === 0 && (
            <div className="jee-empty">Choose a subject and topic, then generate your first paper.</div>
          )}

          {!loading && questions.map((q, i) => {
            const tagClass =
              q.difficultyTag === "Easy" ? "jee-tag-easy" :
              q.difficultyTag === "Hard" ? "jee-tag-hard" : "jee-tag-medium";
            const isRevealed = !!revealed[q.id];
            const userChoice = selected[q.id];
            const userNumeric = numericInput[q.id] ?? "";

            return (
              <div className="jee-card" key={q.id}>
                <div className="jee-card-head">
                  <span className="jee-qnum">Q{i + 1}</span>
                  <span className={`jee-tag ${tagClass}`}>{q.difficultyTag || "Medium"}</span>
                  <span className="jee-marks">+4 / −1</span>
                </div>
                <p className="jee-question-text">{q.question}</p>

                {q.type === "mcq" && Array.isArray(q.options) && (
                  <div className="jee-options">
                    {q.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      let bubbleClass = "jee-bubble";
                      if (isRevealed) {
                        if (idx === q.correctIndex) bubbleClass += " correct";
                        else if (idx === userChoice) bubbleClass += " wrong";
                      } else if (idx === userChoice) {
                        bubbleClass += " filled";
                      }
                      return (
                        <div className="jee-option" key={idx} onClick={() => selectMcq(q.id, idx)}>
                          <span className={bubbleClass}>{letter}</span>
                          <span className="jee-option-text">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "numerical" && (
                  <div className="jee-numeric-row">
                    <span className="jee-numeric-label">Answer</span>
                    <input
                      className={
                        "jee-numeric-input" +
                        (isRevealed
                          ? (userNumeric.trim() === String(q.correctValue).trim() ? " correct" : " wrong")
                          : "")
                      }
                      type="text"
                      inputMode="decimal"
                      value={userNumeric}
                      disabled={isRevealed}
                      onChange={(e) => setNumericInput((n) => ({ ...n, [q.id]: e.target.value }))}
                      placeholder="—"
                    />
                  </div>
                )}

                {!isRevealed && (
                  <button className="jee-reveal-btn" onClick={() => reveal(q.id)}>Reveal answer</button>
                )}

                {isRevealed && (
                  <div className="jee-answer-panel">
                    <div className="jee-answer-line">
                      {q.type === "mcq"
                        ? `Correct: (${String.fromCharCode(65 + q.correctIndex)})`
                        : `Correct: ${q.correctValue}`}
                    </div>
                    <div className="jee-explanation">{q.explanation}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
