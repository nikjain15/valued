// Renders out/prd.md into out/prd.html with the founderfirst-styled viewer. No dependencies.
// Usage: node render-prd.js <prd.md> <prd.html>
const fs = require("fs");
const path = require("path");

const [src = "out/prd.md", dest = "out/prd.html"] = process.argv.slice(2);
const md = fs.readFileSync(src, "utf8");
const template = fs.readFileSync(path.join(__dirname, "prd-viewer.html"), "utf8");
// JSON-encode and break any closing script tag so the markdown cannot end the script early.
const json = JSON.stringify(md).replace(/<\/(script)/gi, "<\\/$1");
const css = fs.readFileSync(path.join(__dirname, "app", "ff.css"), "utf8");
const html = template
  .replace('<link rel="stylesheet" href="proto/ff.css">', () => `<style>\n${css}\n</style>`)
  .replace("{{PRD_JSON}}", () => json);
fs.writeFileSync(dest, html);
console.log(`PRD: ${dest} (${md.split("\n").length} lines)`);
