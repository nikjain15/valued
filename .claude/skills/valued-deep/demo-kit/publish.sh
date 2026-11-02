#!/bin/bash
# Builds the public copy of a deep-path demo from its private prototype folder (P-008, learned on UC2 D128).
# Stage 1 copies the prototype without its private files into a staging folder; optional case edits run there;
# the gate then fails on any real name, private link or tagged audio; stage 2 syncs the stage into the public
# repo folder and never touches its .git. Never edit the public folder by hand; rerun this instead.
# Usage: publish.sh [target dir]. Fill in the case block below first.
set -euo pipefail

# ---- Case block: the only part a case changes ----
OUT="$(cd "$(dirname "$0")" && pwd)"            # where this script lives (the case's out/)
SRC="$OUT/<case>-proto"                          # private prototype folder (its own private repo)
DST="${1:-$OUT/<case>-public}"                   # public repo folder (its own fresh-history repo)
PUBLIC_URL="https://<user>.github.io/<Repo>/"    # Pages URLs are case-sensitive
# Private files and folders: briefs, thinking pages, retired pages, screenshots, anything naming the real client
PRIVATE=(brief.html thinking.html thinking-data.js shots)
# Real names that must never appear in the public copy: the client, employers, vendors, models
REAL='<client>|<employer>|elevenlabs|anthropic|openai|claude|gemini|chatgpt|google|microsoft|amazon|\baws\b'
# Names allowed as cited sources (a regulator, an agency): reported, never blocking
ALLOWED='\bcms\b|\bgao\b'
# Optional: a python file of case edits run on the stage (strip nav links to private pages, retitle sections)
EDITS="$OUT/<case>-publish-edits.py"
# ---------------------------------------------------

STAGE="$OUT/.publish-stage"
mkdir -p "$DST" "$STAGE"
EX=(--exclude .git); for p in "${PRIVATE[@]}"; do EX+=(--exclude "$p"); done
# --delete-excluded is safe here only because the target is the stage, never the public repo (it deleted .git once)
rsync -a --delete --delete-excluded "${EX[@]}" "$SRC"/ "$STAGE"/
[ -f "$EDITS" ] && python3 "$EDITS" "$STAGE"
# Private files match by name, private folders only as a path ("shots/"), so prose like "flu shots" passes
RETIRED=""; for p in "${PRIVATE[@]}"; do [[ $p == *.* ]] || p="$p/"; RETIRED+="${RETIRED:+|}${p//./\\.}"; done
python3 - "$STAGE" "$SRC" "$REAL" "$ALLOWED" "$RETIRED" "$PUBLIC_URL" <<'EOF'
import datetime, os, re, subprocess, sys
d, src, real, allowed, retired, url = sys.argv[1:7]
def edit(p, fn):
    t = open(p, encoding="utf-8").read(); n = fn(t)
    if n != t: open(p, "w", encoding="utf-8").write(n)
readme = os.path.join(d, "README.md")
if os.path.exists(readme): edit(readme, lambda t: re.sub(r"Live: \S+", "Live: " + url, t))
# One cache-bust stamp on every ?v= so the public copy never serves a stale script
stamp = subprocess.run(["git", "-C", src, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip() or datetime.date.today().isoformat()
pat, ok, gone = re.compile(real, re.I), re.compile(allowed, re.I), re.compile(r"(?<![\w-])(" + retired + ")", re.I)
bad, warn = [], []
for root, dirs, fs in os.walk(d):
    for name in dirs + fs:
        if pat.search(name): bad.append(f"{os.path.join(root, name)}: real name in a file or folder name")
    for f in fs:
        p = os.path.join(root, f)
        if f.endswith(".html"): edit(p, lambda t: re.sub(r"\?v=[\w-]+", "?v=" + stamp, t))
        if f.lower().endswith((".mp3", ".m4a", ".wav")):
            try: meta = subprocess.run(["ffprobe", "-v", "quiet", "-show_format", p], capture_output=True, text=True).stdout
            except FileNotFoundError: meta = subprocess.run(["strings", p], capture_output=True, text=True).stdout[:4000]
            meta = "\n".join(l for l in meta.splitlines() if not l.startswith("filename="))
            bad += [f"{p}: audio tag {meta[max(0, m.start() - 30):m.end() + 30]!r}" for m in pat.finditer(meta)]
            continue
        try: t = open(p, encoding="utf-8").read()
        except Exception: continue
        for m in gone.finditer(t): bad.append(f"{p}:{t[:m.start()].count(chr(10)) + 1}: link to a private page {m.group(0)!r}")
        for m in pat.finditer(t):
            ctx = t[max(0, m.start() - 40):m.end() + 40]
            if "fonts.googleapis" not in ctx: bad.append(f"{p}: {ctx!r}")
        for m in ok.finditer(t): warn.append(f"{p}: allowed source named {t[max(0, m.start() - 30):m.end() + 30]!r}")
print("Stamp:", stamp)
if warn: print("Allowed names (not blocking):"); print("\n".join(warn[:20]))
if bad: print("\n".join(bad)); sys.exit(1)
print("Clean:", d)
EOF
# Stage 2: sync into the public repo, protecting its .git
rsync -a --delete --exclude .git "$STAGE"/ "$DST"/
echo "Synced to $DST. Review git -C $DST diff, then commit and push the public repo."
