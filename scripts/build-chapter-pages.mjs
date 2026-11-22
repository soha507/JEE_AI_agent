// Runs after `vite build`. Generates static, crawlable chapter pages into dist/ plus a sitemap.
import fs from "fs";
import path from "path";

// ---- change these when the site is renamed ----
const SITE_NAME = "JEE AI Agent";
const SITE_URL = "https://jeeaiagent.vercel.app";
// -----------------------------------------------

const DIST = "dist";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chapters = ["physics", "chemistry", "mathematics"].flatMap((f) =>
  JSON.parse(fs.readFileSync(`content/${f}.json`, "utf8"))
).map((c) => ({ ...c, slug: `${slug(c.subject)}-${slug(c.topic)}` }));

const CSS = `*{box-sizing:border-box}body{margin:0;background:#0a0c10;color:#e7eaee;font:16px/1.65 system-ui,sans-serif}
main{max-width:780px;margin:0 auto;padding:24px 20px 60px}a{color:#7cb7ff}
nav.crumbs{font-size:14px;color:#9aa4b2;margin-bottom:18px}h1{font-size:28px;line-height:1.25;margin:0 0 10px}h2{font-size:20px;margin:30px 0 10px}
.cta{display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;margin:14px 0}
.q{background:#11151c;border:1px solid #232a36;border-radius:12px;padding:14px 16px;margin:12px 0}
details summary{cursor:pointer;color:#7cb7ff;margin-top:8px}ul{padding-left:20px}li{margin:4px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px 18px;padding:0;list-style:none}
.note{font-size:13px;color:#9aa4b2;margin-top:30px}`;

const page = ({ title, desc, url, body, ld }) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta name="robots" content="index, follow"><meta name="theme-color" content="#0a0c10">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${CSS}</style></head><body><main>${body}</main></body></html>`;

const letters = "ABCD";
const gen = (c) => `${SITE_URL}/?subject=${encodeURIComponent(c.subject)}&topic=${encodeURIComponent(c.topic)}`;

function chapterPage(c) {
  const url = `${SITE_URL}/jee-main/${c.slug}/`;
  const title = `${c.topic} - JEE Main ${c.subject} Practice Questions | ${SITE_NAME}`;
  const desc = `Free JEE Main ${c.subject} practice questions on ${c.topic}: key points, sample questions with solutions, and a generator for a full chapter-wise paper.`;
  const qs = c.samples.map((s, i) => `<div class="q"><strong>Q${i + 1}.</strong> ${esc(s.question)}
${s.type === "mcq" ? `<ol type="A">${s.options.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>` : `<p><em>Numerical answer type.</em></p>`}
<details><summary>Show answer and solution</summary><p><strong>Answer: ${s.type === "mcq" ? `${letters[s.correctIndex]}. ${esc(s.options[s.correctIndex])}` : esc(s.answer)}</strong></p><p>${esc(s.explanation)}</p></details></div>`).join("\n");
  const siblings = chapters.filter((x) => x.subject === c.subject && x.slug !== c.slug).slice(0, 8);
  const body = `<nav class="crumbs"><a href="/">${esc(SITE_NAME)}</a> / <a href="/jee-main/">JEE Main chapters</a> / ${esc(c.subject)}</nav>
<h1>${esc(c.topic)}: JEE Main ${esc(c.subject)} practice questions</h1>
<p>${esc(c.intro)}</p>
<a class="cta" href="${gen(c)}">Generate a ${esc(c.topic)} practice paper &rarr;</a>
<h2>Key points to revise</h2><ul>${c.keyPoints.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
<h2>Sample questions</h2>
${qs}
<a class="cta" href="${gen(c)}">Get more ${esc(c.topic)} questions</a>
<h2>More ${esc(c.subject)} chapters</h2><ul class="grid">${siblings.map((x) => `<li><a href="/jee-main/${x.slug}/">${esc(x.topic)}</a></li>`).join("")}</ul>
<p><a href="/jee-main/">All JEE Main chapters</a></p>
<p class="note">Sample questions are original, AI-assisted and checked, written in JEE Main style; they are not copies of past papers. Always cross-check with your textbook.</p>`;
  return page({ title, desc, url, body, ld: { "@context": "https://schema.org", "@type": "LearningResource", name: `${c.topic} - JEE Main ${c.subject} practice`, description: desc, url, educationalLevel: "JEE Main", inLanguage: "en", isAccessibleForFree: true } });
}

function hubPage() {
  const url = `${SITE_URL}/jee-main/`;
  const title = `Chapter-wise JEE Main Practice Questions (Physics, Chemistry, Maths) | ${SITE_NAME}`;
  const desc = `Chapter-wise JEE Main practice questions for all ${chapters.length} chapters of Physics, Chemistry and Mathematics, with key points, samples and a free paper generator.`;
  const sections = ["Physics", "Chemistry", "Mathematics"].map((s) => `<h2>${s}</h2><ul class="grid">${chapters.filter((c) => c.subject === s).map((c) => `<li><a href="/jee-main/${c.slug}/">${esc(c.topic)}</a></li>`).join("")}</ul>`).join("\n");
  const body = `<nav class="crumbs"><a href="/">${esc(SITE_NAME)}</a> / JEE Main chapters</nav>
<h1>Chapter-wise JEE Main practice questions</h1>
<p>Pick a chapter to revise key points, try sample questions, and generate a free practice paper on exactly that chapter.</p>
<a class="cta" href="/">Build a full custom paper &rarr;</a>${sections}`;
  return page({ title, desc, url, body, ld: { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url, description: desc } });
}

const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
write(`${DIST}/jee-main/index.html`, hubPage());
for (const c of chapters) write(`${DIST}/jee-main/${c.slug}/index.html`, chapterPage(c));
const urls = ["/", "/jee-main/", ...chapters.map((c) => `/jee-main/${c.slug}/`)];
write(`${DIST}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`Built ${chapters.length} chapter pages + hub + sitemap (${urls.length} URLs)`);
