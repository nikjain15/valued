"""Tests for mos_memory.py, mos_jira.py, new-code slices and design approval."""
import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_design_sources import Base, DDL, COPYBOOK, CODE, WORKFLOW, MODEL, SAGA  # noqa: E402

CHECKPOINT = """## Goal
Move billing off the shared schema. Slice S1 ports the rate rules.

## Where we are
S1 verified. Code builds, tests pass.

## Done since last checkpoint
- Ported rate rules to billing/rates.py

## In progress
None

## Next actions
1. Run the security review for S1

## Decisions and why
- Kept the rounding quirk: the owner wants parity first

## Open questions
- Is the 100 kWh threshold still current? Ask the billing lead

## Watch out
- tests/test_total.py must run from the repo root
"""
PY = sys.executable


class Memory(Base):
    def setUp(self):
        super().setUp()
        self.write("billing/rates.py", "def rate(k):\n    if k > 100:\n        return 2\n    return 1\n")
        self.write("tests/t.py", "import sys\nsys.path.insert(0, '.')\nfrom billing.rates import rate\n"
                                 "assert rate(5) == 1 and rate(200) == 2\n")
        self.run_tool("mos.py", "init")

    def analyzed(self, design="none"):
        for c in ("inventory", "graph", "rank"):
            self.run_tool("mos.py", c)
        self.run_tool("mos.py", "target", "--stack", "Python 3.12", "--strategy", "slice by slice",
                      "--design", design, "--by", "Dana Okafor")

    def nxt(self):
        return self.run_tool("mos_memory.py", "next").stdout

    def test_next_action_is_computed_from_the_workspace(self):
        self.assertIn("modernize-analyze", self.nxt())
        self.assertIn("inventory", self.nxt())
        for c in ("inventory", "graph", "rank"):
            self.run_tool("mos.py", c)
        self.assertIn("target stack", self.nxt())
        self.analyzed()
        self.assertIn("slice plan", self.nxt())
        self.run_tool("mos.py", "slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.assertIn("mos.py baseline S1", self.nxt())
        self.run_tool("mos.py", "baseline", "S1", "--", PY, "tests/t.py")
        self.assertIn("modernize-transform", self.nxt())
        self.write("billing/rates.py", "def rate(k):\n    return 2 if k > 100 else 1\n")
        self.run_tool("mos.py", "transformed", "S1")
        self.run_tool("mos.py", "verify", "S1")
        out = self.nxt()
        self.assertIn("modernize-secure", out)
        self.assertIn("S1 (Rates) is verified", out)

    def test_next_action_walks_the_design_track(self):
        self.analyzed(design="full")
        self.assertIn("modernize-sources", self.nxt())
        self.write("modernization/workflows/take-a-payment.json", WORKFLOW)
        self.assertIn("modernize-data-model", self.nxt())
        self.write("db/schema.sql", DDL)
        self.write("cobol/LEDGER.cpy", COPYBOOK)
        self.run_tool("mos_design.py", "schema", "extract")
        self.write("modernization/data/target-model.json", MODEL)
        self.assertIn("modernize-architect", self.nxt())
        self.write("modernization/architecture/sagas/take-a-payment.json", SAGA)
        self.run_tool("mos_design.py", "gate")
        self.assertIn("mos_design.py approve", self.nxt())
        self.run_tool("mos_design.py", "approve", "--by", "Dana Okafor")
        self.assertIn("slice plan", self.nxt())

    def test_checkpoint_shape_is_enforced(self):
        self.write("cp.md", CHECKPOINT.replace("## Watch out\n- tests/test_total.py must run from the repo root\n", ""))
        r = self.run_tool("mos_memory.py", "checkpoint", "--from", "cp.md", ok=False)
        self.assertIn("section '## Watch out' is missing", r.stdout)
        self.write("cp.md", CHECKPOINT.replace("1. Run the security review for S1", "soon"))
        r = self.run_tool("mos_memory.py", "checkpoint", "--from", "cp.md", ok=False)
        self.assertIn("needs at least one list item", r.stdout)
        self.write("cp.md", CHECKPOINT + "\n## My thoughts\nx\n")
        r = self.run_tool("mos_memory.py", "checkpoint", "--from", "cp.md", ok=False)
        self.assertIn("unexpected sections: My thoughts", r.stdout)
        self.write("cp.md", CHECKPOINT + "- filler\n" * 150)
        r = self.run_tool("mos_memory.py", "checkpoint", "--from", "cp.md", ok=False)
        self.assertIn("the limit is 150", r.stdout)

    def test_resume_carries_state_checkpoint_journal_and_lessons(self):
        self.analyzed()
        self.run_tool("mos.py", "slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.run_tool("mos.py", "baseline", "S1", "--", PY, "tests/t.py")
        self.write("cp.md", CHECKPOINT)
        self.run_tool("mos_memory.py", "checkpoint", "--from", "cp.md")
        saved = self.text("modernization/memory/checkpoints/0001.md")
        self.assertIn("| S1 | Rates | legacy | baselined |", saved)   # facts stamped by the tool
        self.assertIn("Next action by the workspace: `modernize-transform`", saved)
        self.run_tool("mos_memory.py", "journal", "found", "rounding is half-up at billing/rates.py:3")
        sid = self.run_tool("mos_memory.py", "signal", "Keep answers to one table", "--by", "Dana Okafor",
                            "--where", "modernize").stdout.split()[1].rstrip(".")
        self.run_tool("mos_memory.py", "lesson", "add", "--rule", "Report each gate as one table",
                      "--applies-to", "modernize", "--signals", sid, "--by", "Dana Okafor")
        brief = self.run_tool("mos_memory.py", "resume").stdout
        for want in ("## Next action", "Skill: `modernize-transform`", "| S1 | Rates | legacy | baselined |",
                     "L-1 [modernize] Report each gate as one table", "### Goal",
                     "Kept the rounding quirk", "found: rounding is half-up",
                     "Since that checkpoint (2 journal entries)"):
            self.assertIn(want, brief)
        self.assertEqual(brief, self.text("modernization/memory/RESUME.md") + "\n")

    def test_checkpoint_falls_due_and_recall_finds_things(self):
        for i in range(15):
            r = self.run_tool("mos_memory.py", "journal", "did", "step %d on the ledger port" % i)
        self.assertIn("A checkpoint is due", r.stdout)
        self.assertIn("**A checkpoint is due**", self.run_tool("mos_memory.py", "resume").stdout)
        out = self.run_tool("mos_memory.py", "recall", "LEDGER", "step 7").stdout
        self.assertIn("step 7 on the ledger port", out)
        self.assertIn("1 hits", out)

    def test_gates_log_signals_and_lessons_track_whether_they_work(self):
        self.analyzed()
        self.run_tool("mos.py", "slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.run_tool("mos.py", "slice", "add", "S2", "--title", "Init", "--files", "tests/t.py")
        self.run_tool("mos.py", "verify", "S1", ok=False)      # out of order, twice: a pattern
        self.run_tool("mos.py", "verify", "S2", ok=False)
        self.run_tool("mos.py", "document", "S1", ok=False)    # once: not a pattern
        out = self.run_tool("mos_memory.py", "lessons").stdout
        self.assertRegex(out, r"\| verify\s+\| 2\s+\|.*G-1 G-2")
        self.assertIn("1 one-off refusals not shown", out)
        r = self.run_tool("mos_memory.py", "lesson", "add", "--rule", "x", "--applies-to", "modernize-test",
                          "--signals", "G-99", "--by", "Dana Okafor", ok=False)
        self.assertIn("no such signal", r.stderr)
        self.run_tool("mos_memory.py", "lesson", "add", "--rule", "Run mos.py status before any gate",
                      "--applies-to", "modernize-transform", "--signals", "G-1", "G-2", "--by", "Dana Okafor")
        self.assertIn("**L-1** Run mos.py status before any gate (approved by Dana Okafor; from G-1, G-2)",
                      self.text("modernization/memory/playbook.md"))
        self.assertRegex(self.run_tool("mos_memory.py", "lessons").stdout, r"L-1 .*\| 0\s+\| holding")
        import time
        time.sleep(1.1)   # signals are timestamped to the second
        self.run_tool("mos.py", "verify", "S1", ok=False)
        self.run_tool("mos.py", "verify", "S2", ok=False)
        self.assertIn("not working: revise or retire", self.run_tool("mos_memory.py", "lessons").stdout)
        self.run_tool("mos_memory.py", "lesson", "retire", "L-1", "--by", "Dana Okafor")
        self.assertNotIn("L-1", self.text("modernization/memory/playbook.md"))


class NewCode(Base):
    def setUp(self):
        super().setUp()
        self.write("db/schema.sql", DDL)
        self.write("cobol/LEDGER.cpy", COPYBOOK)
        self.write("app/pay.py", CODE)
        self.run_tool("mos.py", "init")
        self.run_tool("mos_design.py", "schema", "extract")
        self.write("modernization/workflows/take-a-payment.json", WORKFLOW)
        self.write("modernization/data/target-model.json", MODEL)
        self.write("modernization/architecture/sagas/take-a-payment.json", SAGA)
        self.write("tests/t_saga.py", "import sys\nsys.path.insert(0, '.')\nfrom saga import run\n"
                                      "assert run(fail_at='charge') == ['hold', 'release the hold']\n")
        self.add = ("slice", "add", "N1", "--kind", "new", "--title", "Payment saga", "--files", "saga.py")

    def approve(self):
        self.run_tool("mos_design.py", "gate")
        self.run_tool("mos_design.py", "approve", "--by", "Dana Okafor")

    def test_new_code_needs_an_approved_unchanged_design(self):
        self.assertIn("approved by the owner", self.run_tool("mos.py", *self.add, ok=False).stderr)
        self.assertIn("has not passed", self.run_tool("mos_design.py", "approve", "--by", "Dana Okafor", ok=False).stderr)
        self.run_tool("mos_design.py", "gate")
        self.run_tool("mos.py", *self.add, ok=False)              # passed but not approved
        self.run_tool("mos_design.py", "approve", "--by", "Dana Okafor")
        saga = json.loads(json.dumps(SAGA))
        saga["steps"][0]["timeout"] = "9s"
        self.write("modernization/architecture/sagas/take-a-payment.json", saga)
        self.run_tool("mos.py", *self.add, ok=False)              # changed after approval
        self.assertIn("changed after the gate", self.run_tool("mos_design.py", "approve", "--by", "Dana Okafor", ok=False).stderr)
        self.approve()
        self.run_tool("mos.py", *self.add)

    def test_tests_must_fail_first_then_pass(self):
        self.approve()
        self.run_tool("mos.py", *self.add)
        r = self.run_tool("mos.py", "baseline", "N1", "--", PY, "-c", "pass", ok=False)
        self.assertIn("already pass before the code exists", r.stderr)
        r = self.run_tool("mos.py", "baseline", "N1", "--", "no-such-test-runner", ok=False)
        self.assertIn("could not run", r.stderr)
        r = self.run_tool("mos.py", "baseline", "N1", "--", PY, "tests/t_saga.py")
        self.assertIn("failing, as they should", r.stdout)
        self.run_tool("mos.py", "transformed", "N1", ok=False)    # nothing built yet
        self.write("saga.py", "def run(fail_at=None):\n    return ['hold', 'release the hold']\n")
        self.run_tool("mos.py", "transformed", "N1")
        self.run_tool("mos.py", "verify", "N1")
        self.run_tool("mos.py", "check")
        for c in ("inventory", "graph", "rank"):
            self.run_tool("mos.py", c)
        self.run_tool("mos.py", "target", "--stack", "Java 21", "--strategy", "slice by slice", "--by", "Dana Okafor")
        self.assertIn("modernize-secure", self.run_tool("mos_memory.py", "next").stdout)


class Jira(BaseHTTPRequestHandler):
    posts, fail_on = [], None

    def log_message(self, *a):
        pass

    def reply(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def do_GET(self):
        self.reply(200, {"transitions": [{"id": "31", "name": "In Review"}, {"id": "41", "name": "Done"}]})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if Jira.fail_on and Jira.fail_on in self.path:
            return self.reply(403, {})
        Jira.posts.append((self.path, body, self.headers.get("Authorization")))
        self.reply(201, {"key": "PAY-900"} if self.path.endswith("/issue") else {})


class Track(Base):
    def setUp(self):
        super().setUp()
        Jira.posts, Jira.fail_on = [], None
        self.server = HTTPServer(("127.0.0.1", 0), Jira)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = "http://127.0.0.1:%d" % self.server.server_port
        self.write("a.py", "def f():\n    return 1\n")
        self.write("b.py", "x = 1\n")
        self.write("t.py", "import a\nassert a.f() == 1\n")
        self.run_tool("mos.py", "init")
        self.run_tool("mos.py", "slice", "add", "S1", "--title", "Port a", "--files", "a.py", "--jira", "PAY-204")
        self.run_tool("mos.py", "baseline", "S1", "--", PY, "t.py")
        self.write("a.py", "def f():\n    return 2 - 1\n")
        self.run_tool("mos.py", "transformed", "S1")
        self.run_tool("mos.py", "verify", "S1")
        self.env = {"JIRA_TOKEN": "s3cret"}

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        super().tearDown()

    def setup_jira(self, *extra):
        self.run_tool("mos_jira.py", "setup", "--base", self.base, "--transition", "verified=In Review", *extra)

    def test_nothing_is_sent_without_setup_plan_and_approver(self):
        self.assertIn("not set up", self.run_tool("mos_jira.py", "plan", ok=False).stderr)
        self.setup_jira()
        self.assertIn("nothing to send", self.run_tool("mos_jira.py", "push", "--approved-by", "Dana Okafor",
                                                       env=self.env, ok=False).stderr)
        self.run_tool("mos_jira.py", "plan")
        self.assertEqual(Jira.posts, [])

    def test_plan_then_push_sends_evidence_once(self):
        self.setup_jira()
        plan = self.run_tool("mos_jira.py", "plan").stdout
        self.assertRegex(plan, r"comment\s+\| PAY-204 \| S1\s+\| verified")
        self.assertRegex(plan, r"transition \| PAY-204 \| S1\s+\| verified \| In Review")
        out = self.run_tool("mos_jira.py", "push", "--approved-by", "Dana Okafor", env=self.env).stdout
        self.assertIn("2 Jira updates sent, approved by Dana Okafor", out)
        (p1, b1, auth), (p2, b2, _) = Jira.posts
        self.assertEqual(p1, "/rest/api/2/issue/PAY-204/comment")
        self.assertIn("is now: verified", b1["body"])
        self.assertIn("Tests pass on the legacy code", b1["body"])
        self.assertIn("Same tests pass on the new code: exit 0", b1["body"])
        self.assertEqual(auth, "Bearer s3cret")
        self.assertEqual((p2, b2), ("/rest/api/2/issue/PAY-204/transitions", {"transition": {"id": "31"}}))
        self.assertIn("nothing to send", self.run_tool("mos_jira.py", "plan").stdout)   # not sent twice
        state = json.loads(self.text("modernization/state.json"))
        self.assertEqual(state["decisions"][-1], dict(state["decisions"][-1], who="Dana Okafor",
                                                      what="Approved 2 Jira updates"))
        for base, _, files in os.walk(self.d):
            for f in files:
                with open(os.path.join(base, f), errors="replace") as fh:
                    self.assertNotIn("s3cret", fh.read())

    def test_push_refuses_an_edited_or_stale_outbox(self):
        self.setup_jira()
        self.run_tool("mos_jira.py", "plan")
        box = json.loads(self.text("modernization/jira/outbox.json"))
        box["ops"][0]["body"] = "All done, ship it."
        self.write("modernization/jira/outbox.json", box)
        r = self.run_tool("mos_jira.py", "push", "--approved-by", "Dana Okafor", env=self.env, ok=False)
        self.assertIn("edited after it was shown", r.stderr)
        self.run_tool("mos_jira.py", "plan")
        self.write("modernization/evidence/S1/security.json", '{"findings": []}')
        self.run_tool("mos.py", "secure", "S1")
        r = self.run_tool("mos_jira.py", "push", "--approved-by", "Dana Okafor", env=self.env, ok=False)
        self.assertIn("moved on since the preview", r.stderr)
        self.assertEqual(Jira.posts, [])

    def test_creates_missing_issue_and_links_it(self):
        self.run_tool("mos.py", "slice", "add", "S2", "--title", "Port b", "--files", "b.py")
        self.setup_jira()
        self.assertIn("No Jira issue linked for: S2", self.run_tool("mos_jira.py", "plan").stdout)
        self.setup_jira("--project", "PAY", "--create-missing")
        self.run_tool("mos_jira.py", "plan")
        self.run_tool("mos_jira.py", "push", "--approved-by", "Dana Okafor", env=self.env)
        made = [b for p, b, _ in Jira.posts if p == "/rest/api/2/issue"][0]["fields"]
        self.assertEqual(made["project"], {"key": "PAY"})
        self.assertEqual(made["summary"], "[Modernization] S2: Port b")
        self.assertEqual(json.loads(self.text("modernization/state.json"))["slices"]["S2"]["jira"], "PAY-900")

    def test_partial_failure_is_logged_and_not_resent(self):
        self.setup_jira()
        self.run_tool("mos_jira.py", "plan")
        Jira.fail_on = "/transitions"
        r = self.run_tool("mos_jira.py", "push", "--approved-by", "Dana Okafor", env=self.env, ok=False)
        self.assertIn("403", r.stderr)
        self.assertIn("1 of 2 sent", r.stderr)
        Jira.fail_on = None
        plan = self.run_tool("mos_jira.py", "plan").stdout
        self.assertNotIn("comment", plan)
        self.assertIn("transition", plan)


if __name__ == "__main__":
    unittest.main()
