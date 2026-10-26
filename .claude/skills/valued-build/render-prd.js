// Renders out/prd.md with the PRD viewer.
//   node render-prd.js <prd.md> <prd.html>                         standalone file, styles inlined, opens from file://
//   node render-prd.js <prd.md> <page.html> --artifact <proto url>  body-only page to publish as a claude.ai artifact
// While the run is live, the server serves the same viewer at /prd and it refreshes itself.
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const artifact = args.includes("--artifact");
const protoUrl = artifact ? args[args.indexOf("--artifact") + 1] || "" : "";
const [src = "out/prd.md", dest = "out/prd.html"] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--artifact");
const md = fs.readFileSync(src, "utf8");
const template = fs.readFileSync(path.join(__dirname, "prd-viewer.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "app", "ff.css"), "utf8");
// JSON-encode and break any closing script tag so the markdown cannot end the script early.
const json = JSON.stringify(md).replace(/<\/(script)/gi, "<\\/$1");
const dataTag = `<script>window.__PRD__ = ${json};${protoUrl ? ` window.__PROTO__ = ${JSON.stringify(protoUrl)};` : ""}</script>`;

let html;
if (!artifact) {
  html = template
    .replace('<link rel="stylesheet" href="/ff.css">', () => `<style>\n${css}\n</style>`)
    .replace("<!--PRD_DATA-->", () => dataTag);
} else {
  const style = (template.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1];
  const body = (template.match(/<body>([\s\S]*)<\/body>/) || [, ""])[1];
  const title = (md.match(/^#\s+(.*)$/m) || [, "Product requirements"])[1].replace(/:\s*product requirements$/i, "").replace(/[<>&]/g, "");
  html = [
    `<title>${title} PRD</title>`,
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap">',
    `<style>\n:root { color-scheme: light; }\n${css.replace(/^@import[^\n]*\n/m, "")}\n${style}\n</style>`,
    body.replace(/<a class="btn ghost sm hide-sm" id="mdLink"[^>]*>[^<]*<\/a>/, "").replace("<!--PRD_DATA-->", () => dataTag),
  ].join("\n");
}
fs.writeFileSync(dest, html);
console.log(`PRD: ${dest} (${md.split("\n").length} lines${artifact ? ", artifact page" : ""})`);
