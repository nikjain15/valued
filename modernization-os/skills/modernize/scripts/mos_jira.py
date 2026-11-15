#!/usr/bin/env python3
"""mos_jira.py: keep Jira in step with the work, after a person says so. Stdlib only.

Nothing is sent without a preview and a named approver. What is sent comes from the
evidence on disk, not from what an agent believes happened.

  mos_jira.py setup --base URL [--project KEY] [--issue-type T] [--create-missing]
                    [--transition STATUS=NAME ...]
  mos_jira.py link SLICE KEY               tie a slice to an existing issue
  mos_jira.py plan                         write and show the outbox: what would be sent
  mos_jira.py push --approved-by NAME      send exactly the outbox that was shown

Token: JIRA_TOKEN in the environment (and ATLASSIAN_EMAIL on Atlassian Cloud). Never stored.
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mos  # noqa: E402
import mos_sources  # noqa: E402

CONFIG = os.path.join("jira", "config.json")
OUTBOX = os.path.join("jira", "outbox.json")


def config():
    c = mos.load(CONFIG, default={})
    if not c.get("base"):
        mos.die("Jira is not set up. Run: mos_jira.py setup --base <url>")
    return c


def pushed():
    return {(e["slice"], e["status"], e["op"]) for e in mos.read_log("jira-log.jsonl")}


def digest(ops):
    return hashlib.sha256(json.dumps(ops, sort_keys=True).encode()).hexdigest()


def evidence(sid, phase):
    return mos.load(os.path.join("evidence", sid, phase + ".json"), default={})


def summary(sid, s):
    """The comment for a slice, built only from recorded evidence."""
    lines = ["Modernization slice %s (%s) is now: %s." % (sid, s["title"], s["status"]), ""]
    rank = mos.ORDER.index(s["status"])
    base, ver = evidence(sid, "baseline"), evidence(sid, "verify")
    if rank >= 1 and base:
        what = "Tests written first and failing as expected" if s.get("kind") == "new" \
            else "Tests pass on the legacy code"
        lines.append("* %s: {{%s}} (exit %s, %s)" % (what, base["cmd"], base["exit"], base["at"]))
    if rank >= 3 and ver:
        lines.append("* Same tests pass on the new code: exit %s, %s, commit %s"
                     % (ver["exit"], ver["at"], (ver.get("git_head") or "not recorded")[:12]))
    if rank >= 4:
        f = evidence(sid, "security").get("findings", [])
        count = lambda st: sum(1 for x in f if str(x.get("status", "")).lower() == st)
        lines.append("* Security review: %d findings; %d fixed, %d accepted, %d open (none high)"
                     % (len(f), count("fixed"), count("accepted"), count("open")))
    if rank >= 5:
        lines.append("* Handover document: modernization/docs/%s.md" % sid)
    if rank >= 6:
        lines.append("* Approved by %s on %s" % (s["history"][-1]["by"], s["history"][-1]["at"][:10]))
    lines += ["", "Files: " + ", ".join(s["files"][:15]) + (" and more" if len(s["files"]) > 15 else ""),
              "", "Posted by the Modernization OS from recorded evidence, after approval by a person."]
    return "\n".join(lines)


def build_ops():
    c, state, done = config(), mos.load("state.json"), pushed()
    ops, skipped = [], []
    for sid, s in sorted(state["slices"].items()):
        key, status = s.get("jira"), s["status"]
        if not key:
            if c.get("create_missing") and c.get("project") and (sid, "created", "create") not in done:
                ops.append({"op": "create", "slice": sid, "status": "created", "project": c["project"],
                            "issue_type": c.get("issue_type", "Task"),
                            "summary": "[Modernization] %s: %s" % (sid, s["title"]),
                            "body": summary(sid, s)})
            elif not c.get("create_missing"):
                skipped.append(sid)
            continue
        if status == "planned":
            continue
        if (sid, status, "comment") not in done:
            ops.append({"op": "comment", "slice": sid, "status": status, "key": key,
                        "body": summary(sid, s)})
        name = c.get("transitions", {}).get(status)
        if name and (sid, status, "transition") not in done:
            ops.append({"op": "transition", "slice": sid, "status": status, "key": key, "to": name})
    return ops, skipped


def cmd_setup(a):
    c = mos.load(CONFIG, default={})
    c.update({"base": a.base.rstrip("/"), "create_missing": a.create_missing})
    if a.project:
        c["project"] = a.project
    if a.issue_type:
        c["issue_type"] = a.issue_type
    for t in a.transition or []:
        if "=" not in t or t.split("=")[0] not in mos.ORDER:
            mos.die("--transition takes STATUS=NAME, STATUS one of: " + ", ".join(mos.ORDER))
        c.setdefault("transitions", {})[t.split("=")[0]] = t.split("=", 1)[1]
    mos.save(CONFIG, c)
    print("Jira set up: %s. Nothing is sent until: plan, then push --approved-by NAME." % c["base"])


def cmd_link(a):
    state = mos.load("state.json")
    mos.get_slice(state, a.slice)["jira"] = a.key
    mos.save("state.json", state)
    print("Slice %s is tracked by %s." % (a.slice, a.key))


def cmd_plan(a):
    ops, skipped = build_ops()
    mos.save(OUTBOX, {"at": mos.now(), "digest": digest(ops), "ops": ops})
    mos.table([[o["op"], o.get("key", "(new issue)"), o["slice"], o["status"],
                o.get("to") or o.get("summary") or o["body"].split("\n")[0][:60]] for o in ops]
              or [["-", "", "", "", "nothing to send: Jira is up to date"]],
              ["Action", "Issue", "Slice", "Status", "What"])
    if skipped:
        print("\nNo Jira issue linked for: %s (link one with: mos_jira.py link SLICE KEY)" % ", ".join(skipped))
    if ops:
        print("\nFull text: %s\nShow this to the owner. On their yes: mos_jira.py push --approved-by NAME"
              % mos.wpath(OUTBOX))


def call(base, path, auth, body=None):
    req = urllib.request.Request(
        base + path, data=json.dumps(body).encode() if body is not None else None,
        method="POST" if body is not None else "GET",
        headers={"Authorization": auth, "Accept": "application/json", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw.strip() else {}


def cmd_push(a):
    out = mos.load(OUTBOX, default={})
    if not out.get("ops"):
        mos.die("nothing to send. Run: mos_jira.py plan")
    if out.get("digest") != digest(out["ops"]):
        mos.die("the outbox was edited after it was shown. Run plan again and show the owner.")
    if build_ops()[0] != out["ops"]:
        mos.die("the work moved on since the preview. Run plan again and show the owner.")
    c, auth = config(), mos_sources.auth_header("JIRA_TOKEN")
    state, sent = mos.load("state.json"), 0
    try:
        for o in out["ops"]:
            if o["op"] == "comment":
                call(c["base"], "/rest/api/2/issue/%s/comment" % o["key"], auth, {"body": o["body"]})
            elif o["op"] == "transition":
                options = call(c["base"], "/rest/api/2/issue/%s/transitions" % o["key"], auth).get("transitions", [])
                match = [t for t in options if t.get("name", "").lower() == o["to"].lower()]
                if not match:
                    raise ValueError("%s cannot move to '%s' from where it is. Available: %s" % (
                        o["key"], o["to"], ", ".join(t.get("name", "") for t in options) or "none"))
                call(c["base"], "/rest/api/2/issue/%s/transitions" % o["key"], auth,
                     {"transition": {"id": match[0]["id"]}})
            else:
                made = call(c["base"], "/rest/api/2/issue", auth, {"fields": {
                    "project": {"key": o["project"]}, "summary": o["summary"],
                    "description": o["body"], "issuetype": {"name": o["issue_type"]}}})
                o["key"] = made.get("key", "")
                state["slices"][o["slice"]]["jira"] = o["key"]
            mos.log("jira-log.jsonl", {"at": mos.now(), "by": a.approved_by, "op": o["op"],
                                       "slice": o["slice"], "status": o["status"], "key": o.get("key", "")})
            sent += 1
    except urllib.error.HTTPError as e:
        problem = "Jira answered %d for %s" % (e.code, e.url.split("?")[0])
    except urllib.error.URLError as e:
        problem = "cannot reach Jira: %s" % e.reason
    except ValueError as e:
        problem = str(e)
    else:
        problem = None
    if sent:
        state["decisions"].append({"at": mos.now(), "who": a.approved_by,
                                   "what": "Approved %d Jira updates" % sent})
        mos.save("state.json", state)
        mos.journal("jira", "%d Jira updates sent, approved by %s" % (sent, a.approved_by))
    if problem:
        mos.die("%s. %d of %d sent; those are logged and will not be sent twice. Fix, then plan again."
                % (problem, sent, len(out["ops"])))
    os.remove(mos.wpath(OUTBOX))
    print("%d Jira updates sent, approved by %s." % (sent, a.approved_by))


def main(argv=None):
    ap = argparse.ArgumentParser(prog="mos_jira.py", description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".")
    sub = ap.add_subparsers(dest="command", required=True)
    p = sub.add_parser("setup")
    p.add_argument("--base", required=True)
    p.add_argument("--project")
    p.add_argument("--issue-type")
    p.add_argument("--create-missing", action="store_true", help="open an issue for a slice that has none")
    p.add_argument("--transition", nargs="*", help="for example verified='In Review' approved=Done")
    p.set_defaults(fn=cmd_setup)
    p = sub.add_parser("link")
    p.add_argument("slice")
    p.add_argument("key")
    p.set_defaults(fn=cmd_link)
    sub.add_parser("plan").set_defaults(fn=cmd_plan)
    p = sub.add_parser("push")
    p.add_argument("--approved-by", required=True)
    p.set_defaults(fn=cmd_push)
    a = ap.parse_args(argv)
    os.chdir(a.root)
    a.fn(a)


if __name__ == "__main__":
    main()
