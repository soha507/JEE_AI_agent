import React, { useState, useRef } from "react";
import { jsPDF } from "jspdf";

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
  const [selectedSubjects, setSelectedSubjects] = useState(["Physics"]);
  const [selectedTopics, setSelectedTopics] = useState({ Physics: [...SUBJECT_TOPICS.Physics] });
  const [openTopicPanel, setOpenTopicPanel] = useState("Physics");
  const [difficulty, setDifficulty] = useState("Mixed");
  const [questionsPerSubject, setQuestionsPerSubject] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState({});
  const [numericInput, setNumericInput] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const resultsRef = useRef(null);

  function toggleSubject(subj) {
    setSelectedSubjects((prev) => {
      if (prev.includes(subj)) {
        const next = prev.filter((s) => s !== subj);
        setSelectedTopics((t) => {
          const copy = { ...t };
          delete copy[subj];
          return copy;
        });
        if (openTopicPanel === subj) setOpenTopicPanel(next[0] || null);
        return next;
      } else {
        setSelectedTopics((t) => ({ ...t, [subj]: [...SUBJECT_TOPICS[subj]] }));
        setOpenTopicPanel(subj);
        return [...prev, subj];
      }
    });
  }

  function toggleTopic(subj, topic) {
    setSelectedTopics((t) => {
      const current = t[subj] || [];
      const next = current.includes(topic)
        ? current.filter((x) => x !== topic)
        : [...current, topic];
      return { ...t, [subj]: next };
    });
  }

  function selectAllTopics(subj) {
    setSelectedTopics((t) => ({ ...t, [subj]: [...SUBJECT_TOPICS[subj]] }));
  }

  function clearTopics(subj) {
    setSelectedTopics((t) => ({ ...t, [subj]: [] }));
  }

  const totalQuestions = selectedSubjects.length * (Number(questionsPerSubject) || 0);

  async function handleGenerate() {
    if (selectedSubjects.length === 0) {
      setError("Select at least one subject.");
      return;
    }
    for (const subj of selectedSubjects) {
      if (!selectedTopics[subj] || selectedTopics[subj].length === 0) {
        setError(`Select at least one topic for ${subj}.`);
        return;
      }
    }
    if (!questionsPerSubject || questionsPerSubject < 1) {
      setError("Enter a valid number of questions per subject (1 or more).");
      return;
    }

    setLoading(true);
    setError(null);
    setQuestions([]);
    setSelected({});
    setNumericInput({});
    setSubmitted(false);

    try {
      const payload = {
        subjects: selectedSubjects.map((s) => ({ name: s, topics: selectedTopics[s] })),
        difficulty,
        questionsPerSubject,
      };

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No questions returned.");
      }

      // Ensure unique ids/subject fields even if the model slipped up
      const seen = new Set();
      const safeQuestions = data.questions.map((q, i) => {
        const subj = q.subject && SUBJECTS.includes(q.subject) ? q.subject : selectedSubjects[0];
        let id = q.id || `${subj}_${i}`;
        while (seen.has(id)) id = `${id}_${i}`;
        seen.add(id);
        return { ...q, id, subject: subj };
      });

      setQuestions(safeQuestions);
      if (Array.isArray(data.partialErrors) && data.partialErrors.length > 0) {
        setError(`Some sections had trouble generating: ${data.partialErrors.join(" | ")}`);
      }
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
    if (submitted) return;
    setSelected((s) => ({ ...s, [qid]: idx }));
  }

  function isCorrect(q) {
    if (q.type === "mcq") return selected[q.id] === q.correctIndex;
    const userVal = (numericInput[q.id] ?? "").trim();
    return userVal !== "" && userVal === String(q.correctValue).trim();
  }

  function handleSubmitTest() {
    setSubmitted(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleRetake() {
    setSelected({});
    setNumericInput({});
    setSubmitted(false);
  }

  const attemptedCount = questions.filter(
    (q) => (q.type === "mcq" ? selected[q.id] !== undefined : (numericInput[q.id] ?? "").trim() !== "")
  ).length;

  const correctCount = submitted ? questions.filter((q) => isCorrect(q)).length : 0;
  const totalMarks = submitted
    ? questions.reduce((sum, q) => {
        const attempted = q.type === "mcq" ? selected[q.id] !== undefined : (numericInput[q.id] ?? "").trim() !== "";
        if (!attempted) return sum;
        return sum + (isCorrect(q) ? 4 : -1);
      }, 0)
    : 0;

  // Group questions by subject, preserving the order subjects were selected in
  const sections = selectedSubjects.length > 0
    ? selectedSubjects
        .map((subj) => ({ subject: subj, items: questions.filter((q) => q.subject === subj) }))
        .filter((sec) => sec.items.length > 0)
    : [{ subject: null, items: questions }];

  function downloadPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    function ensureSpace(lineHeight) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    function writeText(text, { fontSize = 11, bold = false, indent = 0, spaceAfter = 6 } = {}) {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      const lineHeight = fontSize * 1.35;
      lines.forEach((line) => {
        ensureSpace(lineHeight);
        doc.text(line, margin + indent, y);
        y += lineHeight;
      });
      y += spaceAfter;
    }

    writeText("JEE Main Practice Paper", { fontSize: 18, bold: true, spaceAfter: 4 });
    writeText(`Subjects: ${selectedSubjects.join(", ")}    Difficulty: ${difficulty}`, { fontSize: 10, spaceAfter: 2 });
    writeText(`Marking scheme: +4 for correct, -1 for incorrect`, { fontSize: 10, spaceAfter: 16 });

    let qNum = 0;
    sections.forEach((sec) => {
      if (sec.subject) {
        writeText(sec.subject.toUpperCase(), { fontSize: 13, bold: true, spaceAfter: 8 });
      }
      sec.items.forEach((q) => {
        qNum += 1;
        writeText(`Q${qNum}. [${q.difficultyTag || "Medium"}]`, { fontSize: 11, bold: true, spaceAfter: 2 });
        writeText(q.question, { fontSize: 11, spaceAfter: 4 });
        if (q.type === "mcq" && Array.isArray(q.options)) {
          q.options.forEach((opt, idx) => {
            writeText(`(${String.fromCharCode(65 + idx)})  ${opt}`, { fontSize: 10.5, indent: 14, spaceAfter: 2 });
          });
          y += 8;
        } else {
          writeText("Answer: _______________________", { fontSize: 10.5, indent: 14, spaceAfter: 12 });
        }
      });
    });

    doc.addPage();
    y = margin;
    writeText("Answer Key & Explanations", { fontSize: 16, bold: true, spaceAfter: 12 });

    qNum = 0;
    sections.forEach((sec) => {
      if (sec.subject) {
        writeText(sec.subject.toUpperCase(), { fontSize: 13, bold: true, spaceAfter: 8 });
      }
      sec.items.forEach((q) => {
        qNum += 1;
        const answerText =
          q.type === "mcq"
            ? `(${String.fromCharCode(65 + q.correctIndex)})  ${q.options[q.correctIndex]}`
            : `${q.correctValue}`;
        writeText(`Q${qNum}. Correct Answer: ${answerText}`, { fontSize: 11, bold: true, spaceAfter: 2 });
        writeText(`Explanation: ${q.explanation || "—"}`, { fontSize: 10.5, spaceAfter: 12 });
      });
    });

    const safeSubjects = selectedSubjects.join("_").replace(/[^a-z0-9_]+/gi, "").slice(0, 40);
    doc.save(`JEE_${safeSubjects || "Exam"}.pdf`);
  }

  return (
    <div className="jee-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        * { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; }

        .jee-root {
          --bg: #0a0c10;
          --card: #14171d;
          --card-border: #232830;
          --border: #262b34;
          --text: #e7eaee;
          --text-soft: #9aa3b1;
          --text-faint: #5d6572;
          --accent: #6c8eff;
          --accent-strong: #8aa4ff;
          --accent-bg: rgba(108, 142, 255, 0.12);
          --danger: #ff6b6b;
          --danger-bg: rgba(255, 107, 107, 0.12);
          --green: #3ddc84;
          --green-bg: rgba(61, 220, 132, 0.12);
          --amber: #ffb454;
          --amber-bg: rgba(255, 180, 84, 0.12);
          --shadow: rgba(0, 0, 0, 0.55);
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--text);
          background:
            radial-gradient(ellipse 900px 500px at 50% -10%, rgba(108, 142, 255, 0.10), transparent),
            radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px) 0 0 / 22px 22px,
            var(--bg);
          min-height: 100vh;
          padding: 28px 20px 64px;
          position: relative;
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
          color: var(--text-faint);
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
          color: var(--text);
        }
        .jee-title span { color: var(--accent-strong); }

        .jee-form {
          background: var(--card);
          border-radius: 12px;
          padding: 22px 22px 20px;
          box-shadow: 0 1px 2px var(--shadow), 0 12px 32px -16px var(--shadow);
          border: 1px solid var(--card-border);
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
          color: var(--text-soft);
          margin-bottom: 6px;
        }
        .jee-field select,
        .jee-field input[type="number"] {
          width: 100%;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14.5px;
          color: var(--text);
          background: #0e1116;
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 9px 11px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .jee-field select:focus,
        .jee-field input[type="number"]:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
        .jee-field-full { grid-column: 1 / -1; }

        .jee-field-block { margin-bottom: 18px; }
        .jee-field-block label {
          display: block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-soft);
          margin-bottom: 8px;
        }
        .jee-subject-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .jee-chip {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-soft);
          background: #0e1116;
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .jee-chip:hover { border-color: var(--accent); color: var(--text); }
        .jee-chip.active {
          background: var(--accent-bg);
          border-color: var(--accent);
          color: var(--accent-strong);
          font-weight: 600;
        }

        .jee-topic-panel {
          border: 1px solid var(--border);
          border-radius: 9px;
          margin-bottom: 14px;
          overflow: hidden;
          background: #0e1116;
        }
        .jee-topic-panel-head {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: none;
          color: var(--text);
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          padding: 11px 14px;
          cursor: pointer;
        }
        .jee-topic-count {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-faint);
        }
        .jee-topic-body { padding: 0 14px 14px; }
        .jee-topic-actions { display: flex; gap: 14px; margin-bottom: 8px; }
        .jee-link-btn {
          background: transparent;
          border: none;
          color: var(--accent);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          cursor: pointer;
          padding: 0;
        }
        .jee-link-btn:hover { color: var(--accent-strong); text-decoration: underline; }
        .jee-topic-list {
          max-height: 190px;
          overflow-y: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          padding-right: 4px;
        }
        .jee-topic-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: var(--text-soft);
          padding: 4px 2px;
          cursor: pointer;
          line-height: 1.35;
        }
        .jee-topic-item:hover { color: var(--text); }
        .jee-topic-item input {
          margin-top: 2px;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .jee-total-hint {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--text-faint);
        }

        .jee-section-header {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent-strong);
          padding: 4px 2px;
          border-bottom: 1px solid var(--border);
          margin: 6px 0 2px;
        }
        .jee-section { display: flex; flex-direction: column; gap: 18px; }

        .jee-generate-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 18px;
        }
        .jee-error {
          font-size: 12.5px;
          color: #ffb3b3;
          font-weight: 500;
          line-height: 1.5;
          word-break: break-word;
          background: var(--danger-bg);
          border: 1px solid rgba(255, 107, 107, 0.25);
          border-radius: 7px;
          padding: 8px 10px;
          margin-top: 12px;
        }
        .jee-generate-btn {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          color: #0a0c10;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          padding: 11px 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        }
        .jee-generate-btn:hover:not(:disabled) {
          background: var(--accent-strong);
          box-shadow: 0 0 0 4px var(--accent-bg);
        }
        .jee-generate-btn:active:not(:disabled) { transform: scale(0.98); }
        .jee-generate-btn:disabled { opacity: 0.5; cursor: default; }

        .jee-results { display: flex; flex-direction: column; gap: 18px; }

        .jee-card {
          background: var(--card);
          border-radius: 12px;
          padding: 20px 22px 18px;
          box-shadow: 0 1px 2px var(--shadow), 0 12px 32px -18px var(--shadow);
          border: 1px solid var(--card-border);
        }
        .jee-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .jee-qnum { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; color: var(--text); }
        .jee-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 20px;
          font-weight: 600;
        }
        .jee-tag-easy { background: var(--green-bg); color: var(--green); }
        .jee-tag-medium { background: var(--amber-bg); color: var(--amber); }
        .jee-tag-hard { background: var(--danger-bg); color: var(--danger); }
        .jee-marks { margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-faint); }

        .jee-question-text { font-size: 15.5px; line-height: 1.6; margin: 4px 0 16px; color: var(--text); }

        .jee-options { display: flex; flex-direction: column; gap: 9px; margin-bottom: 8px; }
        .jee-option { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 6px 4px; border-radius: 6px; }
        .jee-option:hover { background: rgba(255,255,255,0.03); }
        .jee-option:hover .jee-bubble:not(.filled) { border-color: var(--accent); }
        .jee-bubble {
          flex: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1.6px solid var(--text-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-soft);
          transition: all 0.12s ease;
        }
        .jee-bubble.filled { background: var(--accent); border-color: var(--accent); color: #0a0c10; }
        .jee-bubble.correct { background: var(--green); border-color: var(--green); color: #0a0c10; }
        .jee-bubble.wrong { background: var(--danger); border-color: var(--danger); color: #0a0c10; }
        .jee-option-text { font-size: 14.5px; color: var(--text); }

        .jee-numeric-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .jee-numeric-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-soft); }
        .jee-numeric-input {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          background: #0e1116;
          border: 1.6px solid var(--border);
          border-radius: 7px;
          padding: 8px 12px;
          width: 120px;
          outline: none;
        }
        .jee-numeric-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
        .jee-numeric-input.correct { border-color: var(--green); background: var(--green-bg); color: var(--green); }
        .jee-numeric-input.wrong { border-color: var(--danger); background: var(--danger-bg); color: var(--danger); }

        .jee-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 4px;
        }
        .jee-attempted {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--text-soft);
        }
        .jee-toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .jee-secondary-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--text-soft);
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 8px 14px;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .jee-secondary-btn:hover { border-color: var(--accent); color: var(--text); }

        .jee-score-panel {
          background: var(--card);
          border-radius: 12px;
          padding: 16px 22px;
          box-shadow: 0 1px 2px var(--shadow), 0 12px 32px -18px var(--shadow);
          border: 1px solid var(--card-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .jee-score-main {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
        }
        .jee-score-num { font-size: 26px; color: var(--green); }
        .jee-score-den { font-size: 14px; color: var(--text-soft); margin-left: 4px; }
        .jee-score-marks {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          color: var(--text-soft);
        }
        .jee-score-marks span { color: var(--text-faint); }

        .jee-result-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 20px;
          font-weight: 600;
        }
        .jee-result-correct { background: var(--green-bg); color: var(--green); }
        .jee-result-wrong { background: var(--danger-bg); color: var(--danger); }

        .jee-submit-test-btn {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 15px;
          color: #0a0c10;
          background: var(--danger);
          border: none;
          border-radius: 9px;
          padding: 14px 20px;
          cursor: pointer;
          margin-top: 4px;
          transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        }
        .jee-submit-test-btn:hover { background: #ff8080; box-shadow: 0 0 0 4px var(--danger-bg); }
        .jee-submit-test-btn:active { transform: scale(0.99); }

        .jee-answer-panel {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 8px;
          background: var(--accent-bg);
          border-left: 3px solid var(--accent);
        }
        .jee-answer-line { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--accent-strong); margin-bottom: 4px; }
        .jee-explanation { font-size: 13.5px; line-height: 1.55; color: var(--text-soft); }

        .jee-loading { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--text-soft); text-align: center; padding: 30px 0; }
        .jee-empty { font-size: 13.5px; color: var(--text-faint); text-align: center; padding: 20px 0 0; }

        @media (max-width: 560px) {
          .jee-row { grid-template-columns: 1fr; }
          .jee-title { font-size: 24px; }
        }
      
`}</style>

      <div className="jee-shell">
        <div className="jee-eyebrow">
          <span>JEE Main · Practice Paper Generator</span>
          <span>Session 2026</span>
        </div>
        <h1 className="jee-title">Set your <span>own</span> paper</h1>

        <div className="jee-form">
          <div className="jee-field-block">
            <label>Subjects</label>
            <div className="jee-subject-chips">
              {SUBJECTS.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={"jee-chip" + (selectedSubjects.includes(s) ? " active" : "")}
                  onClick={() => toggleSubject(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {selectedSubjects.map((subj) => {
            const topics = selectedTopics[subj] || [];
            const allTopics = SUBJECT_TOPICS[subj];
            const isOpen = openTopicPanel === subj;
            return (
              <div className="jee-topic-panel" key={subj}>
                <button
                  type="button"
                  className="jee-topic-panel-head"
                  onClick={() => setOpenTopicPanel(isOpen ? null : subj)}
                >
                  <span>{subj} topics</span>
                  <span className="jee-topic-count">
                    {topics.length} / {allTopics.length} selected {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isOpen && (
                  <div className="jee-topic-body">
                    <div className="jee-topic-actions">
                      <button type="button" className="jee-link-btn" onClick={() => selectAllTopics(subj)}>Select all</button>
                      <button type="button" className="jee-link-btn" onClick={() => clearTopics(subj)}>Clear</button>
                    </div>
                    <div className="jee-topic-list">
                      {allTopics.map((t) => (
                        <label className="jee-topic-item" key={t}>
                          <input
                            type="checkbox"
                            checked={topics.includes(t)}
                            onChange={() => toggleTopic(subj, t)}
                          />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="jee-row">
            <div className="jee-field">
              <label>Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="jee-field">
              <label>Questions per subject</label>
              <input
                type="number"
                min={1}
                max={25}
                value={questionsPerSubject}
                onChange={(e) => setQuestionsPerSubject(e.target.value === "" ? "" : Number(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              />
            </div>
          </div>

          <div className="jee-generate-row">
            <span className="jee-total-hint">
              {selectedSubjects.length > 0 && questionsPerSubject
                ? `Total: ${totalQuestions} questions across ${selectedSubjects.length} subject${selectedSubjects.length > 1 ? "s" : ""}`
                : ""}
            </span>
            <button className="jee-generate-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? "Setting paper…" : "Generate Exam →"}
            </button>
          </div>
          {error && <div className="jee-error">{error}</div>}
        </div>

        <div ref={resultsRef} className="jee-results">
          {loading && <div className="jee-loading">Drawing up questions from past JEE Main patterns…</div>}

          {!loading && questions.length === 0 && (
            <div className="jee-empty">Choose subjects and topics, then generate your first paper.</div>
          )}

          {!loading && questions.length > 0 && (
            <div className="jee-toolbar">
              <span className="jee-attempted">
                {submitted ? "Test submitted" : `${attemptedCount} / ${questions.length} attempted`}
              </span>
              <div className="jee-toolbar-actions">
                <button className="jee-secondary-btn" onClick={downloadPdf}>Download Question Paper (PDF)</button>
                {submitted && (
                  <button className="jee-secondary-btn" onClick={handleRetake}>Retake</button>
                )}
              </div>
            </div>
          )}

          {!loading && submitted && questions.length > 0 && (
            <div className="jee-score-panel">
              <div className="jee-score-main">
                <span className="jee-score-num">{correctCount}</span>
                <span className="jee-score-den">/ {questions.length} correct</span>
              </div>
              <div className="jee-score-marks">Marks: {totalMarks} <span>(+4 / −1 scheme, unattempted = 0)</span></div>
            </div>
          )}

          {!loading && questions.length > 0 && (() => {
            let qNum = 0;
            return sections.map((sec) => (
              <div className="jee-section" key={sec.subject || "all"}>
                {sec.subject && sections.length > 1 && (
                  <div className="jee-section-header">{sec.subject}</div>
                )}
                {sec.items.map((q) => {
                  qNum += 1;
                  const tagClass =
                    q.difficultyTag === "Easy" ? "jee-tag-easy" :
                    q.difficultyTag === "Hard" ? "jee-tag-hard" : "jee-tag-medium";
                  const userChoice = selected[q.id];
                  const userNumeric = numericInput[q.id] ?? "";
                  const correct = submitted ? isCorrect(q) : null;

                  return (
                    <div className="jee-card" key={q.id}>
                      <div className="jee-card-head">
                        <span className="jee-qnum">Q{qNum}</span>
                        <span className={`jee-tag ${tagClass}`}>{q.difficultyTag || "Medium"}</span>
                        {submitted && (
                          <span className={`jee-result-tag ${correct ? "jee-result-correct" : "jee-result-wrong"}`}>
                            {correct ? "Correct" : "Incorrect"}
                          </span>
                        )}
                        <span className="jee-marks">+4 / −1</span>
                      </div>
                      <p className="jee-question-text">{q.question}</p>

                      {q.type === "mcq" && Array.isArray(q.options) && (
                        <div className="jee-options">
                          {q.options.map((opt, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            let bubbleClass = "jee-bubble";
                            if (submitted) {
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
                              (submitted ? (correct ? " correct" : " wrong") : "")
                            }
                            type="text"
                            inputMode="decimal"
                            value={userNumeric}
                            disabled={submitted}
                            onChange={(e) => setNumericInput((n) => ({ ...n, [q.id]: e.target.value }))}
                            placeholder="—"
                          />
                        </div>
                      )}

                      {submitted && (
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
            ));
          })()}

          {!loading && !submitted && questions.length > 0 && (
            <button className="jee-submit-test-btn" onClick={handleSubmitTest}>
              Submit Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
