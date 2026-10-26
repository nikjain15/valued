// Packs a run's prototype into one self-contained page for publishing as a claude.ai artifact.
// The page runs the router in the browser and calls Claude through the artifact's own access (no API key).
// Usage: node build-hosted.js <out dir> [prd url]   ->  <out dir>/hosted/index.html
const fs = require("fs");
const path = require("path");

const [outDir = "out", prdUrl = ""] = process.argv.slice(2);
const proto = path.join(outDir, "proto");
const read = (f, fb) => { try { return fs.readFileSync(path.join(proto, f), "utf8"); } catch { return fb; } };
const json = (f, fb) => { try { return JSON.parse(read(f, "")); } catch { return fb; } };

const app = fs.readFileSync(path.join(__dirname, "app", "app.html"), "utf8");
const ff = fs.readFileSync(path.join(__dirname, "app", "ff.css"), "utf8").replace(/^@import[^\n]*\n/m, "");
const style = (app.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1];
const body = (app.match(/<body>([\s\S]*)<\/body>/) || [, ""])[1];

const caseInfo = json("case.json", {});

// P-001 ships both label sets inside the page so the shared link can score the release. That is sealed
// from the model, not from a reader, and it only holds while the rows are synthetic. A row carrying an
// `origin` under inputs/ came from real client material, which CLAUDE.md forbids publishing until the
// client confirms the published copy is de-identified, so refuse rather than inline it.
const fromInputs = (rows) => rows.filter((r) => /^inputs\//.test(String(r && r.origin || "")));
const real = [["golden.json", json("golden.json", [])], ["holdout.json", json("holdout.json", [])]]
  .map(([f, rows]) => [f, fromInputs(rows).length]).filter(([, n]) => n > 0);
if (real.length && !process.argv.includes("--client-confirmed-deidentified")) {
  console.error(`Refusing to build the hosted page: ${real.map(([f, n]) => `${n} row${n === 1 ? "" : "s"} in ${f}`).join(" and ")} came from inputs/, and the hosted bundle inlines both label sets.`);
  console.error("De-identify those rows in out/proto/ and clear their origin, or, once the client has confirmed the published copy is de-identified, pass --client-confirmed-deidentified.");
  process.exit(2);
}

const data = {
  "case.json": caseInfo,
  "sources.json": json("sources.json", []),
  "gates.json": json("gates.json", {}),
  "build.json": json("build.json", { engine: "rules" }),
  "golden.json": json("golden.json", []),
  "holdout.json": json("holdout.json", []),
  "router.js": read("router.js", ""),
  "model-cache.json": json("model-cache.json", {}),
  prdUrl,
};
const dataTag = `<script>window.__VALUED__ = ${JSON.stringify(data).replace(/<\/(script)/gi, "<\\/$1")};</script>`;

const page = [
  `<title>${(caseInfo.title || "Prototype").replace(/[<>&]/g, "")}</title>`,
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap">',
  `<style>\n:root { color-scheme: light; }\n${ff}\n${style}\n</style>`,
  body.replace("<!--VALUED_DATA-->", () => dataTag),
].join("\n");

const dest = path.join(outDir, "hosted");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, "index.html"), page);
console.log(`Hosted page: ${path.join(dest, "index.html")} (${Math.round(page.length / 1024)} KB)`);
