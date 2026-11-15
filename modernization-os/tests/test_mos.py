"""Tests for the gate tool and the installer. Run: python3 -m unittest discover modernization-os/tests"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOS = os.path.join(ROOT, "skills", "modernize", "scripts", "mos.py")
INSTALL = os.path.join(ROOT, "install.py")

FILES = {
    "billing/__init__.py": "",
    "billing/rates.py": "def rate(kwh):\n    if kwh > 100:\n        return 2\n    return 1\n",
    "billing/invoice.py": "from billing.rates import rate\nfrom . import ledger\n\n"
                          "def total(kwh):\n    return kwh * rate(kwh)\n",
    "billing/ledger.py": "from billing import invoice\n",
    "billing/unused.py": "def old():\n    return 0\n",
    "main.py": "import billing.invoice\nprint(billing.invoice.total(5))\n",
    "web/app.js": "const u = require('./util');\nimport x from './lib/x';\n",
    "web/util.js": "module.exports = {};\n",
    "web/lib/x/index.ts": "export default 1;\n",
    "cobol/PAYROLL.cbl": "       COPY PAYREC.\n       CALL 'TAXCALC' USING WS-REC.\n",
    "cobol/TAXCALC.cbl": "       PROCEDURE DIVISION.\n",
    "cobol/PAYREC.cpy": "       01 WS-REC PIC X(10).\n",
    "tests/test_total.py": "import sys\nsys.path.insert(0, '.')\n"
                           "from billing.invoice import total\nassert total(5) == 5\n"
                           "assert total(200) == 400\n",
    "package.json": "{}",
}
GOOD_DOC = "# Rates\n\n" + "Usage over 100 kWh is billed at the higher rate. " * 6


class Case(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = self.tmp.name
        for path, text in FILES.items():
            self.write(path, text)
        self.mos("init")

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, path, text):
        full = os.path.join(self.d, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w") as f:
            f.write(text)

    def mos(self, *args, ok=True):
        r = subprocess.run([sys.executable, MOS, "--root", self.d] + list(args),
                           capture_output=True, text=True)
        if ok is not None:
            self.assertEqual(r.returncode == 0, ok, r.stdout + r.stderr)
        return r

    def data(self, name):
        with open(os.path.join(self.d, "modernization", name)) as f:
            return json.load(f)

    def analyze(self):
        self.mos("inventory")
        self.mos("graph")

    def to_verified(self):
        self.mos("slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.mos("baseline", "S1", "--", sys.executable, "tests/test_total.py")
        self.write("billing/rates.py", "def rate(kwh):\n    return 2 if kwh > 100 else 1\n")
        self.mos("transformed", "S1")
        self.mos("verify", "S1")

    # ---- analysis

    def test_inventory(self):
        self.mos("inventory")
        inv = self.data("inventory.json")
        self.assertEqual(inv["languages"]["Python"]["files"], 7)
        self.assertEqual(inv["languages"]["COBOL"]["files"], 2)
        self.assertIn("npm", [m["tool"] for m in inv["manifests"]])

    def test_graph_edges_cycles_dead_code(self):
        self.analyze()
        g = self.data("graph.json")
        e = g["edges"]
        self.assertIn("billing/rates.py", e["billing/invoice.py"])
        self.assertIn("billing/ledger.py", e["billing/invoice.py"])
        self.assertIn("billing/invoice.py", e["main.py"])
        self.assertEqual(e["web/app.js"], ["web/lib/x/index.ts", "web/util.js"])
        self.assertEqual(e["cobol/PAYROLL.cbl"], ["cobol/PAYREC.cpy", "cobol/TAXCALC.cbl"])
        self.assertEqual(g["cycles"], [["billing/invoice.py", "billing/ledger.py"]])
        self.assertIn("billing/unused.py", g["dead_code_candidates"])
        self.assertNotIn("main.py", g["dead_code_candidates"])
        self.assertNotIn("billing/rates.py", g["dead_code_candidates"])

    def test_extra_edges_clear_a_dead_code_candidate(self):
        self.mos("inventory")
        self.write("modernization/graph.extra.json", '[["main.py", "billing/unused.py"]]')
        self.mos("graph")
        self.assertNotIn("billing/unused.py", self.data("graph.json")["dead_code_candidates"])

    def test_rank_scales_with_client_impact(self):
        self.analyze()
        self.mos("rank")
        before = {f["path"]: f["score"] for f in self.data("hotspots.json")["files"]}
        self.write("modernization/impact.json", '{"billing/": 5}')
        self.mos("rank")
        h = self.data("hotspots.json")
        after = {f["path"]: f["score"] for f in h["files"]}
        self.assertTrue(h["impact_set_by_client"])
        self.assertGreater(after["billing/rates.py"], before["billing/rates.py"])
        self.assertEqual(after["web/app.js"], before["web/app.js"])

    def test_target_is_recorded_as_a_decision(self):
        self.mos("target", "--stack", "Java 21", "--strategy", "slice by slice", "--by", "Dana Okafor")
        st = self.data("state.json")
        self.assertEqual(st["target"]["stack"], "Java 21")
        self.assertEqual(st["decisions"][-1]["who"], "Dana Okafor")

    # ---- gates

    def test_full_slice_passes_every_gate(self):
        self.to_verified()
        self.write("modernization/evidence/S1/security.json", json.dumps({"findings": [
            {"id": "SEC-1", "severity": "high", "status": "fixed"},
            {"id": "SEC-2", "severity": "low", "status": "open"}]}))
        self.mos("secure", "S1")
        self.write("modernization/docs/S1.md", GOOD_DOC)
        self.mos("document", "S1")
        self.mos("approve", "S1", "--by", "Dana Okafor")
        self.mos("check")
        s = self.data("state.json")["slices"]["S1"]
        self.assertEqual(s["status"], "approved")
        self.assertEqual(s["history"][-1]["by"], "Dana Okafor")

    def test_baseline_must_pass_on_legacy_code(self):
        self.mos("slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.mos("baseline", "S1", "--", sys.executable, "-c", "raise SystemExit(3)", ok=False)
        self.assertEqual(self.data("state.json")["slices"]["S1"]["status"], "planned")

    def test_gates_cannot_be_skipped(self):
        self.mos("slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        for step in (["transformed", "S1"], ["verify", "S1"], ["secure", "S1"],
                     ["document", "S1"], ["approve", "S1", "--by", "Dana Okafor"]):
            self.assertIn("BLOCKED", self.mos(*step, ok=False).stderr)

    def test_transformed_needs_a_real_change(self):
        self.mos("slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.mos("baseline", "S1", "--", sys.executable, "tests/test_total.py")
        self.mos("transformed", "S1", ok=False)

    def test_verify_blocks_a_behavior_change(self):
        self.mos("slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.mos("baseline", "S1", "--", sys.executable, "tests/test_total.py")
        self.write("billing/rates.py", "def rate(kwh):\n    return 3\n")
        self.mos("transformed", "S1")
        self.mos("verify", "S1", ok=False)
        self.assertEqual(self.data("state.json")["slices"]["S1"]["status"], "transformed")

    def test_changing_the_verify_command_needs_a_reason_and_a_person(self):
        self.mos("slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        self.mos("baseline", "S1", "--", sys.executable, "tests/test_total.py")
        self.write("billing/rates.py", "def rate(kwh):\n    return 3\n")
        self.mos("transformed", "S1")
        self.mos("verify", "S1", "--", "true", ok=False)
        self.mos("verify", "S1", "--reason", "ported harness", "--", "true")
        r = self.mos("check", ok=False)
        self.assertIn("awaiting a person", r.stdout)

    def test_secure_blocks_open_high_and_unnamed_acceptance(self):
        self.to_verified()
        sec = "modernization/evidence/S1/security.json"
        self.mos("secure", "S1", ok=False)
        self.write(sec, '{"findings": [{"id": "SEC-1", "severity": "critical", "status": "open"}]}')
        self.mos("secure", "S1", ok=False)
        self.write(sec, '{"findings": [{"id": "SEC-1", "severity": "high", "status": "accepted"}]}')
        self.mos("secure", "S1", ok=False)
        self.write(sec, '{"findings": [{"id": "SEC-1", "severity": "high", "status": "accepted", '
                        '"accepted_by": "Dana Okafor"}]}')
        self.mos("secure", "S1")

    def test_document_needs_a_real_document(self):
        self.to_verified()
        self.write("modernization/evidence/S1/security.json", '{"findings": []}')
        self.mos("secure", "S1")
        self.write("modernization/docs/S1.md", "todo")
        self.mos("document", "S1", ok=False)

    def test_check_catches_hand_edited_state(self):
        self.mos("slice", "add", "S1", "--title", "Rates", "--files", "billing/rates.py")
        state = self.data("state.json")
        state["slices"]["S1"]["status"] = "approved"
        self.write("modernization/state.json", json.dumps(state))
        r = self.mos("check", ok=False)
        self.assertIn("no passing baseline evidence", r.stdout)
        self.assertIn("a gate was skipped", r.stdout)

    # ---- installer

    def test_install_is_idempotent_and_keeps_existing_agents_md(self):
        self.write("AGENTS.md", "# House rules\n\nUse tabs.\n")
        for _ in range(2):
            r = subprocess.run([sys.executable, INSTALL, self.d, "--tool", "agents", "copilot"],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
        for d in (".agents/skills", ".github/skills"):
            for skill in ("modernize", "modernize-analyze", "modernize-test",
                          "modernize-transform", "modernize-secure", "modernize-document"):
                self.assertTrue(os.path.isfile(os.path.join(self.d, d, skill, "SKILL.md")))
        self.assertTrue(os.path.isfile(os.path.join(self.d, "modernization", "mos.py")))
        with open(os.path.join(self.d, "AGENTS.md")) as f:
            text = f.read()
        self.assertTrue(text.startswith("# House rules"))
        self.assertEqual(text.count("modernization-os:start"), 1)
        self.assertIn("`.agents/skills`", text)

    def test_skill_frontmatter(self):
        skills = os.path.join(ROOT, "skills")
        for name in os.listdir(skills):
            with open(os.path.join(skills, name, "SKILL.md")) as f:
                text = f.read()
            self.assertTrue(text.startswith("---\nname: %s\ndescription: " % name), name)
            self.assertNotIn("—", text, name)


if __name__ == "__main__":
    unittest.main()
