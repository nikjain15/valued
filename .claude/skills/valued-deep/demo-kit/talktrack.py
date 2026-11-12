#!/usr/bin/env python3
"""Talk track to PDF (P-013). Renders out/<case>-final-story.md (headings, bullets, tables, bold, code)
to HTML and prints it to PDF with headless Chrome. Run after every change to the talk track.
Usage: python3 .claude/skills/valued-deep/demo-kit/talktrack.py out/<case>-final-story.md [out.pdf]"""
import html, os, re, subprocess, sys, tempfile

src = sys.argv[1]
pdf = sys.argv[2] if len(sys.argv) > 2 else re.sub(r"\.md$", ".pdf", src)

def inl(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    return t

out, i, lines = [], 0, open(src, encoding="utf-8").read().split("\n")
while i < len(lines):
    l = lines[i]
    if l.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            if not re.match(r"^\|\s*-", lines[i]): rows.append([c.strip() for c in lines[i].strip("|").split("|")])
            i += 1
        out.append("<table><tr>" + "".join(f"<th>{inl(c)}</th>" for c in rows[0]) + "</tr>" +
                   "".join("<tr>" + "".join(f"<td>{inl(c)}</td>" for c in r) + "</tr>" for r in rows[1:]) + "</table>")
        continue
    m = re.match(r"^(#{1,3}) (.*)", l)
    if m: out.append(f"<h{len(m[1])}>{inl(m[2])}</h{len(m[1])}>")
    elif l.startswith("- "):
        items = []
        while i < len(lines) and lines[i].startswith("- "): items.append(f"<li>{inl(lines[i][2:])}</li>"); i += 1
        out.append("<ul>" + "".join(items) + "</ul>"); continue
    elif l.strip() == "---": out.append("<hr>")
    elif l.strip(): out.append(f"<p>{inl(l)}</p>")
    i += 1

css = ("body{font:11px/1.45 -apple-system,Helvetica,sans-serif;color:#222;margin:28px}h1{font-size:20px}h2{font-size:15px;margin-top:18px}"
       "h3{font-size:13px}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}"
       "th{background:#f3f3ee}code{background:#f3f3ee;padding:0 3px}hr{border:0;border-top:1px solid #ddd}ul{margin:4px 0;padding-left:18px}")
h = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
h.write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(out)}</body></html>'); h.close()
chrome = next((c for c in ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "chromium"] if os.path.exists(c) or c[0] != "/"), None)
subprocess.run([chrome, "--headless", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={os.path.abspath(pdf)}", h.name],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
print(f"Talk track PDF: {pdf}" if os.path.exists(pdf) else "PDF not written: is Chrome installed?")
