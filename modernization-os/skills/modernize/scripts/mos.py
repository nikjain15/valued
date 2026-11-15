#!/usr/bin/env python3
"""mos.py: the deterministic half of the Modernization OS.

Agents read code and write code. This tool counts, maps, ranks, runs the tests and
guards the gates, so no model can mark its own work as done. Standard library only,
Python 3.8+. Everything it writes goes under ./modernization/.

  mos.py init                          create the workspace
  mos.py inventory                     languages, size, build manifests
  mos.py graph                         dependency graph, cycles, dead-code candidates
  mos.py rank [--top N]                hotspots by complexity, fan-in, churn, impact
  mos.py target --stack S --strategy S --by NAME   the owner's framing decisions
  mos.py slice add ID --title T --files F [F ...]
  mos.py baseline ID -- <test command>     tests must pass on the legacy code
  mos.py transformed ID [--files F ...]    the slice's code has changed
  mos.py verify ID [--reason R -- <cmd>]   reruns the baseline command
  mos.py secure ID                         checks evidence/ID/security.json, reruns tests
  mos.py document ID                       checks docs/ID.md
  mos.py approve ID --by NAME              a named person signs the slice off
  mos.py decide "what" --by NAME           record a decision
  mos.py status | check
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time

WS = "modernization"
SKIP_DIRS = {"node_modules", "vendor", "dist", "build", "target", "venv", "__pycache__",
             "bin", "obj", "out", WS}
LANGS = {
    ".py": "Python", ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".jsx": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript", ".java": "Java",
    ".kt": "Kotlin", ".scala": "Scala", ".cs": "C#", ".vb": "Visual Basic", ".go": "Go",
    ".rb": "Ruby", ".php": "PHP", ".c": "C", ".h": "C/C++ header", ".cc": "C++",
    ".cpp": "C++", ".hpp": "C/C++ header", ".cbl": "COBOL", ".cob": "COBOL",
    ".cpy": "COBOL copybook", ".jcl": "JCL", ".pli": "PL/I", ".rpg": "RPG",
    ".rpgle": "RPG", ".f": "Fortran", ".f90": "Fortran", ".pl": "Perl", ".pm": "Perl",
    ".sql": "SQL", ".sh": "Shell", ".rs": "Rust", ".swift": "Swift", ".m": "Objective-C",
    ".pas": "Pascal", ".asp": "Classic ASP", ".jsp": "JSP", ".cfm": "ColdFusion",
}
MANIFESTS = {
    "package.json": "npm", "pom.xml": "Maven", "build.gradle": "Gradle",
    "build.gradle.kts": "Gradle", "requirements.txt": "pip", "pyproject.toml": "Python",
    "setup.py": "Python", "Pipfile": "Pipenv", "go.mod": "Go modules", "Gemfile": "Bundler",
    "composer.json": "Composer", "Cargo.toml": "Cargo", "Makefile": "Make",
    "CMakeLists.txt": "CMake", "build.xml": "Ant", "packages.config": "NuGet",
    "Dockerfile": "Docker", "Jenkinsfile": "Jenkins", ".gitlab-ci.yml": "GitLab CI",
}
MANIFEST_EXT = {".csproj": "MSBuild", ".vbproj": "MSBuild", ".sln": "Visual Studio"}
ORDER = ["planned", "baselined", "transformed", "verified", "secured", "documented", "approved"]
BRANCH = re.compile(
    r"\b(if|elif|else\s+if|for|foreach|while|case|when|catch|except|switch|EVALUATE|"
    r"PERFORM|GO\s+TO|goto)\b|&&|\|\|", re.I)
ENTRY_NAMES = {"main", "index", "app", "__init__", "__main__", "setup", "manage",
               "conftest", "program", "server", "cli"}
ENTRY_MARK = re.compile(
    r'__name__\s*==\s*[\'"]__main__|static\s+void\s+main|func\s+main\s*\(|'
    r"int\s+main\s*\(|static\s+(?:async\s+)?\w+\s+Main\s*\(")


def die(msg):
    print("BLOCKED: " + msg, file=sys.stderr)
    sys.exit(1)


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def wpath(*parts):
    return os.path.join(WS, *parts)


def save(name, data):
    path = wpath(name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, sort_keys=True)
        f.write("\n")


def load(name, default=None):
    try:
        with open(wpath(name), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        if default is not None:
            return default
        die("%s not found. Run the earlier step first (start with: mos.py init)." % wpath(name))


def read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return ""


def sha(path):
    try:
        with open(path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except OSError:
        return None


def walk():
    """Yield repo-relative posix paths of source and manifest files."""
    for base, dirs, files in os.walk("."):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and not d.startswith("."))
        for name in sorted(files):
            yield os.path.relpath(os.path.join(base, name), ".").replace(os.sep, "/")


def table(rows, head):
    rows = [[str(c) for c in r] for r in rows]
    widths = [max(len(h), *(len(r[i]) for r in rows)) if rows else len(h)
              for i, h in enumerate(head)]
    line = lambda r: "| " + " | ".join(c.ljust(w) for c, w in zip(r, widths)) + " |"
    print(line(head))
    print("|" + "|".join("-" * (w + 2) for w in widths) + "|")
    for r in rows:
        print(line(r))


# ---------------------------------------------------------------- workspace

def cmd_init(a):
    if os.path.exists(wpath("state.json")):
        print("Workspace exists: %s (left untouched)" % wpath("state.json"))
        return
    save("state.json", {
        "version": 1, "created": now(),
        "target": {"stack": "", "strategy": "", "regimes": []},
        "slices": {}, "decisions": [],
    })
    for d in ("evidence", "docs"):
        os.makedirs(wpath(d), exist_ok=True)
    print("Created %s/. Next: mos.py inventory" % WS)


# ---------------------------------------------------------------- inventory

def cmd_inventory(a):
    langs, manifests, files = {}, [], []
    for p in walk():
        name = os.path.basename(p)
        ext = os.path.splitext(name)[1].lower()
        if name in MANIFESTS:
            manifests.append({"path": p, "tool": MANIFESTS[name]})
        elif ext in MANIFEST_EXT:
            manifests.append({"path": p, "tool": MANIFEST_EXT[ext]})
        lang = LANGS.get(ext)
        if not lang:
            continue
        loc = sum(1 for line in read(p).splitlines() if line.strip())
        files.append({"path": p, "lang": lang, "loc": loc})
        e = langs.setdefault(lang, {"files": 0, "loc": 0})
        e["files"] += 1
        e["loc"] += loc
    save("inventory.json", {"at": now(), "languages": langs, "manifests": manifests,
                            "files": files})
    table([[k, v["files"], v["loc"]] for k, v in
           sorted(langs.items(), key=lambda kv: -kv[1]["loc"])][:12],
          ["Language", "Files", "Lines"])
    print("\nBuild and delivery files: " +
          (", ".join(sorted({m["tool"] for m in manifests})) or "none found"))
    print("Wrote %s" % wpath("inventory.json"))


# ---------------------------------------------------------------- graph

PY_FROM = re.compile(r"^\s*from\s+(\.*)([\w.]*)\s+import\s+(.+)$", re.M)
PY_IMP = re.compile(r"^\s*import\s+([\w., ]+)$", re.M)
JS_IMP = re.compile(r"""(?:from\s+|require\(\s*|import\(\s*|^\s*import\s+)['"]([^'"]+)['"]""", re.M)
JVM_IMP = re.compile(r"^\s*import\s+(?:static\s+)?([\w.]+)", re.M)
C_INC = re.compile(r'^\s*#\s*include\s+"([^"]+)"', re.M)
COB_COPY = re.compile(r"\bCOPY\s+['\"]?([\w-]+)", re.I)
COB_CALL = re.compile(r"\bCALL\s+['\"]([\w-]+)['\"]", re.I)
GO_IMP = re.compile(r'"([\w./-]+)"')
RB_REQ = re.compile(r"""^\s*require_relative\s+['"]([^'"]+)['"]""", re.M)
PHP_INC = re.compile(r"""\b(?:require|include)(?:_once)?\s*\(?\s*(?:__DIR__\s*\.\s*)?['"]/?([^'"]+)['"]""")
JS_EXT = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"]


def norm(p):
    return os.path.normpath(p).replace(os.sep, "/")


def deps_of(path, text, fileset, index, gomod):
    ext = os.path.splitext(path)[1].lower()
    here = os.path.dirname(path)
    out = set()

    def first(cands):
        for c in cands:
            c = norm(c)
            if c in fileset and c != path:
                out.add(c)
                return True
        return False

    if ext == ".py":
        def mod(base, dotted):
            rel = dotted.replace(".", "/")
            return first([os.path.join(base, rel + ".py"),
                          os.path.join(base, rel, "__init__.py")])
        for dots, module, names in PY_FROM.findall(text):
            names = [n.strip().split(" ")[0] for n in names.strip("() ").split(",")]
            if dots:
                base = here
                for _ in range(len(dots) - 1):
                    base = os.path.dirname(base)
                bases = [base]
            else:
                bases = ["", "src", here]
            for b in bases:
                hit = bool(module) and mod(b, module)
                for n in names:
                    if n and n != "*":
                        hit = mod(b, (module + "." if module else "") + n) or hit
                if hit:
                    break
        for group in PY_IMP.findall(text):
            for m in group.split(","):
                m = m.strip().split(" ")[0]
                if m:
                    any(mod(b, m) for b in ["", "src", here])
    elif ext in JS_EXT:
        for spec in JS_IMP.findall(text):
            if spec.startswith("."):
                t = os.path.join(here, spec)
                first([t] + [t + e for e in JS_EXT] +
                      [os.path.join(t, "index" + e) for e in JS_EXT])
    elif ext in (".java", ".kt", ".scala"):
        for fq in JVM_IMP.findall(text):
            parts = fq.split(".")
            for n in (len(parts), len(parts) - 1):  # class, or a member of the class
                for hit in index["suffix"].get("/".join(parts[:n]), []):
                    if hit != path:
                        out.add(hit)
    elif ext in (".c", ".h", ".cc", ".cpp", ".hpp"):
        for inc in C_INC.findall(text):
            if not first([os.path.join(here, inc), inc]):
                for hit in index["base"].get(os.path.basename(inc).lower(), []):
                    out.add(hit)
    elif ext in (".cbl", ".cob", ".cpy"):
        for name in COB_COPY.findall(text) + COB_CALL.findall(text):
            for hit in index["stem"].get(name.lower(), []):
                if hit != path and os.path.splitext(hit)[1].lower() in (".cbl", ".cob", ".cpy"):
                    out.add(hit)
    elif ext == ".go" and gomod:
        for imp in GO_IMP.findall(text):
            if imp == gomod or imp.startswith(gomod + "/"):
                d = imp[len(gomod):].strip("/")
                for f in index["dir"].get(d, []):
                    if f.endswith(".go") and not f.endswith("_test.go") and f != path:
                        out.add(f)
    elif ext == ".rb":
        for spec in RB_REQ.findall(text):
            first([os.path.join(here, spec + ".rb"), os.path.join(here, spec)])
    elif ext == ".php":
        for spec in PHP_INC.findall(text):
            first([os.path.join(here, spec), spec])
    return out


def sccs(nodes, edges):
    """Iterative Tarjan. Returns strongly connected components of size > 1."""
    idx, low, on, stack, out, counter = {}, {}, set(), [], [], [0]
    for root in nodes:
        if root in idx:
            continue
        work = [(root, iter(edges.get(root, ())))]
        idx[root] = low[root] = counter[0]
        counter[0] += 1
        stack.append(root)
        on.add(root)
        while work:
            v, it = work[-1]
            advanced = False
            for w in it:
                if w not in idx:
                    idx[w] = low[w] = counter[0]
                    counter[0] += 1
                    stack.append(w)
                    on.add(w)
                    work.append((w, iter(edges.get(w, ()))))
                    advanced = True
                    break
                if w in on:
                    low[v] = min(low[v], idx[w])
            if advanced:
                continue
            work.pop()
            if work:
                low[work[-1][0]] = min(low[work[-1][0]], low[v])
            if low[v] == idx[v]:
                comp = []
                while True:
                    w = stack.pop()
                    on.discard(w)
                    comp.append(w)
                    if w == v:
                        break
                if len(comp) > 1:
                    out.append(sorted(comp))
    return out


def is_entry(path, text):
    stem = os.path.splitext(os.path.basename(path))[0].lower()
    return (stem in ENTRY_NAMES or "test" in path.lower() or "spec" in stem
            or bool(ENTRY_MARK.search(text)))


def cmd_graph(a):
    inv = load("inventory.json")
    files = [f["path"] for f in inv["files"]]
    fileset = set(files)
    index = {"suffix": {}, "base": {}, "stem": {}, "dir": {}}
    for p in files:
        noext = os.path.splitext(p)[0]
        parts = noext.split("/")
        for i in range(len(parts)):
            index["suffix"].setdefault("/".join(parts[i:]), []).append(p)
        index["base"].setdefault(os.path.basename(p).lower(), []).append(p)
        index["stem"].setdefault(parts[-1].lower(), []).append(p)
        index["dir"].setdefault(os.path.dirname(p), []).append(p)
    m = re.search(r"^module\s+(\S+)", read("go.mod"), re.M)
    gomod = m.group(1) if m else None

    edges, entries = {}, set()
    for p in files:
        text = read(p)
        edges[p] = sorted(deps_of(p, text, fileset, index, gomod))
        if is_entry(p, text):
            entries.add(p)
    # Edges the agent found by reading (languages or dynamic calls the regexes miss).
    extra = load("graph.extra.json", default=[])
    for src, dst in extra:
        if src in fileset and dst in fileset and dst not in edges[src]:
            edges[src] = sorted(edges[src] + [dst])

    fan_in = {p: 0 for p in files}
    for p, ds in edges.items():
        for d in ds:
            fan_in[d] += 1
    cycles = sccs(files, edges)
    dead = sorted(p for p in files if fan_in[p] == 0 and p not in entries
                  and not p.endswith((".sql", ".sh", ".jcl")))
    save("graph.json", {
        "at": now(), "edges": edges, "fan_in": fan_in,
        "fan_out": {p: len(ds) for p, ds in edges.items()},
        "cycles": cycles, "dead_code_candidates": dead, "extra_edges": len(extra),
    })
    n_edges = sum(len(d) for d in edges.values())
    table([["Files", len(files)], ["Dependencies", n_edges], ["Cycles", len(cycles)],
           ["Dead-code candidates (confirm before deleting)", len(dead)]],
          ["Measure", "Count"])
    print("Wrote %s" % wpath("graph.json"))


# ---------------------------------------------------------------- rank

def churn():
    try:
        r = subprocess.run(["git", "log", "--since=3.years", "--name-only", "--pretty=format:"],
                           capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.SubprocessError):
        return {}
    counts = {}
    if r.returncode == 0:
        for line in r.stdout.splitlines():
            if line.strip():
                counts[line.strip()] = counts.get(line.strip(), 0) + 1
    return counts


def cmd_rank(a):
    inv, g = load("inventory.json"), load("graph.json")
    # impact.json is the client's call: {"path/prefix": 1..5}. Longest prefix wins. Default 3.
    impact = load("impact.json", default={})
    ch = churn()
    rows = []
    for f in inv["files"]:
        p = f["path"]
        w = 3
        for prefix in sorted(impact, key=len):
            if p.startswith(prefix):
                w = impact[prefix]
        rows.append({"path": p, "loc": f["loc"], "complexity": len(BRANCH.findall(read(p))),
                     "fan_in": g["fan_in"].get(p, 0), "fan_out": g["fan_out"].get(p, 0),
                     "churn": ch.get(p, 0), "impact": w})
    mx = {k: max([r[k] for r in rows] + [1]) for k in ("loc", "complexity", "fan_in", "churn")}
    for r in rows:
        tech = (0.35 * r["complexity"] / mx["complexity"] + 0.25 * r["fan_in"] / mx["fan_in"]
                + 0.25 * r["churn"] / mx["churn"] + 0.15 * r["loc"] / mx["loc"])
        r["score"] = round(100 * tech * r["impact"] / 3, 1)
        r["leaf"] = r["fan_out"] == 0
    rows.sort(key=lambda r: (-r["score"], r["path"]))
    save("hotspots.json", {
        "at": now(), "impact_set_by_client": bool(impact), "git_history": bool(ch),
        "weights": {"complexity": 0.35, "fan_in": 0.25, "churn": 0.25, "loc": 0.15},
        "files": rows})
    table([[r["path"], r["score"], r["complexity"], r["fan_in"], r["churn"], r["loc"],
            r["impact"], "yes" if r["leaf"] else ""] for r in rows[:a.top]],
          ["File", "Score", "Branches", "Used by", "Changes 3y", "Lines", "Impact", "Leaf"])
    if not impact:
        print("\nImpact is 3 for every file (assumed). The client sets it in %s."
              % wpath("impact.json"))
    print("Wrote %s" % wpath("hotspots.json"))


# ---------------------------------------------------------------- slices and gates

def get_slice(state, sid):
    if sid not in state["slices"]:
        die("no slice %s. Add it with: mos.py slice add %s --title ... --files ..." % (sid, sid))
    return state["slices"][sid]


def need(s, sid, *allowed):
    if s["status"] not in allowed:
        die("slice %s is '%s'; this step needs '%s'. Gates run in order: %s."
            % (sid, s["status"], "' or '".join(allowed), " > ".join(ORDER)))


def move(state, s, status, by="mos"):
    s["status"] = status
    s["history"].append({"status": status, "at": now(), "by": by})
    save("state.json", state)


def run_cmd(sid, phase, cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    head = subprocess.run("git rev-parse HEAD", shell=True, capture_output=True, text=True)
    ev = {"phase": phase, "cmd": cmd, "exit": r.returncode, "at": now(),
          "git_head": head.stdout.strip() or None,
          "output_tail": (r.stdout + r.stderr)[-4000:]}
    save(os.path.join("evidence", sid, phase + ".json"), ev)
    return ev


def cmd_slice(a):
    state = load("state.json")
    if a.id in state["slices"]:
        die("slice %s already exists." % a.id)
    missing = [f for f in a.files if not os.path.isfile(f)]
    if missing:
        die("files not found: " + ", ".join(missing))
    state["slices"][a.id] = {"title": a.title, "files": [norm(f) for f in a.files],
                             "status": "planned",
                             "history": [{"status": "planned", "at": now(), "by": "mos"}]}
    save("state.json", state)
    print("Slice %s planned (%d files)." % (a.id, len(a.files)))


def cmd_baseline(a):
    state = load("state.json")
    s = get_slice(state, a.id)
    need(s, a.id, "planned", "baselined")
    cmd = " ".join(a.cmd)
    if not cmd:
        die("give the test command after --, for example: mos.py baseline %s -- pytest tests" % a.id)
    ev = run_cmd(a.id, "baseline", cmd)
    if ev["exit"] != 0:
        die("baseline tests failed (exit %d). They must pass on the legacy code before it "
            "changes. See %s" % (ev["exit"], wpath("evidence", a.id, "baseline.json")))
    s["baseline_cmd"] = cmd
    s["baseline_hashes"] = {f: sha(f) for f in s["files"]}
    move(state, s, "baselined")
    print("Slice %s baselined. Tests pass on the legacy code." % a.id)


def cmd_transformed(a):
    state = load("state.json")
    s = get_slice(state, a.id)
    need(s, a.id, "baselined")
    new = [norm(f) for f in (a.files or [])]
    missing = [f for f in new if not os.path.isfile(f)]
    if missing:
        die("new files not found: " + ", ".join(missing))
    changed = [f for f, h in s["baseline_hashes"].items() if sha(f) != h]
    if not changed and not new:
        die("nothing changed in slice %s since the baseline." % a.id)
    s["changed"], s["new_files"] = changed, new
    move(state, s, "transformed")
    print("Slice %s transformed (%d changed, %d new)." % (a.id, len(changed), len(new)))


def cmd_verify(a):
    state = load("state.json")
    s = get_slice(state, a.id)
    need(s, a.id, "transformed")
    cmd = " ".join(a.cmd) or s["baseline_cmd"]
    if cmd != s["baseline_cmd"]:
        if not a.reason:
            die("the verify command differs from the baseline command. Rerun without a "
                "command, or give --reason and have a person agree it.")
        state["decisions"].append({"at": now(), "who": "(to be confirmed by a person)",
                                   "what": "Slice %s verify command changed from '%s' to '%s': %s"
                                   % (a.id, s["baseline_cmd"], cmd, a.reason)})
        s["verify_cmd"] = cmd
    ev = run_cmd(a.id, "verify", cmd)
    if ev["exit"] != 0:
        save("state.json", state)
        die("tests fail on the transformed code (exit %d). Fix the code, not the tests. See %s"
            % (ev["exit"], wpath("evidence", a.id, "verify.json")))
    move(state, s, "verified")
    print("Slice %s verified. The baseline tests pass on the new code." % a.id)


def cmd_secure(a):
    state = load("state.json")
    s = get_slice(state, a.id)
    need(s, a.id, "verified")
    rel = os.path.join("evidence", a.id, "security.json")
    rep = load(rel, default={})
    if "findings" not in rep:
        die('%s missing. Write {"findings": [{"id", "severity", "title", "status", '
            '"accepted_by"}], "regulatory_patterns_kept": [...]}' % wpath(rel))
    for f in rep["findings"]:
        sev, st = str(f.get("severity", "")).lower(), str(f.get("status", "")).lower()
        if st not in ("fixed", "accepted", "open"):
            die("finding %s: status must be fixed, accepted or open." % f.get("id"))
        if st == "accepted" and not f.get("accepted_by"):
            die("finding %s is accepted but names no person in accepted_by." % f.get("id"))
        if st == "open" and sev in ("high", "critical"):
            die("finding %s (%s) is open. Fix it, or have a named person accept it."
                % (f.get("id"), sev))
    ev = run_cmd(a.id, "secure-retest", s.get("verify_cmd") or s["baseline_cmd"])
    if ev["exit"] != 0:
        die("tests fail after the security changes (exit %d)." % ev["exit"])
    move(state, s, "secured")
    print("Slice %s secured (%d findings on record, tests still pass)."
          % (a.id, len(rep["findings"])))


def cmd_document(a):
    state = load("state.json")
    s = get_slice(state, a.id)
    need(s, a.id, "secured")
    doc = wpath("docs", a.id + ".md")
    if len(read(doc).strip()) < 200:
        die("%s is missing or too thin to hand over." % doc)
    move(state, s, "documented")
    print("Slice %s documented." % a.id)


def cmd_approve(a):
    state = load("state.json")
    s = get_slice(state, a.id)
    need(s, a.id, "documented")
    state["decisions"].append({"at": now(), "who": a.by, "what": "Approved slice %s" % a.id})
    move(state, s, "approved", by=a.by)
    print("Slice %s approved by %s." % (a.id, a.by))


def cmd_decide(a):
    state = load("state.json")
    state["decisions"].append({"at": now(), "who": a.by, "what": a.what})
    save("state.json", state)
    print("Recorded.")


def cmd_target(a):
    state = load("state.json")
    state["target"].update({"stack": a.stack, "strategy": a.strategy,
                            "regimes": a.regimes or state["target"].get("regimes", [])})
    state["decisions"].append({"at": now(), "who": a.by, "what":
                               "Target stack: %s. Strategy: %s." % (a.stack, a.strategy)})
    save("state.json", state)
    print("Target recorded, decided by %s." % a.by)


def cmd_status(a):
    state = load("state.json")
    t = state["target"]
    print("Target stack: %s   Strategy: %s\n" % (t["stack"] or "(not set)",
                                                 t["strategy"] or "(not set)"))
    table([[sid, s["title"], len(s["files"]), s["status"], s["history"][-1]["at"]]
           for sid, s in sorted(state["slices"].items())] or [["-", "no slices yet", "", "", ""]],
          ["Slice", "Title", "Files", "Status", "Since"])
    print("\nDecisions on record: %d" % len(state["decisions"]))


def cmd_check(a):
    """Audit the workspace. Exit 1 on any problem, so CI can run it."""
    state, bad = load("state.json"), []
    for sid, s in sorted(state["slices"].items()):
        rank = ORDER.index(s["status"])
        ev = lambda phase: load(os.path.join("evidence", sid, phase + ".json"), default={})
        if rank >= 1 and ev("baseline").get("exit") != 0:
            bad.append("%s: no passing baseline evidence" % sid)
        if rank >= 3 and ev("verify").get("exit") != 0:
            bad.append("%s: no passing verify evidence" % sid)
        if rank >= 4 and ev("secure-retest").get("exit") != 0:
            bad.append("%s: no passing retest after security changes" % sid)
        if rank >= 5 and not read(wpath("docs", sid + ".md")).strip():
            bad.append("%s: no handover document" % sid)
        if rank >= 6 and s["history"][-1]["by"] in ("", "mos"):
            bad.append("%s: approved without a named person" % sid)
        seen = [h["status"] for h in s["history"]]
        if [x for x in ORDER[:rank + 1] if x not in seen]:
            bad.append("%s: a gate was skipped (history: %s)" % (sid, " > ".join(seen)))
    for d in state["decisions"]:
        if "to be confirmed" in d["who"]:
            bad.append("decision awaiting a person: " + d["what"])
    if bad:
        print("\n".join("FAIL  " + b for b in bad))
        sys.exit(1)
    print("OK  %d slices, %d decisions, every gate has its evidence."
          % (len(state["slices"]), len(state["decisions"])))


def main(argv=None):
    ap = argparse.ArgumentParser(prog="mos.py", description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".", help="repository root (default: current directory)")
    sub = ap.add_subparsers(dest="command", required=True)
    for name, fn in (("init", cmd_init), ("inventory", cmd_inventory), ("graph", cmd_graph),
                     ("status", cmd_status), ("check", cmd_check)):
        sub.add_parser(name).set_defaults(fn=fn)
    p = sub.add_parser("rank")
    p.add_argument("--top", type=int, default=12)
    p.set_defaults(fn=cmd_rank)
    p = sub.add_parser("target")
    p.add_argument("--stack", required=True)
    p.add_argument("--strategy", required=True)
    p.add_argument("--regimes", nargs="*", help="regulations and controls that apply")
    p.add_argument("--by", required=True)
    p.set_defaults(fn=cmd_target)
    p = sub.add_parser("slice")
    p.add_argument("action", choices=["add"])
    p.add_argument("id")
    p.add_argument("--title", required=True)
    p.add_argument("--files", nargs="+", required=True)
    p.set_defaults(fn=cmd_slice)
    p = sub.add_parser("baseline")
    p.add_argument("id")
    p.set_defaults(fn=cmd_baseline)
    p = sub.add_parser("transformed")
    p.add_argument("id")
    p.add_argument("--files", nargs="*")
    p.set_defaults(fn=cmd_transformed)
    p = sub.add_parser("verify")
    p.add_argument("id")
    p.add_argument("--reason")
    p.set_defaults(fn=cmd_verify)
    for name, fn in (("secure", cmd_secure), ("document", cmd_document)):
        p = sub.add_parser(name)
        p.add_argument("id")
        p.set_defaults(fn=fn)
    p = sub.add_parser("approve")
    p.add_argument("id")
    p.add_argument("--by", required=True)
    p.set_defaults(fn=cmd_approve)
    p = sub.add_parser("decide")
    p.add_argument("what")
    p.add_argument("--by", required=True)
    p.set_defaults(fn=cmd_decide)
    argv = list(sys.argv[1:] if argv is None else argv)
    cmd = []
    if "--" in argv:  # everything after -- is the test command, passed through untouched
        cut = argv.index("--")
        argv, cmd = argv[:cut], argv[cut + 1:]
    a = ap.parse_args(argv)
    a.cmd = cmd
    os.chdir(a.root)
    a.fn(a)


if __name__ == "__main__":
    main()
