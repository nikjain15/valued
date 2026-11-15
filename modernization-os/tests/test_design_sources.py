"""Tests for mos_sources.py and mos_design.py."""
import base64
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
import zipfile
from http.server import BaseHTTPRequestHandler, HTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, "skills", "modernize", "scripts")

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
DOCX = ('<w:document %s><w:body>'
        '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Settlement rules</w:t></w:r></w:p>'
        '<w:p><w:r><w:t>Payments over 10,000 need </w:t></w:r><w:r><w:t>a second approver.</w:t></w:r></w:p>'
        '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Code</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:p><w:r><w:t>Meaning</w:t></w:r></w:p></w:tc></w:tr>'
        '<w:tr><w:tc><w:p><w:r><w:t>R</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:p><w:r><w:t>Reversed</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
        '</w:body></w:document>' % W)
S = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
XLSX = {
    "xl/workbook.xml": '<workbook %s %s><sheets><sheet name="Mapping" sheetId="1" r:id="rId1"/>'
                       '</sheets></workbook>' % (S, R),
    "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/'
                                  '2006/relationships"><Relationship Id="rId1" '
                                  'Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/sharedStrings.xml": '<sst %s><si><t>Legacy field</t></si><si><t>PAY-AMT</t></si>'
                            '<si><t>Target</t></si></sst>' % S,
    "xl/worksheets/sheet1.xml": '<worksheet %s><sheetData>'
                                '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>2</v></c></row>'
                                '<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>42</v></c>'
                                '<c r="C2" t="inlineStr"><is><t>amount</t></is></c></row>'
                                '</sheetData></worksheet>' % S,
}
A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
PPTX = {
    "ppt/slides/slide1.xml": '<p:sld xmlns:p="x" %s><a:p><a:r><a:t>Target architecture</a:t></a:r></a:p></p:sld>' % A,
    "ppt/slides/slide2.xml": '<p:sld xmlns:p="x" %s><a:p><a:r><a:t>Ledger service</a:t></a:r></a:p></p:sld>' % A,
    "ppt/notesSlides/notesSlide2.xml": '<p:notes xmlns:p="x" %s><a:p><a:r><a:t>Owns postings</a:t></a:r></a:p></p:notes>' % A,
}
DDL = """-- payments
CREATE TABLE PAYMENT (
  PAY_ID   INTEGER NOT NULL,
  AMT      DECIMAL(12,2) NOT NULL, /* money */
  STAT     CHAR(1),
  OLD_REF  VARCHAR(20),
  ACCT_ID  INTEGER REFERENCES ACCOUNT,
  PRIMARY KEY (PAY_ID)
);
CREATE TABLE ACCOUNT (ACCT_ID INTEGER PRIMARY KEY, BAL DECIMAL(12,2));
"""
COPYBOOK = """       01 LEDGER-REC.
          05 LEDGER-ID        PIC 9(9).
          05 LEDGER-AMT       PIC S9(10)V99 COMP-3.
          05 LEDGER-ALT REDEFINES LEDGER-AMT PIC X(6).
          05 FILLER           PIC X(4).
"""
CODE = ('def pay(db):\n    db.run("INSERT INTO PAYMENT (PAY_ID) VALUES (1)")\n'
        '    db.run("UPDATE ACCOUNT SET BAL = BAL - 1")\n'
        '    return db.run("SELECT * FROM payment JOIN ACCOUNT ON 1=1")\n')


def fact(value, source):
    return {"value": value, "source": source}


WORKFLOW = {"name": "take-a-payment", "open_questions": [], "facts": {
    "trigger": fact("payment request", "code:app/pay.py:1"),
    "actors": fact(["customer"], "doc:spec:12"),
    "steps": fact(["hold", "charge", "post"], "code:app/pay.py:2"),
    "data_touched": fact({"PAYMENT": "C"}, "code:app/pay.py:2"),
    "consistency_need": fact("may disagree for a minute", "owner:Dana Okafor"),
    "volume": fact("unknown", "assumed"),
    "failure_handling_today": fact("manual reversal", "doc:jira-pay-881:14"),
    "target_shape": fact("saga across accounts, payments and ledger", "owner:Dana Okafor")}}
MODEL = {
    "schemas": {"payments": {"status": "new", "owner_service": "payments", "reason": "split"},
                "accounts": {"status": "new", "owner_service": "accounts", "reason": "split"},
                "ledger": {"status": "new", "owner_service": "ledger", "reason": "split"}},
    "tables": {
        "payments.payment": {"status": "new", "reason": "replaces PAYMENT", "columns": {
            "id": {"type": "integer", "source": "legacy:PAYMENT.PAY_ID"},
            "amount": {"type": "numeric(12,2)", "source": "legacy:PAYMENT.AMT"},
            "state": {"type": "text", "source": ["legacy:PAYMENT.STAT", "derived"],
                      "reason": "saga status from STAT codes"},
            "account_id": {"type": "integer", "source": "legacy:PAYMENT.ACCT_ID"},
            "idempotency_key": {"type": "text", "source": "new", "reason": "safe retries"}}},
        "accounts.account": {"status": "new", "reason": "replaces ACCOUNT", "columns": {
            "id": {"type": "integer", "source": "legacy:ACCOUNT.ACCT_ID"},
            "balance": {"type": "decimal(12,2)", "source": "legacy:ACCOUNT.BAL"}}},
        "ledger.entry": {"status": "new", "reason": "replaces LEDGER-REC", "columns": {
            "id": {"type": "bigint", "source": "legacy:LEDGER-REC.LEDGER-ID"},
            "amount": {"type": "numeric(12,2)",
                       "source": ["legacy:LEDGER-REC.LEDGER-AMT", "legacy:LEDGER-REC.LEDGER-ALT"]}}}},
    "dropped": {"PAYMENT.OLD_REF": {"reason": "never read", "confirmed_by": "Dana Okafor"}}}


def step(sid, service, kind, table, **kw):
    s = {"id": sid, "service": service, "action": sid, "kind": kind, "writes": [table],
         "idempotency_key": "payment_id", "timeout": "5s"}
    s.update(kw)
    return s


SAGA = {"name": "take-a-payment", "workflow": "take-a-payment", "style": "orchestration",
        "legacy_transaction": "app/pay.py:1", "steps": [
            step("hold", "accounts", "compensatable", "accounts.account", compensation="release the hold"),
            step("charge", "payments", "pivot", "payments.payment"),
            step("post", "ledger", "retriable", "ledger.entry")]}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, path, text):
        full = os.path.join(self.d, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w") as f:
            f.write(text if isinstance(text, str) else json.dumps(text))

    def zip(self, path, parts):
        full = os.path.join(self.d, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with zipfile.ZipFile(full, "w") as z:
            for name, text in parts.items():
                z.writestr(name, text)

    def run_tool(self, tool, *args, ok=True, env=None):
        e = dict(os.environ)
        for k in ("JIRA_TOKEN", "CONFLUENCE_TOKEN", "ATLASSIAN_EMAIL", "HTTP_PROXY", "HTTPS_PROXY",
                  "http_proxy", "https_proxy"):
            e.pop(k, None)
        e.update(env or {})
        e["NO_PROXY"] = e["no_proxy"] = "127.0.0.1,localhost"
        r = subprocess.run([sys.executable, os.path.join(SCRIPTS, tool), "--root", self.d] + list(args),
                           capture_output=True, text=True, env=e)
        if ok is not None:
            self.assertEqual(r.returncode == 0, ok, r.stdout + r.stderr)
        return r

    def text(self, path):
        with open(os.path.join(self.d, path)) as f:
            return f.read()


class Sources(Base):
    def test_word_excel_powerpoint(self):
        self.zip("in/Settlement Spec.docx", {"word/document.xml": DOCX})
        self.zip("in/mapping.xlsx", XLSX)
        self.zip("in/deck.pptx", PPTX)
        self.write("in/old.doc", "binary")
        r = self.run_tool("mos_sources.py", "add", "in")
        self.assertIn("3 of 4 read", r.stdout)
        self.assertIn("old binary Office format", r.stdout)
        doc = self.text("modernization/sources/settlement-spec-docx.md")
        self.assertIn("## Settlement rules", doc)
        self.assertIn("Payments over 10,000 need a second approver.", doc)
        self.assertIn("| R | Reversed |", doc)
        sheet = self.text("modernization/sources/mapping-xlsx.md")
        self.assertIn("## Sheet: Mapping (2 rows)", sheet)
        self.assertIn("| Legacy field |  | Target |", sheet)
        self.assertIn("| PAY-AMT | 42 | amount |", sheet)
        deck = self.text("modernization/sources/deck-pptx.md")
        self.assertLess(deck.index("Target architecture"), deck.index("## Slide 2"))
        self.assertIn("Notes: Owns postings", deck)
        self.assertEqual(self.text("modernization/sources/.gitignore"), "*\n!.gitignore\n")

    def test_toc_and_find_give_line_numbers(self):
        self.zip("in/spec.docx", {"word/document.xml": DOCX})
        self.run_tool("mos_sources.py", "add", "in/spec.docx")
        self.assertIn("Settlement rules", self.run_tool("mos_sources.py", "toc").stdout)
        hit = self.run_tool("mos_sources.py", "find", "second", "APPROVER").stdout
        self.assertRegex(hit, r"spec-docx\.md:\d+: Payments over")

    def test_token_is_required_and_never_stored(self):
        r = self.run_tool("mos_sources.py", "jira", "--base", "http://127.0.0.1:9", "--keys", "PAY-1",
                          ok=False)
        self.assertIn("JIRA_TOKEN", r.stderr)


class Handler(BaseHTTPRequestHandler):
    seen = []

    def log_message(self, *a):
        pass

    def do_GET(self):
        Handler.seen.append((self.path, self.headers.get("Authorization")))
        path = self.path.split("?")[0]
        routes = {
            "/rest/api/2/search": {"total": 1, "issues": [{"key": "PAY-881"}]},
            "/rest/api/2/issue/PAY-881": {"fields": {
                "summary": "Double charge after timeout", "status": {"name": "Done"},
                "issuetype": {"name": "Incident"}, "labels": ["payments"],
                "description": {"type": "doc", "content": [{"type": "paragraph", "content": [
                    {"type": "text", "text": "Provider timed out; charge repeated."}]}]},
                "comment": {"comments": [{"created": "2025-03-02T10:00:00", "body": "Reversed by hand."}]},
                "issuelinks": [{"type": {"outward": "relates to"}, "outwardIssue": {"key": "PAY-12"}}]}},
            "/api/v2/pages/77": {"title": "Payments runbook", "body": {"storage": {
                "value": "<h1>Restart</h1><p>Rerun step 3.</p><table><tr><td>Job</td><td>PAYB01</td></tr></table>"}}},
            "/api/v2/pages/77/children": {"results": [{"id": "78"}]},
            "/rest/api/content/78": {"title": "Reversals", "body": {"storage": {"value": "<p>Post a reversal entry.</p>"}}},
        }
        body = routes.get(path)
        self.send_response(200 if body else 404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body or {}).encode())


class Atlassian(Base):
    def setUp(self):
        super().setUp()
        Handler.seen = []
        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = "http://127.0.0.1:%d" % self.server.server_port

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        super().tearDown()

    def test_jira_search_and_issue_with_bearer_token(self):
        self.run_tool("mos_sources.py", "jira", "--base", self.base, "--jql", "project = PAY",
                      env={"JIRA_TOKEN": "s3cret-token"})
        doc = self.text("modernization/sources/jira-pay-881.md")
        self.assertIn("# PAY-881: Double charge after timeout", doc)
        self.assertIn("Type: Incident | Status: Done", doc)
        self.assertIn("Provider timed out; charge repeated.", doc)
        self.assertIn("Reversed by hand.", doc)
        self.assertIn("relates to PAY-12", doc)
        self.assertTrue(all(a == "Bearer s3cret-token" for _, a in Handler.seen))
        for base, _, files in os.walk(self.d):
            for f in files:
                with open(os.path.join(base, f), errors="replace") as fh:
                    self.assertNotIn("s3cret-token", fh.read())

    def test_cloud_style_basic_auth(self):
        self.run_tool("mos_sources.py", "jira", "--base", self.base, "--keys", "PAY-881",
                      env={"JIRA_TOKEN": "tok", "ATLASSIAN_EMAIL": "owner@northbank.test"})
        want = "Basic " + base64.b64encode(b"owner@northbank.test:tok").decode()
        self.assertEqual(Handler.seen[0][1], want)

    def test_confluence_falls_back_between_api_versions_and_reads_children(self):
        r = self.run_tool("mos_sources.py", "confluence", "--base", self.base, "--page-id", "77",
                          "--depth", "1", env={"CONFLUENCE_TOKEN": "tok"})
        self.assertIn("2 pages read", r.stdout)
        page = [f for f in os.listdir(os.path.join(self.d, "modernization/sources")) if f.startswith("confluence-77")]
        doc = self.text("modernization/sources/" + page[0])
        self.assertIn("## Restart", doc)
        self.assertIn("Rerun step 3.", doc)
        self.assertIn("| Job | PAYB01", doc)

    def test_bad_token_is_explained(self):
        class Deny(Handler):
            def do_GET(self):
                self.send_response(401)
                self.end_headers()
        self.server.RequestHandlerClass = Deny
        r = self.run_tool("mos_sources.py", "jira", "--base", self.base, "--keys", "PAY-1",
                          env={"JIRA_TOKEN": "tok"}, ok=False)
        self.assertIn("401", r.stderr)


class Design(Base):
    def setUp(self):
        super().setUp()
        self.write("db/schema.sql", DDL)
        self.write("cobol/LEDGER.cpy", COPYBOOK)
        self.write("cobol/POST.cbl", "       COPY LEDGER.\n")
        self.write("app/pay.py", CODE)
        self.run_tool("mos.py", "init")
        self.run_tool("mos_design.py", "schema", "extract")
        self.write("modernization/workflows/take-a-payment.json", WORKFLOW)
        self.write("modernization/data/target-model.json", MODEL)
        self.write("modernization/architecture/sagas/take-a-payment.json", SAGA)

    def edit(self, path, obj, fn):
        obj = json.loads(json.dumps(obj))
        fn(obj)
        self.write(path, obj)

    def test_schema_extract(self):
        with open(os.path.join(self.d, "modernization/data/legacy-schema.json")) as f:
            s = json.load(f)
        pay = {c["name"]: c for c in s["tables"]["PAYMENT"]["columns"]}
        self.assertEqual(list(pay), ["PAY_ID", "AMT", "STAT", "OLD_REF", "ACCT_ID"])
        self.assertTrue(pay["PAY_ID"]["pk"])
        self.assertEqual(pay["AMT"]["type"], "DECIMAL(12,2)")
        self.assertEqual(pay["ACCT_ID"]["fk"], "ACCOUNT")
        self.assertTrue(pay["STAT"]["nullable"])
        self.assertEqual(s["tables"]["PAYMENT"]["source"], "db/schema.sql:2")
        led = {c["name"]: c for c in s["tables"]["LEDGER-REC"]["columns"]}
        self.assertEqual(led["LEDGER-AMT"]["type"], "PIC S9(10)V99 COMP-3")
        self.assertEqual(led["LEDGER-ALT"]["flags"], ["redefines:LEDGER-AMT"])
        self.assertEqual(led["FILLER"]["flags"], ["filler"])
        self.assertEqual(s["usage"]["PAYMENT"], {"app/pay.py": "CR"})
        self.assertEqual(s["usage"]["ACCOUNT"], {"app/pay.py": "RU"})
        self.assertEqual(s["usage"]["LEDGER-REC"], {"cobol/POST.cbl": "uses"})

    def test_gate_passes_and_writes_build_list(self):
        r = self.run_tool("mos_design.py", "gate")
        self.assertIn("Design gate: PASSED", r.stdout)
        self.assertIn("overloaded or repeating", r.stdout)
        build = self.text("modernization/data/build-list.md")
        self.assertIn("## New schemas (3)", build)
        self.assertIn("| payments.payment.idempotency_key | text | new | safe retries |", build)
        self.assertIn("| PAYMENT.AMT | DECIMAL(12,2) | payments.payment.amount | numeric(12,2) |", build)
        self.assertNotIn("ACCOUNT.BAL |", build)  # same type, different spelling of case only
        self.assertIn("| payment.old_ref | never read | Dana Okafor |", build)
        with open(os.path.join(self.d, "modernization/evidence/design.json")) as f:
            self.assertTrue(json.load(f)["passed"])

    def test_model_blocks_a_lost_column_and_an_unconfirmed_drop(self):
        self.edit("modernization/data/target-model.json", MODEL,
                  lambda m: m["tables"]["payments.payment"]["columns"].pop("amount"))
        r = self.run_tool("mos_design.py", "model", "check", ok=False)
        self.assertIn("legacy column payment.amt has no home", r.stdout)
        self.edit("modernization/data/target-model.json", MODEL,
                  lambda m: m["dropped"]["PAYMENT.OLD_REF"].update(confirmed_by=""))
        r = self.run_tool("mos_design.py", "model", "check", ok=False)
        self.assertIn("dropping data is the owner's call", r.stdout)

    def test_model_blocks_unknown_source_missing_reason_and_ownerless_schema(self):
        def brk(m):
            cols = m["tables"]["payments.payment"]["columns"]
            cols["amount"]["source"] = "legacy:PAYMENT.AMOUNT"
            del cols["idempotency_key"]["reason"]
            m["schemas"]["ledger"]["owner_service"] = ""
        self.edit("modernization/data/target-model.json", MODEL, brk)
        out = self.run_tool("mos_design.py", "model", "check", ok=False).stdout
        self.assertIn("is not in the legacy schema", out)
        self.assertIn("marked new with no reason", out)
        self.assertIn("schema ledger: no owner_service", out)

    def test_workflow_needs_sources_and_owner_decisions(self):
        def brk(w):
            w["facts"]["consistency_need"]["source"] = "assumed"
            w["facts"]["trigger"]["source"] = "I think"
            del w["facts"]["volume"]
        self.edit("modernization/workflows/take-a-payment.json", WORKFLOW, brk)
        out = self.run_tool("mos_design.py", "workflow", "check", ok=False).stdout
        self.assertIn("'consistency_need' is the owner's call", out)
        self.assertIn("fact 'trigger' needs a source", out)
        self.assertIn("fact 'volume' is missing", out)

    def test_saga_rules(self):
        def brk(s):
            s["steps"][0]["compensation"] = ""
            s["steps"][0]["writes"] = ["ledger.entry"]
            s["steps"][2]["kind"] = "compensatable"
            s["steps"][2]["compensation"] = "x"
            del s["steps"][1]["idempotency_key"]
            s["legacy_transaction"] = ""
        self.edit("modernization/architecture/sagas/take-a-payment.json", SAGA, brk)
        out = self.run_tool("mos_design.py", "saga", "check", ok=False).stdout
        self.assertIn("step hold: no compensation", out)
        self.assertIn("service accounts writes ledger.entry, owned by ledger", out)
        self.assertIn("step post: comes after the pivot", out)
        self.assertIn("step charge: idempotency_key is missing", out)
        self.assertIn("legacy_transaction is empty", out)

    def test_two_pivots_and_retriable_before_pivot(self):
        def brk(s):
            s["steps"][0]["kind"] = "retriable"
            s["steps"].insert(1, step("charge2", "payments", "pivot", "payments.payment"))
        self.edit("modernization/architecture/sagas/take-a-payment.json", SAGA, brk)
        out = self.run_tool("mos_design.py", "saga", "check", ok=False).stdout
        self.assertIn("more than one pivot", out)
        self.assertIn("step hold: comes before the pivot", out)

    def test_workflow_marked_saga_needs_a_design_and_single_service_is_noted(self):
        os.remove(os.path.join(self.d, "modernization/architecture/sagas/take-a-payment.json"))
        out = self.run_tool("mos_design.py", "gate", ok=False).stdout
        self.assertIn("is to become a saga but has no saga design", out)
        self.edit("modernization/architecture/sagas/take-a-payment.json", SAGA,
                  lambda s: s.update(steps=s["steps"][1:2]))
        out = self.run_tool("mos_design.py", "saga", "check").stdout
        self.assertIn("A local transaction would do", out)


if __name__ == "__main__":
    unittest.main()
