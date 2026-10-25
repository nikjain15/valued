// VALUED prototype server. Plain Node, no dependencies.
// Serves the workbench, runs the router, drafts with a model when the engine allows it,
// runs the eval, and keeps an audit log. Synthetic data only.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const DIR = __dirname;
const PORT = Number(process.env.PORT || 4317);
const MODEL = process.env.VALUED_MODEL || "claude-opus-5-5";
const KEY = process.env.ANTHROPIC_API_KEY || "";
const LOG = path.join(DIR, "audit.jsonl");

const readJson = (f, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")); } catch { return fallback; }
};
// Everything is read fresh on each request: the server starts at setup, before the router exists,
// and the router changes when a failing gate is fixed.
let sources = [], build = { engine: "rules" }, caseInfo = {};
function loadRouter() {
  const file = path.join(DIR, "router.js");
  if (!fs.existsSync(file)) return null;
  delete require.cache[require.resolve(file)];
  return require(file);
}
function refresh() {
  sources = readJson("sources.json", []);
  build = readJson("build.json", { engine: "rules" });
  caseInfo = readJson("case.json", {});
}

const sourceText = (id) => (sources.find((s) => s.id === id) || {}).text || "";

// Template draft: used when the engine is rules only, or when the model is unavailable.
function templateDraft(sourceId) {
  const text = sourceText(sourceId);
  if (!text) return "";
  return `${caseInfo.draftOpener || "Thanks for reaching out."} ${text}`;
}

async function callModel(system, user) {
  if (!KEY) return { ok: false, why: "no ANTHROPIC_API_KEY set" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2026-10-21",
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        output_config: { effort: "low" },
        fallbacks: "default",
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const body = await res.json();
    if (!res.ok) return { ok: false, why: `API ${res.status}: ${body.error?.message || "error"}` };
    if (body.stop_reason === "refusal") return { ok: false, why: "model declined" };
    const text = (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return { ok: true, text, model: body.model };
  } catch (e) {
    return { ok: false, why: `network: ${e.message}` };
  }
}

async function modelDraft(input, sourceId) {
  const system = [
    `You draft a reply for a ${caseInfo.user || "front-line employee"} to review before anything is sent.`,
    "Use only the facts in the SOURCE. If the source does not answer the question, reply exactly: NO_ANSWER.",
    "Two to four plain sentences. No promises, no advice beyond the source, no em-dashes.",
  ].join(" ");
  const out = await callModel(system, `SOURCE ${sourceId}:\n${sourceText(sourceId)}\n\nREQUEST:\n${input}`);
  if (!out.ok) return { draft: templateDraft(sourceId), drafter: "template", note: `Model unavailable (${out.why}); template draft shown.` };
  if (out.text.includes("NO_ANSWER")) return { draft: "", drafter: "model", note: "Model found no answer in the source; routed to a person.", noAnswer: true };
  return { draft: out.text, drafter: out.model || MODEL, note: "Drafted by the model from the cited source only." };
}

async function modelPropose(input) {
  const list = sources.map((s) => `${s.id}: ${s.text}`).join("\n");
  const system = 'Classify the request. Reply with JSON only: {"verdict":"answer|human|escalate","source":"<id or null>","reason":"<one line>"}. Answer only if exactly one source answers it. Escalate any complaint, distress, vulnerability or risk.';
  const out = await callModel(system, `SOURCES:\n${list}\n\nREQUEST:\n${input}`);
  if (!out.ok) return null;
  try { return JSON.parse(out.text.slice(out.text.indexOf("{"), out.text.lastIndexOf("}") + 1)); } catch { return null; }
}

async function decide(input) {
  refresh();
  const router = loadRouter();
  if (!router) return { verdict: "human", source: null, reason: "The router is not built yet (it is built at gate E).", notes: [] };
  const rules = router.decide(input);
  let result = { ...rules, engine: build.engine, proposedBy: "rules" };
  let notes = [];

  if (build.engine === "model-first") {
    const proposal = await modelPropose(input);
    if (!proposal) notes.push("Model unavailable; rules decided.");
    else if (rules.verdict === "escalate" && proposal.verdict !== "escalate") {
      notes.push(`Model proposed "${proposal.verdict}"; the escalation guard overruled it.`);
    } else {
      result = { ...result, verdict: proposal.verdict, source: proposal.source || null, reason: proposal.reason, proposedBy: "model" };
      if (proposal.verdict === "answer" && !sourceText(proposal.source)) {
        result.verdict = "human"; result.source = null;
        notes.push("Model proposed an answer without a valid source; routed to a person.");
      }
    }
  }

  if (result.verdict === "answer") {
    if (build.engine === "rules") {
      result.draft = templateDraft(result.source); result.drafter = "template";
      notes.push("Rules engine: draft assembled from the cited source.");
    } else {
      const d = await modelDraft(input, result.source);
      result.draft = d.draft; result.drafter = d.drafter; notes.push(d.note);
      if (d.noAnswer) { result.verdict = "human"; result.source = null; }
    }
    result.sourceText = sourceText(result.source);
  }
  result.notes = notes;
  return result;
}

function runEval(file) {
  const safe = ["golden.json", "holdout.json"].includes(file) ? file : "golden.json";
  return new Promise((resolve) => {
    execFile(process.execPath, [path.join(DIR, "eval.js"), safe], { cwd: DIR, timeout: 20000 }, (err, stdout, stderr) => {
      resolve({ file: safe, code: err ? err.code ?? 1 : 0, output: (stdout || "") + (stderr || "") });
    });
  });
}

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const PUBLIC = new Set(["app.html", "ff.css", "case.json", "build.json", "sources.json", "gates.json"]);

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e5) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === "POST" && url.pathname === "/api/decide") {
      const { text } = await readBody(req);
      if (!text || !String(text).trim()) return send(res, 400, { error: "empty input" });
      return send(res, 200, await decide(String(text).slice(0, 2000)));
    }
    if (url.pathname === "/api/eval") return send(res, 200, await runEval(url.searchParams.get("file")));
    if (req.method === "POST" && url.pathname === "/api/log") {
      const entry = { ...(await readBody(req)), at: new Date().toISOString(), version: caseInfo.version || "proto-0.1", engine: build.engine };
      fs.appendFileSync(LOG, JSON.stringify(entry) + "\n");
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/log") {
      const rows = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
      return send(res, 200, rows.reverse());
    }
    if (url.pathname === "/api/status") {
      refresh();
      const ready = fs.existsSync(path.join(DIR, "router.js")) && fs.existsSync(path.join(DIR, "case.json"));
      return send(res, 200, { ready, engine: build.engine, model: MODEL, modelReady: Boolean(KEY) });
    }
    if (url.pathname === "/prd.md") {
      const file = path.join(DIR, "..", "prd.md");
      return send(res, 200, fs.existsSync(file) ? fs.readFileSync(file) : "# PRD\n\n> Pending: the PRD starts when the run starts.", TYPES[".md"]);
    }
    if (url.pathname === "/prd") return send(res, 200, fs.readFileSync(path.join(DIR, "prd-viewer.html")), TYPES[".html"]);
    const name = url.pathname === "/" ? "app.html" : url.pathname.slice(1);
    if (!PUBLIC.has(name)) return send(res, 404, { error: "not found" });
    if (!fs.existsSync(path.join(DIR, name))) return send(res, 200, name === "sources.json" ? "[]" : "{}");
    return send(res, 200, fs.readFileSync(path.join(DIR, name)), TYPES[path.extname(name)] || "text/plain");
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}).listen(PORT, () => {
  refresh();
  console.log(`PRD: http://localhost:${PORT}/prd  Prototype: http://localhost:${PORT}  model=${KEY ? MODEL : "off (no key, template drafts)"}`);
});
