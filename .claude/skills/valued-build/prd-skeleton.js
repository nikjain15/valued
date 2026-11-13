// Writes the PRD skeleton at the start of a run: every section, each marked with the gate that fills it.
// The live viewer at /prd shows unfilled sections as placeholders and refreshes as gates fill them.
// Usage: node prd-skeleton.js "<one-line case>" [out/prd.md]
const fs = require("fs");

const [caseLine = "AI use case", dest = "out/prd.md"] = process.argv.slice(2);
const SECTIONS = [
  [1, "Executive summary", "B"],
  [2, "Problem statement and opportunity", "V"],
  [3, "Target users and personas", "V"],
  [4, "Goals, non-goals and success metrics", "V"],
  [5, "Scope and phasing", "A"],
  [6, "Solution overview", "A"],
  [7, "Functional requirements", "B"],
  [8, "AI behavior specification", "U"],
  [9, "Human-in-the-loop design", "U"],
  [10, "Data, privacy and labeling", "L"],
  [11, "Evaluation and acceptance criteria", "E"],
  [12, "Model selection, cost and business case", "A"],
  [13, "Non-functional requirements", "B"],
  [14, "Rollout and operations", "D"],
  [15, "Governance and approvals", "D"],
  [16, "Risks and mitigations", "B"],
  [17, "Dependencies, assumptions and open questions", "B"],
  [18, "Monitoring, observability and cost", "D"],
  [19, "Implementation plan", "B"],
];
const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const out = [
  "# (use case, to be named): product requirements",
  "",
  `<!-- Case: ${caseLine.replace(/\s+--\S+/g, "").trim()} -->`,
  "",
  `**Client:** (client to be named) · **Version:** 0.1, live draft · **Owner:** product lead · **Date:** ${today} · **Source:** built step by step with your team`,
  "",
  // "Pending: fills at gate X" is a machine marker: the PRD viewer swaps it for the step name and never shows it.
  ...SECTIONS.flatMap(([n, title, gate]) => [`## ${n}. ${title}`, "", `> Pending: fills at gate ${gate}.`, ""]),
  "## Appendix: client decisions",
  "",
  "> Pending: fills at gate B.",
  "",
  "## Appendix: document history",
  "",
  "| Version | Date | Change | Requested by | Sections |",
  "|---|---|---|---|---|",
  `| 0.1 | ${today} | First draft, built step by step with your team | Product lead | All |`,
  "",
];
fs.writeFileSync(dest, out.join("\n"));
console.log(`PRD skeleton: ${dest}`);
