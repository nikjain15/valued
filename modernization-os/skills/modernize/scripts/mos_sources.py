#!/usr/bin/env python3
"""mos_sources.py: bring the knowledge around the code into reach. No MCP, no packages.

Turns Word, Excel, PowerPoint, PDF, HTML and text files, and Jira issues and Confluence
pages read with a personal token, into plain text under modernization/sources/, with an
index of sections so a large document can be read a part at a time.

  mos_sources.py add FILE_OR_FOLDER [...]         .docx .xlsx .pptx .pdf .html .csv .txt .md ...
  mos_sources.py jira --base URL (--jql Q | --keys K [K ...]) [--limit N]
  mos_sources.py confluence --base URL (--page-id ID [...] | --cql Q) [--depth N] [--limit N]
  mos_sources.py toc                              what has been read, with sections
  mos_sources.py find WORD [WORD ...]             where the words appear (source:line)

Tokens come from the environment and are never written anywhere:
  JIRA_TOKEN, CONFLUENCE_TOKEN   the personal access token
  ATLASSIAN_EMAIL                set it for Atlassian Cloud (email + API token); leave unset
                                 for Data Center personal access tokens
Only GET requests are made. Nothing is ever written to Jira or Confluence.
"""
import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

WS = "modernization"
SRC = os.path.join(WS, "sources")
TEXT_EXT = {".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".sql", ".yaml", ".yml", ".log",
            ".rst", ".ini", ".cfg", ".properties"}


def die(msg):
    print("BLOCKED: " + msg, file=sys.stderr)
    sys.exit(1)


def L(tag):
    return tag.rsplit("}", 1)[-1]


def attr(el, name):
    for k, v in el.attrib.items():
        if L(k) == name:
            return v
    return None


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80] or "source"


def row(cells):
    return "| " + " | ".join(c.replace("\n", " ").replace("|", "/").strip() for c in cells) + " |"


def store(name, title, origin, text):
    """Write one source and index its sections. Returns the path."""
    os.makedirs(SRC, exist_ok=True)
    ignore = os.path.join(SRC, ".gitignore")
    if not os.path.exists(ignore):  # client material stays out of version control
        with open(ignore, "w") as f:
            f.write("*\n!.gitignore\n")
    text = re.sub(r"\n{3,}", "\n\n", text.replace("\r", "")).strip() + "\n"
    body = "# %s\n\nOrigin: %s\n\n%s" % (title, origin, text)
    path = os.path.join(SRC, name + ".md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(body)
    lines = body.split("\n")
    idx_path = os.path.join(SRC, "index.json")
    try:
        with open(idx_path, encoding="utf-8") as f:
            idx = json.load(f)
    except (OSError, ValueError):
        idx = {}
    idx[name] = {"title": title, "origin": origin, "lines": len(lines), "chars": len(body),
                 "sections": [{"title": l.lstrip("# ").strip(), "line": i + 1}
                              for i, l in enumerate(lines) if l.startswith("#")][:400]}
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(idx, f, indent=2, sort_keys=True)
    return path


# ---------------------------------------------------------------- files

def docx_text(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    out = []

    def para(p):
        style, bullet, parts = "", False, []
        for n in p.iter():
            t = L(n.tag)
            if t == "pStyle":
                style = attr(n, "val") or ""
            elif t == "numPr":
                bullet = True
            elif t == "t":
                parts.append(n.text or "")
            elif t == "tab":
                parts.append("\t")
            elif t in ("br", "cr"):
                parts.append("\n")
        text = "".join(parts).strip()
        if not text:
            return ""
        m = re.match(r"(?i)heading\s*(\d)", style)
        if m:
            return "#" * (int(m.group(1)) + 1) + " " + text
        if style.lower() == "title":
            return "## " + text
        return ("- " if bullet else "") + text

    def block(parent):
        for el in parent:
            t = L(el.tag)
            if t == "p":
                out.append(para(el))
                out.append("")
            elif t == "tbl":
                for tr in (e for e in el if L(e.tag) == "tr"):
                    out.append(row([" ".join(filter(None, (para(p) for p in tc.iter()
                                                           if L(p.tag) == "p")))
                                    for tc in tr if L(tc.tag) == "tc"]))
                out.append("")
            elif t in ("sdt", "sdtContent", "body"):
                block(el)

    block(root)
    return "\n".join(out)


def pptx_text(path):
    out = []
    with zipfile.ZipFile(path) as z:
        num = lambda n: int(re.search(r"(\d+)\.xml$", n).group(1))
        slides = sorted((n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)),
                        key=num)
        for name in slides:
            n = num(name)
            out.append("## Slide %d" % n)
            for kind, part in (("", name), ("Notes: ", "ppt/notesSlides/notesSlide%d.xml" % n)):
                if part not in z.namelist():
                    continue
                for p in ET.fromstring(z.read(part)).iter():
                    if L(p.tag) == "p":
                        text = "".join(t.text or "" for t in p.iter() if L(t.tag) == "t").strip()
                        if text and not (kind and text.isdigit()):
                            out.append(kind + text)
            out.append("")
    return "\n".join(out)


def col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref.upper()).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def xlsx_text(path):
    out = []
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        shared = []
        if "xl/sharedStrings.xml" in names:
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")):
                shared.append("".join(t.text or "" for t in si.iter() if L(t.tag) == "t"))
        rels = {}
        if "xl/_rels/workbook.xml.rels" in names:
            for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels")):
                rels[r.attrib.get("Id")] = r.attrib.get("Target", "").lstrip("/")
        sheets = []
        for s in ET.fromstring(z.read("xl/workbook.xml")).iter():
            if L(s.tag) == "sheet":
                target = rels.get(attr(s, "id"), "")
                target = target if target.startswith("xl/") else "xl/" + target
                sheets.append((s.attrib.get("name", "Sheet"), target))
        for title, part in sheets:
            if part not in names:
                continue
            rows = []
            for r in ET.fromstring(z.read(part)).iter():
                if L(r.tag) != "row":
                    continue
                cells = []
                for c in r:
                    if L(c.tag) != "c":
                        continue
                    kind = c.attrib.get("t")
                    v = next((x.text or "" for x in c if L(x.tag) == "v"), "")
                    if kind == "s" and v.isdigit() and int(v) < len(shared):
                        v = shared[int(v)]
                    elif kind == "inlineStr":
                        v = "".join(t.text or "" for t in c.iter() if L(t.tag) == "t")
                    i = col_index(c.attrib["r"]) if c.attrib.get("r") else len(cells)
                    cells.extend([""] * (i + 1 - len(cells)))
                    cells[i] = v
                if any(x.strip() for x in cells):
                    rows.append(cells)
            out.append("## Sheet: %s (%d rows)" % (title, len(rows)))
            out.extend(row(r) for r in rows)
            out.append("")
    return "\n".join(out)


class HtmlText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        elif re.fullmatch(r"h[1-6]", tag):
            self.out.append("\n\n" + "#" * (int(tag[1]) + 1) + " ")
        elif tag in ("p", "div", "tr", "br", "table", "ul", "ol", "pre"):
            self.out.append("\n")
        elif tag == "li":
            self.out.append("\n- ")
        elif tag in ("td", "th"):
            self.out.append(" | ")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
        elif re.fullmatch(r"h[1-6]", tag) or tag in ("p", "table"):
            self.out.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.out.append(re.sub(r"\s+", " ", data))


def html_text(html):
    p = HtmlText()
    p.feed(html or "")
    return "\n".join(l.strip() for l in "".join(p.out).split("\n"))


def convert(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".docx":
        return docx_text(path)
    if ext == ".pptx":
        return pptx_text(path)
    if ext in (".xlsx", ".xlsm"):
        return xlsx_text(path)
    if ext in (".html", ".htm"):
        with open(path, encoding="utf-8", errors="replace") as f:
            return html_text(f.read())
    if ext == ".pdf":
        if not shutil.which("pdftotext"):
            raise ValueError("PDF needs the pdftotext program, which is not installed. "
                             "Save the PDF as Word or text and add that instead")
        r = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True)
        if r.returncode:
            raise ValueError("pdftotext failed: " + r.stderr.strip()[:200])
        return r.stdout.replace("\f", "\n\n## Page break\n\n")
    if ext in TEXT_EXT:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    if ext in (".doc", ".xls", ".ppt"):
        raise ValueError("old binary Office format. Save it as %sx and add that" % ext)
    raise ValueError("unsupported file type " + (ext or "(none)"))


def cmd_add(a):
    paths = []
    for p in a.paths:
        if os.path.isdir(p):
            for base, dirs, files in os.walk(p):
                dirs[:] = sorted(d for d in dirs if not d.startswith("."))
                paths += [os.path.join(base, f) for f in sorted(files) if not f.startswith((".", "~$"))]
        elif os.path.isfile(p):
            paths.append(p)
        else:
            print("SKIPPED  %s: not found" % p)
    done = 0
    for p in paths:
        try:
            text = convert(p)
        except (ValueError, zipfile.BadZipFile, ET.ParseError, KeyError) as e:
            print("SKIPPED  %s: %s" % (p, e))
            continue
        out = store(slug(os.path.basename(p)), os.path.basename(p), p, text)
        print("READ     %s -> %s (%d lines)" % (p, out, text.count("\n") + 1))
        done += 1
    print("\n%d of %d read. Sections: mos_sources.py toc" % (done, len(paths)))


# ---------------------------------------------------------------- Jira and Confluence

def auth_header(token_var):
    token = os.environ.get(token_var)
    if not token:
        die("set %s in the environment (a personal access token). It is read from there "
            "and never stored." % token_var)
    email = os.environ.get("ATLASSIAN_EMAIL")
    if email:
        return "Basic " + base64.b64encode(("%s:%s" % (email, token)).encode()).decode()
    return "Bearer " + token


def get(base, path, auth, **params):
    url = base.rstrip("/") + path
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    req = urllib.request.Request(url, headers={"Authorization": auth, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def first_working(calls):
    """Try each endpoint shape in turn; servers and cloud differ, and versions get retired."""
    last = None
    for call in calls:
        try:
            return call()
        except urllib.error.HTTPError as e:
            if e.code not in (404, 405, 410):
                die("the server answered %d for %s. 401 or 403 means the token or its "
                    "permissions; check ATLASSIAN_EMAIL is set for Cloud and unset for "
                    "Data Center." % (e.code, e.url.split("?")[0]))
            last = e
        except urllib.error.URLError as e:
            die("cannot reach the server: %s" % e.reason)
    die("no known endpoint answered (last: %d %s). Use the export path instead: export to "
        "Word, HTML or CSV and run mos_sources.py add." % (last.code, last.url.split("?")[0]))


def plain(v):
    """Jira text fields: a string on Data Center and API v2, a document tree on Cloud v3."""
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        own = v.get("text", "")
        kids = "".join(plain(c) for c in v.get("content", []))
        return own + kids + ("\n" if v.get("type") in ("paragraph", "heading", "listItem") else "")
    return ""


def jira_keys(base, auth, jql, limit):
    def server():
        keys, start = [], 0
        while len(keys) < limit:
            d = get(base, "/rest/api/2/search", auth, jql=jql, fields="key", maxResults=50,
                    startAt=start)
            keys += [i["key"] for i in d.get("issues", [])]
            start += 50
            if not d.get("issues") or start >= d.get("total", 0):
                break
        return keys

    def cloud():
        keys, token = [], None
        while len(keys) < limit:
            d = get(base, "/rest/api/3/search/jql", auth, jql=jql, fields="key", maxResults=50,
                    nextPageToken=token)
            keys += [i["key"] for i in d.get("issues", [])]
            token = d.get("nextPageToken")
            if not token or not d.get("issues"):
                break
        return keys

    order = [cloud, server] if "atlassian.net" in base else [server, cloud]
    return first_working(order)[:limit]


def cmd_jira(a):
    auth = auth_header("JIRA_TOKEN")
    keys = a.keys or jira_keys(a.base, auth, a.jql, a.limit)
    fields = "summary,status,issuetype,priority,labels,components,created,resolutiondate," \
             "description,comment,issuelinks,parent"
    for key in keys:
        d = first_working([lambda: get(a.base, "/rest/api/2/issue/" + key, auth, fields=fields),
                           lambda: get(a.base, "/rest/api/3/issue/" + key, auth, fields=fields)])
        f = d.get("fields", {})
        name = lambda x: (f.get(x) or {}).get("name", "")
        meta = [("Type", name("issuetype")), ("Status", name("status")),
                ("Priority", name("priority")), ("Labels", ", ".join(f.get("labels") or [])),
                ("Components", ", ".join(c.get("name", "") for c in f.get("components") or [])),
                ("Created", (f.get("created") or "")[:10]),
                ("Resolved", (f.get("resolutiondate") or "")[:10])]
        out = [" | ".join("%s: %s" % kv for kv in meta if kv[1]), ""]
        links = []
        for l in f.get("issuelinks") or []:
            for side, verb in (("outwardIssue", "outward"), ("inwardIssue", "inward")):
                if l.get(side):
                    links.append("%s %s" % ((l.get("type") or {}).get(verb, "relates to"),
                                            l[side].get("key")))
        if links:
            out += ["Links: " + "; ".join(links), ""]
        out += ["## Description", plain(f.get("description")) or "(none)", "", "## Comments"]
        for c in (f.get("comment") or {}).get("comments", []):
            out += ["### %s" % (c.get("created") or "")[:10], plain(c.get("body")), ""]
        title = "%s: %s" % (key, f.get("summary", ""))
        print("READ     %s -> %s" % (key, store("jira-" + slug(key), title,
                                                "%s/browse/%s" % (a.base.rstrip("/"), key),
                                                "\n".join(out))))
    print("\n%d issues read." % len(keys))


def cmd_confluence(a):
    auth = auth_header("CONFLUENCE_TOKEN")
    queue = [(i, 0) for i in (a.page_id or [])]
    if a.cql:
        d = first_working([lambda: get(a.base, "/rest/api/content/search", auth, cql=a.cql,
                                       limit=min(a.limit, 100))])
        queue += [(r["id"], 0) for r in d.get("results", [])]
    seen = set()
    while queue and len(seen) < a.limit:
        pid, depth = queue.pop(0)
        if pid in seen:
            continue
        seen.add(pid)
        d = first_working([
            lambda: get(a.base, "/rest/api/content/%s" % pid, auth, expand="body.storage,version"),
            lambda: get(a.base, "/api/v2/pages/%s" % pid, auth, **{"body-format": "storage"})])
        html = ((d.get("body") or {}).get("storage") or {}).get("value", "")
        title = d.get("title", "page " + str(pid))
        print("READ     %s -> %s" % (title, store(
            "confluence-%s-%s" % (pid, slug(title)[:50]), title,
            "%s (page id %s)" % (a.base.rstrip("/"), pid), html_text(html))))
        if depth < a.depth:
            kids = first_working([
                lambda: get(a.base, "/rest/api/content/%s/child/page" % pid, auth, limit=100),
                lambda: get(a.base, "/api/v2/pages/%s/children" % pid, auth, limit=100)])
            queue += [(k["id"], depth + 1) for k in kids.get("results", [])]
    print("\n%d pages read." % len(seen))


# ---------------------------------------------------------------- reading what was gathered

def load_index():
    try:
        with open(os.path.join(SRC, "index.json"), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        die("no sources yet. Add some with: mos_sources.py add <file or folder>")


def cmd_toc(a):
    for name, e in sorted(load_index().items()):
        print("\n%s.md  (%d lines)  %s" % (os.path.join(SRC, name), e["lines"], e["title"]))
        for s in e["sections"][1:a.sections + 1]:
            print("   line %-6d %s" % (s["line"], s["title"][:90]))
        if len(e["sections"]) - 1 > a.sections:
            print("   ... %d more sections" % (len(e["sections"]) - 1 - a.sections))


def cmd_find(a):
    words = [w.lower() for w in a.words]
    hits = 0
    for name in sorted(load_index()):
        path = os.path.join(SRC, name + ".md")
        with open(path, encoding="utf-8") as f:
            for n, line in enumerate(f, 1):
                low = line.lower()
                if all(w in low for w in words):
                    print("%s:%d: %s" % (path, n, line.strip()[:160]))
                    hits += 1
                    if hits >= a.max:
                        print("... stopped at %d hits. Narrow the words." % a.max)
                        return
    print("%d hits." % hits)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="mos_sources.py", description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="command", required=True)
    p = sub.add_parser("add")
    p.add_argument("paths", nargs="+")
    p.set_defaults(fn=cmd_add)
    p = sub.add_parser("jira")
    p.add_argument("--base", required=True, help="for example https://jira.yourcompany.example")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--jql")
    g.add_argument("--keys", nargs="+")
    p.add_argument("--limit", type=int, default=200)
    p.set_defaults(fn=cmd_jira)
    p = sub.add_parser("confluence")
    p.add_argument("--base", required=True, help="Cloud: include /wiki at the end")
    p.add_argument("--page-id", nargs="+")
    p.add_argument("--cql")
    p.add_argument("--depth", type=int, default=0, help="also read child pages, this many levels")
    p.add_argument("--limit", type=int, default=200)
    p.set_defaults(fn=cmd_confluence)
    p = sub.add_parser("toc")
    p.add_argument("--sections", type=int, default=12)
    p.set_defaults(fn=cmd_toc)
    p = sub.add_parser("find")
    p.add_argument("words", nargs="+")
    p.add_argument("--max", type=int, default=60)
    p.set_defaults(fn=cmd_find)
    a = ap.parse_args(argv)
    if a.command == "confluence" and not (a.page_id or a.cql):
        die("give --page-id or --cql.")
    os.chdir(a.root)
    a.fn(a)


if __name__ == "__main__":
    main()
