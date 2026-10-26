| # | Scenario | Shape | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cards | Minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | card-dispute | review | pass | pass | pass | pass | **FAIL** | **FAIL** | pass | pass | 13 | n/a |
| 2 | covenant | review | pass | pass | **FAIL** | pass | **FAIL** | **FAIL** | pass | pass | 12 | n/a |
| 3 | underwriting | review | pass | **FAIL** | **FAIL** | pass | **FAIL** | pass | pass | pass | 13 | n/a |
| 4 | portal | desk | pass | pass | pass | pass | **FAIL** | **FAIL** | pass | pass | 13 | n/a |
| 5 | pharmacy | desk | pass | pass | pass | pass | **FAIL** | **FAIL** | pass | pass | 13 | n/a |
| 6 | utility | desk | pass | pass | pass | pass | **FAIL** | pass | pass | pass | 13 | n/a |
| 7 | airline | desk | pass | pass | **FAIL** | pass | **FAIL** | pass | pass | pass | 13 | 8.1 |
| 8 | returns | desk | pass | pass | **FAIL** | pass | **FAIL** | pass | pass | pass | 13 | 8.4 |
| 9 | saas | rank | pass | pass | pass | pass | **FAIL** | pass | pass | pass | 13 | 7.4 |
| 10 | benefits | review | pass | pass | **FAIL** | pass | **FAIL** | pass | pass | pass | 13 | 8.3 |
| 11 | contracts | review | pass | pass | **FAIL** | pass | **FAIL** | **FAIL** | pass | pass | 13 | 7.5 |
| 12 | recruiting | review | pass | pass | **FAIL** | pass | **FAIL** | pass | pass | **FAIL** | 15 | 8.1 |
| 13 | maintenance | review | pass | pass | pass | pass | **FAIL** | pass | pass | pass | 13 | 7.4 |
| 14 | ap | desk | pass | pass | **FAIL** | pass | **FAIL** | pass | pass | pass | 13 | 7.3 |
| 15 | university | desk | pass | pass | pass | pass | **FAIL** | **FAIL** | pass | pass | 13 | 7.3 |
| 16 | surveillance | desk | pass | pass | **FAIL** | pass | **FAIL** | pass | pass | pass | 13 | 10.5 |
| 17 | nocase | review | pass | pass | **FAIL** | pass | **FAIL** | **FAIL** | pass | pass | 16 | 7.4 |
| 18 | rules | desk | pass | pass | **FAIL** | pass | **FAIL** | pass | pass | pass | 14 | 7.4 |

Failures:
- card-dispute [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- card-dispute [6] holdout eval does not pass all gates (out/proto/router.js)
- covenant [3] clocks missing hours for escalate, human or answer (out/proto/case.json)
- covenant [3] a connector names a vendor without (assumed) (out/proto/case.json)
- covenant [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- covenant [6] holdout eval does not pass all gates (out/proto/router.js)
- covenant [3] local: Close to their clock shows nothing (out/proto/case.json)
- covenant [3] hosted: Close to their clock shows nothing (out/proto/case.json)
- covenant [3] shape review, expected rank (out/gates/a.json)
- underwriting [2] first assistant is not a fixed-rules safety guard (out/proto/case.json)
- underwriting [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- underwriting [3] local: Close to their clock shows nothing (out/proto/case.json)
- underwriting [3] hosted: Close to their clock shows nothing (out/proto/case.json)
- portal [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- portal [6] holdout eval does not pass all gates (out/proto/router.js)
- portal [6] golden 28 rows, holdout 12; expected 30+ and 10+ (out/proto/golden.json)
- pharmacy [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- pharmacy [6] holdout eval does not pass all gates (out/proto/router.js)
- utility [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- airline [3] a connector names a vendor without (assumed) (out/proto/case.json)
- airline [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- returns [3] a connector names a vendor without (assumed) (out/proto/case.json)
- returns [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- saas [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- benefits [3] a connector names a vendor without (assumed) (out/proto/case.json)
- benefits [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- benefits [3] local: Close to their clock shows nothing (out/proto/case.json)
- benefits [3] hosted: Close to their clock shows nothing (out/proto/case.json)
- contracts [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- contracts [6] golden set has fewer than 3 never-list rows (out/proto/golden.json)
- contracts [3] local: Close to their clock shows nothing (out/proto/case.json)
- contracts [3] hosted: Close to their clock shows nothing (out/proto/case.json)
- recruiting [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- recruiting [8] real company name "Salesforce" in out/proto/case.json (out/proto/case.json)
- recruiting [8] real company name "Salesforce" in out/proto/golden.json (out/proto/golden.json)
- recruiting [3] local: Close to their clock shows nothing (out/proto/case.json)
- recruiting [3] hosted: Close to their clock shows nothing (out/proto/case.json)
- maintenance [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- ap [3] a connector names a vendor without (assumed) (out/proto/case.json)
- ap [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- university [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- university [6] dev eval does not pass all gates (out/proto/router.js)
- university [6] holdout eval does not pass all gates (out/proto/router.js)
- university [6] gates.json lacks one of the 8 gates or riskiest_slice (out/proto/gates.json)
- university [6] eval output lists fewer than 8 gates (out/proto/eval.js)
- university [6] eval output has no per-group line (out/proto/eval.js)
- surveillance [3] a connector names a vendor without (assumed) (out/proto/case.json)
- surveillance [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- surveillance [3] local: Close to their clock shows nothing (out/proto/case.json)
- surveillance [3] hosted: Close to their clock shows nothing (out/proto/case.json)
- nocase [3] a connector names a vendor without (assumed) (out/proto/case.json)
- nocase [3] 4 samples, expected 6 with expect (out/proto/case.json)
- nocase [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- nocase [6] holdout eval does not pass all gates (out/proto/router.js)
- rules [3] a connector names a vendor without (assumed) (out/proto/case.json)
- rules [5] fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
