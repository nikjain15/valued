#!/usr/bin/env python3
"""mos_design.py: the deterministic checks behind the design stages. Standard library only.

  mos_design.py schema extract     legacy tables, records, columns, and who reads and writes them
  mos_design.py workflow check     every workflow fact has a source; owner-owned facts are not assumed
  mos_design.py model check        every legacy column has a home; writes the build list
  mos_design.py saga check         every saga can be undone or completed, and stays in its lane
  mos_design.py gate               all three checks; records the result as evidence

The agent researches and proposes. This tool refuses a design with a hole in it.
"""
import argparse
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mos  # noqa: E402  (the gate tool that sits beside this file)

WORKFLOW_FACTS = ["trigger", "actors", "steps", "data_touched", "consistency_need", "volume",
                  "failure_handling_today", "target_shape"]
OWNER_OWNED = ["consistency_need", "target_shape"]  # a person decides these; never assumed
SOURCE = re.compile(r"^(code:.+:\d+|doc:.+|owner:.+|assumed)$")
KINDS = ("compensatable", "pivot", "retriable")

# ---------------------------------------------------------------- legacy schema

CREATE = re.compile(r"CREATE\s+(?:GLOBAL\s+TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"
                    r"([\w.\"`\[\]]+)\s*\(", re.I)
CONSTRAINT = re.compile(r"^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX|KEY)\b", re.I)
SQL_USE = re.compile(r"\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+INTO|FROM|JOIN)\s+"
                     r"([\w.\"`\[\]]+)", re.I)
COB_FIELD = re.compile(r"^\s*(\d{2})\s+([\w-]+)(.*)$")
COB_COPY = re.compile(r"\bCOPY\s+['\"]?([\w-]+)", re.I)


def clean(name):
    return re.sub(r"[\"`\[\]]", "", name)


def split_top(body):
    parts, depth, cur = [], 0, []
    for ch in body:
        depth += (ch == "(") - (ch == ")")
        if ch == "," and depth == 0:
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur).strip())
    return [p for p in parts if p]


def parse_ddl(text, path):
    text = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group().count("\n"), text, flags=re.S)
    text = re.sub(r"--[^\n]*", "", text)
    for m in CREATE.finditer(text):
        i = j = m.end()
        depth = 1
        while j < len(text) and depth:
            depth += (text[j] == "(") - (text[j] == ")")
            j += 1
        cols, pk, fks = [], set(), {}
        for part in split_top(text[i:j - 1]):
            k = re.search(r"PRIMARY\s+KEY\s*\(([^)]*)\)", part, re.I)
            f = re.search(r"FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+([\w.\"`\[\]]+)", part, re.I)
            if CONSTRAINT.match(part):
                if k:
                    pk |= {clean(c).strip().lower() for c in k.group(1).split(",")}
                if f:
                    for c in f.group(1).split(","):
                        fks[clean(c).strip().lower()] = clean(f.group(2))
                continue
            c = re.match(r"([\w\"`\[\]]+)\s+(\w+(?:\s+(?:VARYING|PRECISION))?\s*(?:\([^)]*\))?)",
                         part, re.I)
            if not c:
                continue
            ref = re.search(r"REFERENCES\s+([\w.\"`\[\]]+)", part, re.I)
            cols.append({"name": clean(c.group(1)), "type": re.sub(r"\s+", " ", c.group(2)).upper(),
                         "nullable": not re.search(r"NOT\s+NULL|PRIMARY\s+KEY", part, re.I),
                         "pk": bool(re.search(r"PRIMARY\s+KEY", part, re.I)),
                         "fk": clean(ref.group(1)) if ref else None, "flags": []})
        for c in cols:
            if c["name"].lower() in pk:
                c["pk"], c["nullable"] = True, False
            c["fk"] = c["fk"] or fks.get(c["name"].lower())
        yield clean(m.group(1)), {"kind": "table", "columns": cols,
                                  "source": "%s:%d" % (path, text.count("\n", 0, m.start()) + 1)}


def parse_copybook(text, path):
    """COBOL record layouts: every 01 level is a record, every PIC item a field."""
    record = None
    for n, raw in enumerate(text.splitlines(), 1):
        line = raw[6:72] if re.match(r"^[\d ]{6}", raw) else raw
        if line[:1] in ("*", "/"):
            continue
        m = COB_FIELD.match(line)
        if not m:
            continue
        level, name, rest = m.group(1), m.group(2), m.group(3)
        if level == "01":
            record = (name, {"kind": "record", "columns": [], "source": "%s:%d" % (path, n)})
            yield record
            continue
        pic = re.search(r"\bPIC(?:TURE)?\s+(?:IS\s+)?(\S+?)\.?(?:\s|$)", rest, re.I)
        if not record or not pic:
            continue
        flags = []
        if name.upper() == "FILLER":
            flags.append("filler")
        red = re.search(r"\bREDEFINES\s+([\w-]+)", rest, re.I)
        if red:
            flags.append("redefines:" + red.group(1))
        if re.search(r"\bOCCURS\b", rest, re.I):
            flags.append("repeats")
        usage = re.search(r"\b(COMP(?:UTATIONAL)?(?:-\d)?|BINARY|PACKED-DECIMAL)\b", rest, re.I)
        record[1]["columns"].append({
            "name": name, "type": ("PIC " + pic.group(1) + (" " + usage.group(1) if usage else "")).upper(),
            "nullable": False, "pk": False, "fk": None, "flags": flags})


def cmd_schema(a):
    tables, files = {}, [p for p in mos.walk()]
    for p in files:
        ext = os.path.splitext(p)[1].lower()
        if ext in (".sql", ".ddl", ".db2", ".pks", ".pkb", ".pls"):
            tables.update(parse_ddl(mos.read(p), p))
        elif ext == ".cpy":
            tables.update(parse_copybook(mos.read(p), p))
    by_low = {}
    for t in tables:
        by_low[t.lower()] = t
        by_low.setdefault(t.lower().split(".")[-1], t)
    copy_stem = {os.path.splitext(os.path.basename(t["source"].rsplit(":", 1)[0]))[0].lower(): n
                 for n, t in tables.items() if t["kind"] == "record"}
    ops = {"INSERT": "C", "MERGE": "C", "UPDATE": "U", "DELETE": "D", "FROM": "R", "JOIN": "R"}
    usage = {}
    for p in files:
        if os.path.splitext(p)[1].lower() not in mos.LANGS:
            continue
        text = mos.read(p)
        for verb, name in SQL_USE.findall(text):
            t = by_low.get(clean(name).lower())
            if t:
                usage.setdefault(t, {}).setdefault(p, set()).add(ops[verb.split()[0].upper()])
        for name in COB_COPY.findall(text):
            t = copy_stem.get(name.lower())
            if t and p != tables[t]["source"].rsplit(":", 1)[0]:
                usage.setdefault(t, {}).setdefault(p, set()).add("uses")
    usage = {t: {f: "".join(sorted(o, key="CRUDuses".find)) if "uses" not in o else "uses"
                 for f, o in fs.items()} for t, fs in usage.items()}
    mos.save(os.path.join("data", "legacy-schema.json"),
             {"at": mos.now(), "tables": tables, "usage": usage})
    rows = []
    for name, t in sorted(tables.items()):
        fs = usage.get(name, {})
        odd = sum(1 for c in t["columns"] if c["flags"])
        rows.append([name, t["kind"], len(t["columns"]), odd or "",
                     sum(1 for o in fs.values() if o != "R"), len(fs), t["source"]])
    mos.table(rows[:a.top], ["Table or record", "Kind", "Columns", "Odd fields", "Writers",
                             "Users", "Defined at"])
    orphans = sorted(t for t in tables if t not in usage)
    if orphans:
        print("\nNo code found using: " + ", ".join(orphans[:12]) +
              " (check dynamic SQL, stored procedures and reports before trusting this)")
    print("Wrote %s (%d tables and records)" % (mos.wpath("data", "legacy-schema.json"), len(tables)))


# ---------------------------------------------------------------- workflows

def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except ValueError as e:
        return {"__error__": "not valid JSON (%s)" % e}


def check_workflows():
    bad, notes, names = [], [], {}
    paths = sorted(glob.glob(mos.wpath("workflows", "*.json")))
    if not paths:
        bad.append("no workflow profiles in %s" % mos.wpath("workflows"))
    for path in paths:
        w = read_json(path)
        name = w.get("name") or os.path.basename(path)
        if "__error__" in w:
            bad.append("%s: %s" % (path, w["__error__"]))
            continue
        names[name] = w
        facts = w.get("facts", {})
        for key in WORKFLOW_FACTS:
            f = facts.get(key)
            if not isinstance(f, dict) or f.get("value") in (None, "", []):
                bad.append("%s: fact '%s' is missing" % (name, key))
            elif not SOURCE.match(str(f.get("source", ""))):
                bad.append("%s: fact '%s' needs a source: code:path:line, doc:source:line, "
                           "owner:Name or assumed" % (name, key))
            elif f["source"] == "assumed" and key in OWNER_OWNED:
                bad.append("%s: '%s' is the owner's call and is still assumed. Ask." % (name, key))
        assumed = sorted(k for k, f in facts.items()
                         if isinstance(f, dict) and f.get("source") == "assumed")
        if assumed:
            notes.append("%s: assumed, to confirm: %s" % (name, ", ".join(assumed)))
        if w.get("open_questions"):
            notes.append("%s: %d open questions" % (name, len(w["open_questions"])))
    return bad, notes, names


# ---------------------------------------------------------------- target data model

def as_list(v):
    return v if isinstance(v, list) else [v]


def check_model():
    bad, notes = [], []
    legacy = mos.load(os.path.join("data", "legacy-schema.json"))
    model = read_json(mos.wpath("data", "target-model.json")) \
        if os.path.exists(mos.wpath("data", "target-model.json")) else None
    if model is None:
        return ["%s not found" % mos.wpath("data", "target-model.json")], notes, None
    if "__error__" in model:
        return ["target-model.json: " + model["__error__"]], notes, None
    schemas, tables = model.get("schemas", {}), model.get("tables", {})
    dropped = {k.lower(): v for k, v in model.get("dropped", {}).items()}
    homes, build = {}, {"schemas": [], "tables": [], "columns": [], "retyped": [], "dropped": []}
    legacy_cols = {}
    for t, d in legacy["tables"].items():
        for c in d["columns"]:
            if "filler" not in c["flags"]:
                legacy_cols[("%s.%s" % (t, c["name"])).lower()] = c
    for s, d in sorted(schemas.items()):
        if not d.get("owner_service"):
            bad.append("schema %s: no owner_service. One service owns each schema." % s)
        if d.get("status") == "new":
            build["schemas"].append([s, d.get("owner_service", ""), d.get("reason", "")])
    for t, d in sorted(tables.items()):
        schema = t.split(".")[0] if "." in t else ""
        if schema not in schemas:
            bad.append("table %s: its schema is not declared under schemas" % t)
        if d.get("status") == "new":
            build["tables"].append([t, len(d.get("columns", {})), d.get("reason", "")])
        for c, cd in sorted(d.get("columns", {}).items()):
            where = "%s.%s" % (t, c)
            if not cd.get("type"):
                bad.append("column %s: no type" % where)
            srcs = [str(s) for s in as_list(cd.get("source", "")) if s]
            if not srcs:
                bad.append("column %s: no source (legacy:TABLE.COLUMN, new or derived)" % where)
            for s in srcs:
                if s.lower().startswith("legacy:"):
                    ref = s[7:].lower()
                    if ref not in legacy_cols:
                        bad.append("column %s: source %s is not in the legacy schema" % (where, s))
                    else:
                        homes.setdefault(ref, []).append(where)
                        old = legacy_cols[ref]["type"]
                        if old.replace(" ", "") != str(cd.get("type", "")).upper().replace(" ", ""):
                            build["retyped"].append([s[7:], old, where, cd.get("type", "")])
                elif s in ("new", "derived"):
                    if not cd.get("reason"):
                        bad.append("column %s: marked %s with no reason" % (where, s))
                    build["columns"].append([where, cd.get("type", ""), s, cd.get("reason", "")])
                else:
                    bad.append("column %s: source '%s' not understood" % (where, s))
            if d.get("status") != "new" and cd.get("status") == "new" and \
                    not any(s in ("new", "derived") for s in srcs):
                build["columns"].append([where, cd.get("type", ""), "from legacy", ", ".join(srcs)])
    for ref in sorted(legacy_cols):
        if ref in homes:
            continue
        d = dropped.get(ref)
        if not d:
            bad.append("legacy column %s has no home in the target and is not listed as dropped" % ref)
        elif not d.get("reason"):
            bad.append("dropped %s: no reason" % ref)
        elif not d.get("confirmed_by"):
            bad.append("dropped %s: dropping data is the owner's call; confirmed_by is empty" % ref)
        else:
            build["dropped"].append([ref, d["reason"], d["confirmed_by"]])
    odd = sum(1 for c in legacy_cols.values() if c["flags"])
    if odd:
        notes.append("%d legacy fields are overloaded or repeating (redefines, occurs): "
                     "each needs its meaning confirmed before its mapping is trusted" % odd)
    return bad, notes, {"model": model, "build": build}


def write_build_list(build):
    def tab(title, head, rows):
        out = ["## %s (%d)" % (title, len(rows)), ""]
        if rows:
            out += ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
            out += ["| " + " | ".join(str(c).replace("|", "/") for c in r) + " |" for r in rows]
        else:
            out.append("None.")
        return out + [""]
    lines = ["# What to build in the data layer", "",
             "Generated by `mos_design.py model check` from the legacy schema and the target "
             "model. Do not edit by hand.", ""]
    lines += tab("New schemas", ["Schema", "Owning service", "Why"], build["schemas"])
    lines += tab("New tables", ["Table", "Columns", "Why"], build["tables"])
    lines += tab("New columns", ["Column", "Type", "Origin", "Why or source"], build["columns"])
    lines += tab("Columns that change type", ["Legacy column", "Legacy type", "Target column",
                                              "Target type"], build["retyped"])
    lines += tab("Legacy columns dropped", ["Legacy column", "Why", "Confirmed by"], build["dropped"])
    path = mos.wpath("data", "build-list.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


# ---------------------------------------------------------------- sagas

def check_sagas(model, workflows):
    bad, notes = [], []
    tables = (model or {}).get("tables", {})
    schemas = (model or {}).get("schemas", {})
    covered = set()
    for path in sorted(glob.glob(mos.wpath("architecture", "sagas", "*.json"))):
        s = read_json(path)
        name = s.get("name") or os.path.basename(path)
        if "__error__" in s:
            bad.append("%s: %s" % (path, s["__error__"]))
            continue
        covered.add(s.get("workflow"))
        say = lambda msg: bad.append("saga %s: %s" % (name, msg))
        if s.get("style") not in ("orchestration", "choreography"):
            say("style must be orchestration or choreography")
        if not s.get("legacy_transaction"):
            say("legacy_transaction is empty. Cite where today's transaction lives (path:line)")
        if workflows is not None and s.get("workflow") not in workflows:
            say("workflow '%s' has no profile under workflows/" % s.get("workflow"))
        steps = s.get("steps", [])
        ids = [st.get("id") for st in steps]
        if len(set(ids)) != len(ids) or not all(ids):
            say("every step needs a unique id")
        pivots = [i for i, st in enumerate(steps) if st.get("kind") == "pivot"]
        if len(pivots) > 1:
            say("more than one pivot step. A saga has one point of no return")
        pivot = pivots[0] if pivots else len(steps)
        for i, st in enumerate(steps):
            sid, kind = st.get("id", "#%d" % (i + 1)), st.get("kind")
            if kind not in KINDS:
                say("step %s: kind must be one of %s" % (sid, ", ".join(KINDS)))
            elif i < pivot and kind == "retriable":
                if pivots:
                    say("step %s: comes before the pivot, so it must be compensatable" % sid)
            elif i > pivot and kind != "retriable":
                say("step %s: comes after the pivot, so it must be retriable until it succeeds" % sid)
            if kind == "compensatable" and not st.get("compensation"):
                say("step %s: no compensation. What undoes it?" % sid)
            for field in ("service", "action", "idempotency_key", "timeout"):
                if not st.get(field):
                    say("step %s: %s is missing" % (sid, field))
            for t in st.get("writes", []):
                if t not in tables:
                    say("step %s: writes %s, which is not in the target model" % (sid, t))
                else:
                    owner = schemas.get(t.split(".")[0], {}).get("owner_service")
                    if owner and owner != st.get("service"):
                        say("step %s: service %s writes %s, owned by %s. A step writes only "
                            "its own service's data" % (sid, st.get("service"), t, owner))
        if steps and not pivots and any(st.get("kind") == "retriable" for st in steps[:-1]) \
                and any(st.get("kind") == "compensatable" for st in steps):
            notes.append("saga %s: no pivot named. Which step is the point of no return?" % name)
        if len({st.get("service") for st in steps}) < 2:
            notes.append("saga %s: one service only. A local transaction would do; a saga "
                         "adds cost here" % name)
    for wname, w in (workflows or {}).items():
        shape = str((w.get("facts", {}).get("target_shape") or {}).get("value", "")).lower()
        if "saga" in shape and wname not in covered:
            bad.append("workflow %s is to become a saga but has no saga design" % wname)
    return bad, notes


# ---------------------------------------------------------------- commands

def report(title, bad, notes):
    for n in notes:
        print("NOTE  " + n)
    for b in bad:
        print("FAIL  " + b)
    print("%s: %s" % (title, "OK" if not bad else "%d to fix" % len(bad)))
    return not bad


def cmd_workflow(a):
    bad, notes, _ = check_workflows()
    sys.exit(0 if report("Workflows", bad, notes) else 1)


def cmd_model(a):
    bad, notes, res = check_model()
    ok = report("Data model", bad, notes)
    if res:
        print("Wrote " + write_build_list(res["build"]))
        mos.table([[k.capitalize(), len(v)] for k, v in res["build"].items()], ["To build", "Count"])
    sys.exit(0 if ok else 1)


def cmd_saga(a):
    path = mos.wpath("data", "target-model.json")
    model = read_json(path) if os.path.exists(path) else {}
    wf = check_workflows()[2] if glob.glob(mos.wpath("workflows", "*.json")) else None
    bad, notes = check_sagas(model, wf)
    sys.exit(0 if report("Sagas", bad, notes) else 1)


def cmd_gate(a):
    wb, wn, wf = check_workflows()
    mb, mn, res = check_model()
    sb, sn = check_sagas(res["model"] if res else {}, wf)
    ok = all([report("Workflows", wb, wn), report("Data model", mb, mn), report("Sagas", sb, sn)])
    if res:
        write_build_list(res["build"])
    mos.save(os.path.join("evidence", "design.json"),
             {"at": mos.now(), "passed": ok, "failures": wb + mb + sb, "notes": wn + mn + sn,
              "workflows": sorted(wf), "sagas": len(glob.glob(mos.wpath("architecture", "sagas", "*.json")))})
    print("\nDesign gate: %s. Evidence: %s" % ("PASSED" if ok else "BLOCKED",
                                              mos.wpath("evidence", "design.json")))
    sys.exit(0 if ok else 1)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="mos_design.py", description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="command", required=True)
    p = sub.add_parser("schema")
    p.add_argument("action", choices=["extract"])
    p.add_argument("--top", type=int, default=12)
    p.set_defaults(fn=cmd_schema)
    for name, fn in (("workflow", cmd_workflow), ("model", cmd_model), ("saga", cmd_saga)):
        p = sub.add_parser(name)
        p.add_argument("action", choices=["check"])
        p.set_defaults(fn=fn)
    sub.add_parser("gate").set_defaults(fn=cmd_gate)
    a = ap.parse_args(argv)
    os.chdir(a.root)
    a.fn(a)


if __name__ == "__main__":
    main()
