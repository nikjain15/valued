// Writes the PRD skeleton at the start of a run: every section, each marked with the gate that fills it.
// The live viewer at /prd shows unfilled sections as placeholders and refreshes as gates fill them.
// Usage: node prd-skeleton.js "<one-line case>" [out/prd.md]
const fs = require("fs");

const [caseLine = "AI use case", dest = "out/prd.md"] = process.argv.slice(2);
const SECTIONS = [
  [1, "Summary", "B"],
  [2, "Problem and value", "V"],
  [3, "Users and jobs", "V"],
  [4, "Goals, non-goals and success metrics", "V"],
  [5, "Scope: first wave, and what is not GenAI", "A"],
  [6, "Solution overview", "A"],
  [7, "Functional requirements", "B"],
  [8, "AI behaviour specification", "U"],
  [9, "Human in the loop", "U"],
  [10, "Data, labels and privacy", "L"],
  [11, "Evaluation and release gates", "E"],
  [12, "Non-functional requirements", "B"],
  [13, "Rollout and drive", "D"],
  [14, "Governance and sign-offs", "D"],
  [15, "Risks and mitigations", "B"],
  [16, "Dependencies, open questions and assumptions", "B"],
  [17, "Build it with AI", "B"],
];
const today = new Date().toISOString().slice(0, 10);
const out = [
  `# ${caseLine.replace(/\s+--\S+/g, "").trim()}: product requirements`,
  "",
  `**Client:** (from gate V) · **Version:** 0.1, live draft · **Owner:** product lead · **Date:** ${today} · **Source:** VALUED run`,
  "",
  ...SECTIONS.flatMap(([n, title, gate]) => [`## ${n}. ${title}`, "", `> Pending: fills at gate ${gate}.`, ""]),
  "## Appendix: client decisions",
  "",
  "> Pending: fills at gate B.",
  "",
  "## Appendix: document history",
  "",
  "| Version | Date | Change | Requested by | Sections |",
  "|---|---|---|---|---|",
  `| 0.1 | ${today} | First draft, built gate by gate in the working session | Product lead | All |`,
  "",
];
fs.writeFileSync(dest, out.join("\n"));
console.log(`PRD skeleton: ${dest}`);
