| # | Scenario | Shape | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cards | Minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | card-dispute | review | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 9.2 |
| 4 | portal | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 8.7 |
| 9 | saas | rank | pass | pass | pass | pass | pass | pass | pass | pass | 12 | 7.7 |
| 15 | university | desk | pass | pass | pass | pass | pass | **FAIL** | pass | pass | 13 | 8.7 |
| 17 | nocase | desk | **FAIL** | pass | pass | pass | pass | pass | pass | pass | 17 | 9.0 |
| 18 | rules | desk | pass | pass | pass | pass | pass | pass | pass | pass | 15 | 9.8 |

Failures:
- university [6] holdout eval does not pass all gates (out/proto/router.js)
- university [6] sealed holdout scored against 3 router versions; 1 is clean, 2 is one disclosed repair (out/proto/holdout-log.jsonl)
- nocase [1] questions asked 17, expected 11 to 16 (out/state.md)
- nocase [1] case.json decisions 17, expected 11 to 16 (out/proto/case.json)
