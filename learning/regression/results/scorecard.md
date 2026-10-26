| # | Scenario | Shape | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cards | Minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | card-dispute | desk | pass | pass | **FAIL** | pass | pass | pass | pass | pass | 11 | 9.0 |
| 2 | covenant | rank | pass | pass | pass | pass | pass | **FAIL** | pass | pass | 12 | 7.1 |
| 3 | underwriting | review | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 6.9 |
| 4 | portal | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 7.5 |
| 5 | pharmacy | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.0 |
| 6 | utility | desk | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 7.7 |
| 7 | airline | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 10.0 |
| 8 | returns | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 5.7 |
| 9 | saas | rank | pass | pass | pass | pass | pass | pass | pass | **FAIL** | 12 | 6.3 |
| 10 | benefits | desk | pass | pass | **FAIL** | pass | pass | pass | pass | pass | 11 | 6.7 |
| 11 | contracts | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 14.8 |
| 12 | recruiting | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 9.3 |
| 13 | maintenance | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 9.2 |
| 14 | ap | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 9.4 |
| 15 | university | chat | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 7.3 |
| 16 | surveillance | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 22.2 |
| 17 | nocase | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.5 |
| 18 | rules | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 7.4 |

Failures:
- card-dispute [3] shape desk, expected review (out/gates/a.json)
- covenant [6] holdout eval does not pass all gates (out/proto/router.js)
- saas [8] real company name "Acme" in out/prd.md (out/prd.md)
- saas [8] real company name "Acme" in out/proto/case.json (out/proto/case.json)
- benefits [3] shape desk, expected review (out/gates/a.json)
