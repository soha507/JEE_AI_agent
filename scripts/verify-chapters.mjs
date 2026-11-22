// Checks content/*.json: structure, topic names match the app, numeric answers re-computed.
import fs from "fs";
const topics = JSON.parse(fs.readFileSync("content/topics.json", "utf8"));
const all = ["physics", "chemistry", "mathematics"].flatMap((f) =>
  JSON.parse(fs.readFileSync(`content/${f}.json`, "utf8"))
);
let bad = 0;
const fail = (m) => { bad++; console.error("FAIL:", m); };
for (const [subj, list] of Object.entries(topics)) {
  for (const t of list) {
    const c = all.find((x) => x.subject === subj && x.topic === t);
    if (!c) { fail(`missing ${subj} / ${t}`); continue; }
    if (!c.intro || c.keyPoints?.length < 3 || c.samples?.length !== 2) fail(`shape ${t}`);
    for (const s of c.samples) {
      if (s.type === "mcq") {
        if (s.options?.length !== 4 || !(s.correctIndex >= 0 && s.correctIndex < 4)) fail(`mcq ${t}`);
        if (new Set(s.options).size !== 4) fail(`dup options ${t}`);
      } else if (s.verify) {
        const v = Function("Math", `"use strict";return (${s.verify})`)(Math);
        if (Math.abs(v - Number(s.answer)) > 0.01 * Math.max(1, Math.abs(v))) fail(`numeric ${t}: ${v} vs ${s.answer}`);
      }
    }
  }
}
console.log(all.length, "chapters checked,", bad, "problems");
process.exit(bad ? 1 : 0);
