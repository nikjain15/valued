#!/usr/bin/env python3
"""mos_memory.py: memory that outlives a context window, and a loop that learns. Stdlib only.

An agent forgets; files do not. Facts about where the work stands are computed from the
workspace, never recalled. What only the agent knows (intent, reasoning, what to avoid) is
written into a checkpoint with a fixed shape, and the tool refuses one that is out of shape.

  mos_memory.py resume                     the brief to read first, every session
  mos_memory.py next                       the next action, computed from the workspace
  mos_memory.py journal KIND "text"        append to the work log (did, found, decided, blocked)
  mos_memory.py checkpoint --from FILE     validate and save a structured handoff
  mos_memory.py recall WORD [WORD ...]     search the journal, checkpoints and playbook
  mos_memory.py signal "text" --by NAME    record feedback or a correction to learn from
  mos_memory.py lessons                    signals grouped into patterns; is each lesson working
  mos_memory.py lesson add --rule R --applies-to SKILL --signals ID [ID ...] --by NAME
  mos_memory.py lesson retire ID --by NAME
"""
import argparse
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mos  # noqa: E402

SECTIONS = ["Goal", "Where we are", "Done since last checkpoint", "In progress", "Next actions",
            "Decisions and why", "Open questions", "Watch out"]
MAX_LINES = 150       # a checkpoint is a summary; past this it is a transcript
DUE_AFTER = 15        # journal entries since the last checkpoint before one is due
NEXT_GATE = {
    "planned": ("modernize-test", "pin today's behavior, then: mos.py baseline {id} -- <test command>"),
    "baselined": ("modernize-transform", "transform the slice, then: mos.py transformed {id}; mos.py verify {id}"),
    "transformed": ("modernize-transform", "make the baseline tests pass: mos.py verify {id}"),
    "verified": ("modernize-secure", "review and patch, write security.json, then: mos.py secure {id}"),
    "secured": ("modernize-document", "write docs/{id}.md, then: mos.py document {id}"),
    "documented": ("modernize-document", "show the owner the slice; on their yes: mos.py approve {id} --by NAME"),
}
NEW_GATE = {
    "planned": ("modernize-build", "write the tests from the design first; they must fail: mos.py baseline {id} -- <test command>"),
    "baselined": ("modernize-build", "write the code, then: mos.py transformed {id} --files <new files>; mos.py verify {id}"),
}


def mem(*parts):
    return mos.wpath("memory", *parts)


def natural(key):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", key)]


# ---------------------------------------------------------------- where the work stands

def next_action():
    """Return (skill, instruction). Derived from files only, so it survives any loss of context."""
    if not os.path.exists(mos.wpath("state.json")):
        return "modernize", "start the workspace: python3 modernization/mos.py init"
    state = mos.load("state.json")
    if not all(os.path.exists(mos.wpath(f)) for f in ("inventory.json", "graph.json", "hotspots.json")):
        return "modernize-analyze", "map the code: mos.py inventory, graph, rank"
    if not state["target"].get("stack"):
        return "modernize-analyze", "ask the owner for the target stack, strategy and which design stages to run; record with mos.py target"
    slices = state["slices"]
    if state["target"].get("design", "full") != "none" and not mos.design_approved():
        import mos_design
        if not glob.glob(mos.wpath("workflows", "*.json")):
            return "modernize-sources", "read the documents and tickets (if any), then profile each workflow with modernize-discover"
        bad = mos_design.check_workflows()[0]
        if bad:
            return "modernize-discover", "finish the workflow profiles (%d to fix): mos_design.py workflow check" % len(bad)
        if not os.path.exists(mos.wpath("data", "legacy-schema.json")) or \
                not os.path.exists(mos.wpath("data", "target-model.json")):
            return "modernize-data-model", "research the legacy data model and write data/target-model.json"
        bad = mos_design.check_model()[0]
        if bad:
            return "modernize-data-model", "complete the target model (%d to fix): mos_design.py model check" % len(bad)
        d = mos.load(os.path.join("evidence", "design.json"), default={})
        if not d.get("passed") or d.get("digest") != mos.design_digest():
            return "modernize-architect", "design the sagas the workflows need, then: mos_design.py gate"
        return "modernize", "show the owner the build list and the design; on their yes: mos_design.py approve --by NAME"
    if not slices:
        return "modernize-analyze", "agree the slice plan and register each slice: mos.py slice add"
    for sid in sorted(slices, key=natural):
        s = slices[sid]
        if s["status"] == "approved":
            continue
        table = dict(NEXT_GATE, **NEW_GATE) if s.get("kind") == "new" else NEXT_GATE
        skill, text = table[s["status"]]
        return skill, "slice %s (%s) is %s: %s" % (sid, s["title"], s["status"], text.format(id=sid))
    return "modernize-document", "every slice is approved: write modernization/handover.md and run mos.py check"


def state_lines():
    if not os.path.exists(mos.wpath("state.json")):
        return ["No workspace yet."]
    state = mos.load("state.json")
    t = state["target"]
    out = ["Target: %s. Strategy: %s. Design track: %s." % (
        t.get("stack") or "not set", t.get("strategy") or "not set", t.get("design", "full"))]
    d = mos.load(os.path.join("evidence", "design.json"), default={})
    if d:
        current = d.get("digest") == mos.design_digest()
        out.append("Design gate: %s%s%s." % (
            "passed" if d.get("passed") else "blocked",
            ", approved by %s" % d["approved_by"] if d.get("approved_by") and current else ", not approved",
            "" if current else ", design changed since (rerun the gate)"))
    out += ["", "| Slice | Title | Kind | Status | Jira |", "|---|---|---|---|---|"]
    out += ["| %s | %s | %s | %s | %s |" % (sid, s["title"], s.get("kind", "legacy"), s["status"],
                                           s.get("jira", ""))
            for sid, s in sorted(state["slices"].items(), key=lambda kv: natural(kv[0]))] \
        or ["| - | no slices yet | | | |"]
    waiting = [d["what"] for d in state["decisions"] if "to be confirmed" in d["who"]]
    out += ["", "Decisions on record: %d. Awaiting a person: %d." % (len(state["decisions"]), len(waiting))]
    out += ["- " + w for w in waiting[:5]]
    return out


def checkpoints():
    return sorted(glob.glob(mem("checkpoints", "*.md")))


def since_last_checkpoint():
    j = mos.read_log("journal.jsonl")
    last = max([i for i, e in enumerate(j) if e["kind"] == "checkpoint"] or [-1])
    return j[last + 1:]


def playbook():
    try:
        with open(mem("playbook.json"), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return []


def cmd_next(a):
    skill, text = next_action()
    print("Skill: %s\nDo:    %s" % (skill, text))


def cmd_resume(a):
    skill, text = next_action()
    out = ["# Resume brief", "", "Generated %s from the workspace. Trust this over anything remembered." % mos.now(),
           "", "## Next action", "", "Skill: `%s`" % skill, "", text, "", "## State", ""] + state_lines()
    active = [l for l in playbook() if not l.get("retired")]
    out += ["", "## Lessons to apply (%d)" % len(active), ""]
    out += ["- %s [%s] %s" % (l["id"], l["applies_to"], l["rule"]) for l in active[-25:]] or ["None yet."]
    cps = checkpoints()
    if cps:
        with open(cps[-1], encoding="utf-8") as f:
            body = f.read().split("\n")
        out += ["", "## Last checkpoint (%s)" % os.path.basename(cps[-1]), ""]
        out += [("#" + l if l.startswith("#") else l) for l in body]
    else:
        out += ["", "## Last checkpoint", "", "None yet. Write one after the first gate."]
    recent = since_last_checkpoint()
    out += ["", "## Since that checkpoint (%d journal entries)" % len(recent), ""]
    out += ["- %s %s: %s" % (e["at"][5:16], e["kind"], e["text"][:200]) for e in recent[-25:]] or ["Nothing."]
    if len(recent) >= DUE_AFTER:
        out += ["", "**A checkpoint is due** (%d entries since the last one). Write it before more work." % len(recent)]
    text = "\n".join(out) + "\n"
    if os.path.isdir(mos.WS):
        os.makedirs(mem(), exist_ok=True)
        with open(mem("RESUME.md"), "w", encoding="utf-8") as f:
            f.write(text)
    print(text)


def cmd_journal(a):
    if not os.path.isdir(mos.WS):
        mos.die("no workspace. Run: mos.py init")
    mos.journal(a.kind, a.text)
    n = len(since_last_checkpoint())
    print("Logged." + (" A checkpoint is due (%d entries since the last)." % n if n >= DUE_AFTER else ""))


def cmd_checkpoint(a):
    text = sys.stdin.read() if a.source == "-" else mos.read(a.source)
    lines = text.strip().split("\n")
    found, bad = {}, []
    cur = None
    for line in lines:
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            cur = m.group(1)
            found[cur] = []
        elif cur is not None:
            found[cur].append(line)
    for sec in SECTIONS:
        if sec not in found:
            bad.append("section '## %s' is missing" % sec)
        elif not "".join(found[sec]).strip():
            bad.append("section '## %s' is empty (write None if there is nothing)" % sec)
    extra = [s for s in found if s not in SECTIONS]
    if extra:
        bad.append("unexpected sections: %s. Keep to the fixed shape" % ", ".join(extra))
    if "Next actions" in found and not any(re.match(r"\s*(\d+\.|-)\s+\S", l) for l in found["Next actions"]):
        bad.append("'Next actions' needs at least one list item")
    if len(lines) > MAX_LINES:
        bad.append("%d lines; the limit is %d. Summarise: detail belongs in the journal and "
                   "the workspace files" % (len(lines), MAX_LINES))
    if not text.strip():
        bad = ["nothing to save. Give the checkpoint with --from FILE"]
    if bad:
        print("\n".join("FAIL  " + b for b in bad))
        print("\nShape: " + ", ".join("## " + s for s in SECTIONS))
        sys.exit(1)
    n = len(checkpoints()) + 1
    skill, nxt = next_action()
    body = ["# Checkpoint %d" % n, "", "Saved %s." % mos.now(), "",
            "## Computed at save time", "", "Next action by the workspace: `%s`: %s" % (skill, nxt), ""]
    body += state_lines() + [""] + lines
    os.makedirs(mem("checkpoints"), exist_ok=True)
    path = mem("checkpoints", "%04d.md" % n)
    for target in (path, mem("CURRENT.md")):
        with open(target, "w", encoding="utf-8") as f:
            f.write("\n".join(body) + "\n")
    mos.journal("checkpoint", "checkpoint %d saved" % n)
    print("Saved %s (also %s)." % (path, mem("CURRENT.md")))


def cmd_recall(a):
    words = [w.lower() for w in a.words]
    hits = []
    for e in mos.read_log("journal.jsonl"):
        hits.append(("journal %s %s" % (e["at"][:16], e["kind"]), e["text"]))
    for l in playbook():
        hits.append(("lesson %s" % l["id"], l["rule"]))
    for s in mos.read_log("signals.jsonl"):
        hits.append(("signal %s" % s["id"], "%s: %s" % (s["where"], s["text"])))
    for p in checkpoints():
        with open(p, encoding="utf-8") as f:
            for n, line in enumerate(f, 1):
                hits.append(("%s:%d" % (p, n), line.strip()))
    found = [(w, t) for w, t in hits if all(x in t.lower() for x in words)]
    for where, text in found[-a.max:]:
        print("%s: %s" % (where, text[:220]))
    print("%d hits%s." % (len(found), " (latest %d shown)" % a.max if len(found) > a.max else ""))


# ---------------------------------------------------------------- learning

def pattern_key(s):
    """Two refusals are the same pattern when the same gate gave the same kind of reason."""
    text = re.sub(r"\b(slice|step|saga|column|table|workflow|finding|schema|dropped)\s+\S+", r"\1 _", s["text"].lower())
    text = re.sub(r"[`'\"].*?[`'\"]|\d+", "_", text)
    return s["where"], " ".join(text.split()[:9])


def cmd_signal(a):
    sid = mos.signal(a.where, a.text, kind="owner", by=a.by)
    print("Recorded %s. Review with: mos_memory.py lessons" % sid)


def cmd_lessons(a):
    signals, book = mos.read_log("signals.jsonl"), playbook()
    covered = {i for l in book for i in l["signals"]}
    groups = {}
    for s in signals:
        groups.setdefault(pattern_key(s), []).append(s)
    rows = []
    for (where, gist), group in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        open_ids = [s["id"] for s in group if s["id"] not in covered]
        if open_ids and (len(group) >= 2 or any(s["kind"] == "owner" for s in group)):
            rows.append([where, len(group), gist[:60], " ".join(open_ids[:6])])
    print("Patterns with no lesson yet (repeated refusals, and anything the owner said):")
    mos.table(rows[:12] or [["-", 0, "none", ""]], ["Where", "Times", "What", "Signals"])
    rows = []
    for l in book:
        keys = {pattern_key(s) for s in signals if s["id"] in l["signals"]}
        again = sum(1 for s in signals if s["at"] > l["at"] and pattern_key(s) in keys)
        verdict = "retired" if l.get("retired") else \
            ("not working: revise or retire" if again >= 2 else "holding" if not again else "watch")
        rows.append([l["id"], l["applies_to"], l["rule"][:60], again, verdict])
    print("\nLessons in the playbook:")
    mos.table(rows or [["-", "", "none yet", "", ""]], ["Lesson", "Applies to", "Rule", "Recurred", "Verdict"])
    single = sum(1 for g in groups.values() if len(g) == 1 and g[0]["kind"] != "owner" and g[0]["id"] not in covered)
    print("\n%d signals in all; %d one-off refusals not shown (one occurrence is not a pattern)." % (len(signals), single))


def write_playbook(book):
    os.makedirs(mem(), exist_ok=True)
    with open(mem("playbook.json"), "w", encoding="utf-8") as f:
        json.dump(book, f, indent=2)
    lines = ["# Playbook", "", "Lessons this modernization has learned. Every skill reads this before it "
             "starts. Each lesson was approved by a person and cites the signals behind it.", ""]
    for skill in sorted({l["applies_to"] for l in book if not l.get("retired")}):
        lines += ["## %s" % skill, ""]
        lines += ["- **%s** %s (approved by %s; from %s)" % (l["id"], l["rule"], l["by"], ", ".join(l["signals"]))
                  for l in book if l["applies_to"] == skill and not l.get("retired")] + [""]
    with open(mem("playbook.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def cmd_lesson(a):
    book = playbook()
    if a.action == "add":
        if not (a.rule and a.applies_to and a.signals):
            mos.die("lesson add needs --rule, --applies-to and --signals.")
        known = {s["id"] for s in mos.read_log("signals.jsonl")}
        missing = [i for i in a.signals if i not in known]
        if missing:
            mos.die("no such signal: %s. A lesson must rest on something that happened." % ", ".join(missing))
        lid = "L-%d" % (len(book) + 1)
        book.append({"id": lid, "at": mos.now(), "rule": a.rule, "applies_to": a.applies_to,
                     "signals": a.signals, "by": a.by})
        mos.journal("lesson", "%s added for %s, approved by %s" % (lid, a.applies_to, a.by))
        print("%s added to the playbook." % lid)
    else:
        hit = [l for l in book if l["id"] == a.id]
        if not hit:
            mos.die("no lesson %s." % a.id)
        hit[0]["retired"] = {"at": mos.now(), "by": a.by}
        mos.journal("lesson", "%s retired by %s" % (a.id, a.by))
        print("%s retired." % a.id)
    write_playbook(book)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="mos_memory.py", description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("resume").set_defaults(fn=cmd_resume)
    sub.add_parser("next").set_defaults(fn=cmd_next)
    sub.add_parser("lessons").set_defaults(fn=cmd_lessons)
    p = sub.add_parser("journal")
    p.add_argument("kind", choices=["did", "found", "decided", "blocked"])
    p.add_argument("text")
    p.set_defaults(fn=cmd_journal)
    p = sub.add_parser("checkpoint")
    p.add_argument("--from", dest="source", default="-", help="a file with the checkpoint, or - for stdin")
    p.set_defaults(fn=cmd_checkpoint)
    p = sub.add_parser("recall")
    p.add_argument("words", nargs="+")
    p.add_argument("--max", type=int, default=30)
    p.set_defaults(fn=cmd_recall)
    p = sub.add_parser("signal")
    p.add_argument("text")
    p.add_argument("--by", required=True)
    p.add_argument("--where", default="owner feedback", help="the skill or stage it concerns")
    p.set_defaults(fn=cmd_signal)
    p = sub.add_parser("lesson")
    p.add_argument("action", choices=["add", "retire"])
    p.add_argument("id", nargs="?")
    p.add_argument("--rule")
    p.add_argument("--applies-to")
    p.add_argument("--signals", nargs="+")
    p.add_argument("--by", required=True)
    p.set_defaults(fn=cmd_lesson)
    a = ap.parse_args(argv)
    os.chdir(a.root)
    a.fn(a)


if __name__ == "__main__":
    main()
