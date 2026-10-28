# Test execution and parity evidence

Final full run, 2026-10-28, Windows/Python 3.12.14:

```text
.venv/Scripts/python.exe -m pytest api/tests -q --cov=api --cov=velocloud_app --cov-branch --cov-report=term --cov-report=xml:migration_docs/test-results/fastapi-coverage.xml --junitxml=migration_docs/test-results/fastapi-tests.xml --tb=short
122 passed, 8 skipped, 6 warnings, 247 subtests passed in 79.32s
```

The eight skips are the original Linux-only SQLite ownership/mode/symlink tests, which failed in the unmodified Windows baseline. They must run on Linux. Six warnings concern test-client/oracle dependency deprecations, not runtime test failures. JUnit includes subtests as cases (377 final cases); do not inflate the headline 130 collected items into 377 independent tests.

| Coverage measurement | Original baseline | FastAPI final |
|---|---:|---:|
| Executed statement lines | 2,686 / 8,267 | 3,839 / 9,354 |
| Line coverage | 32.49% | 41.04% |
| Branch coverage | Not measured | 1,059 / 4,560 = 23.22% |
| Combined coverage.py display | 32% (no branches) | 35% (includes branches) |

These are different source populations after framework replacement; they are not a like-for-like business-coverage improvement claim. `api/docs_mds.py` is only 3% combined coverage and `api/views.py` 24%; most business paths still require tests with representative data. High boundary coverage cannot substitute for business parity.

`api/tests/test_migration.py` compares real original Django HTTP execution with native FastAPI: all 46 POST missing-field errors and OPTIONS metadata; four serializers with nested/coercion/null/default/date/form cases; negotiation, methods, malformed payloads and tokens; browser/Swagger/static output; CSRF; native/old signed records and real isolated SQLite state; ingress prefixes using original WSGI middleware; natural MDS failure; real HWStats and empty MDS workbook generation; RMA rejection/upstream order; network overview and request isolation. Test names identify the precise exercised cases. Original business modules are shared only after source-preservation tests prove their normalized text unchanged; view/serializer oracle source is loaded from the original fixture.

The independent runtime environment was installed from `requirements.txt` only. `api/tests/runtime_smoke.py` asserts Django, DRF and drf-yasg are absent, imports/executes the ASGI app, checks all 46 validation paths, original-schema bootstrap, native tokens/sessions, browser/CSRF/Swagger/static behavior. Runtime package dependency checks pass. This is additional evidence, not counted among the 122 pytest passes.

Fatal lint (`E9,F63,F7,F82`) passes. New boundary/state modules also pass unused/import/undefined-name checks (`F401,F811,F821,F822,F823`). Shell syntax passes. An intermediate Windows run had a timeout in the original bounded numeric parsing subprocess test; the test and its timeout were retained unchanged, and both the targeted rerun and final full run passed. An intermediate streaming-static assertion helper was corrected before the final green run.

Evidence XML is retained locally in ignored `migration_docs/test-results`. Tests and the baseline fixture are versioned for reproduction. External sockets/MySQL are denied unless explicitly replaced with local test transports. No live upstream, MySQL or production data parity is claimed. Linux, Docker/Helm and deployment integration remain pending (document 11).

Additional runtime transport check: a real local Uvicorn HTTP listener was launched using the fresh runtime interpreter with Django/DRF absent. Swagger 2 returned successfully and POST validation returned the original 400 JSON body. The child server was stopped after the check. This verifies local HTTP startup, not Linux Gunicorn/container startup.
