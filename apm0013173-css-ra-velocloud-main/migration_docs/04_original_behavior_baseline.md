# Original behavior baseline

Reference: commit `063da1e` (`unzip velo`). The supplied ZIP checkout, rather than an assumed live deployment, is the authority for this comparison. Inventory and definition mappings are in documents 01–03. Original framework source needed by the test oracle is versioned in `api/tests/fixtures/django_baseline.zip`; no baseline source is imported by the deployed application.

The original application has 46 business routes, four schema/UI routes, and a root redirect. Business routes implement POST and DRF OPTIONS. Case, unusual spellings, and the sole business trailing slash (`/api/mds/`) are contractual. DEBUG static serving is additional framework behavior. Original serializers number four. Original HTTP entry point is WSGI with ingress-prefix normalization.

The unmodified baseline ran on Windows/Python 3.12.14: **89 passed, 8 failed, 7 teardown errors**, 97 collected items, no skips; 84.741 seconds. All failures were in the eight original POSIX private-SQLite tests (ownership/mode/symlink/Windows cleanup behavior). They are not evidence that these controls fail on Linux. Baseline line coverage: **2,686/8,267 = 32.49%**. Branch measurement was not enabled. JUnit also represents subtests as cases; its larger case count must not be described as the collected-test count.

Evidence retained locally: `migration_docs/test-results/django-baseline.xml` and `django-baseline-coverage.xml`. Raw generated results are ignored by Git; rerun tests to reproduce current results. The fixture and tests are versioned.

## Pre-existing MDS defect — preserve, separate approved fix required

Caller: `api/views.py`, `Mds.post`, route `/api/mds/`. Callee: `api/docs_mds.py`, `mds_generate(edge_list, dpi_apps, dpi_cat, apps, profiles, segs)`. The caller supplies **four positional arguments to a six-argument function**, not a five-argument function as initially described in the clarification question. The missing arguments are `profiles` and `segs`.

With valid `vco_url`, `vco_username`, `vco_password` and successful login/data fetches, the original invocation raises TypeError. Its existing broad business exception handler returns **HTTP 200 with the exception text in the original error response**. A successful status is therefore not a successful report. Invalid serializer input returns its existing validation error first; an earlier upstream failure may also prevent reaching the invocation.

`test_mds_real_argument_mismatch` compares original Django and FastAPI HTTP bodies/status/headers and the five upstream POST calls. It invokes the real, unchanged `mds_generate`; the mismatch is not mocked and no error body is hardcoded in runtime code. No fifth/sixth argument or signature correction was introduced. This endpoint remains functionally defective, with preservation expressly requested by the user. The distinct `/api/report/mds` endpoint has a six-argument call and separate limited workbook-success evidence.

The repository is not a capture of production traffic, package versions, active database contents, or deployment overrides. Those remain external validation inputs.
