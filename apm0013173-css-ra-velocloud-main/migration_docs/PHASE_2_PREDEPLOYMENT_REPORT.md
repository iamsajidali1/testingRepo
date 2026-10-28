# Phase 2: pre-deployment validation

Validation date: 2026-10-28, Asia/Calcutta. Branch: `codex/fastapi-migration`. Original reference: `063da1e`. Local OS: Windows; test and runtime interpreters: **Python 3.12.14**. Intended primary image: Python 3.14.6 on Linux, not executed here.

**Overall: IMPLEMENTATION_COMPLETE_VALIDATION_PENDING. Controlled dev/test deployment is not yet cleared.** A Linux image build/start, secret-safe build context, deployment configuration/identity checks and the validation gates below are required first. Real integration tests then belong in controlled dev/test; production equivalence is not established.

No production credentials were used, no production endpoint was contacted, and nothing was staged, committed, pushed or deployed. The only application/script correction in Phase 2 is the confirmed one-line startup defect described below. Business logic, routes and `/api/mds/` were not changed.

## Result register

`VERIFIED_PASS` means the named check actually passed within its stated scope. `VERIFIED_FAIL` means a demonstrated failure or a confirmed unmet requirement, including inherited defects. `UNVERIFIED` means missing environment/evidence, not a failure attributed to the migration.

| Check | Status | Evidence and boundary |
|---|---|---|
| Application migration file inventory | VERIFIED_PASS | 103 intended changed paths before this report; 22 tracked modifications/deletions plus 81 additions. Original report contains exact inventory. Runtime modules, oracle fixture and captured presentation assets are intentional |
| Whole-parent-repository commit hygiene | VERIFIED_FAIL | Untracked sibling `../apm0013173-css-ra-velocloud-main_fastapi_codex.zip` is outside application scope. Do not include it in a parent-level broad add. File left untouched |
| Generated test/runtime artifacts excluded from Git | VERIFIED_PASS | `.venv`, `.venv-runtime`, baseline export, coverage/cache/test-results ignored. No tracked pyc, SQLite, generated coverage or JUnit files found; `.coveragerc` is intentional configuration |
| Whitespace check | VERIFIED_PASS | `git diff --check`; CRLF conversion warnings only |
| Full migrated suite | VERIFIED_PASS | 122 passed, zero failures/errors, eight skipped, 247 subtests passed, six deprecation warnings; 87.49 seconds |
| Required Linux tests | UNVERIFIED | All eight `PrivateDatabaseTests` skipped on Windows; no Linux Python available |
| Configured fatal lint / new-boundary import lint | VERIFIED_PASS | Both selector sets return zero. This is not a claim that unrestricted full-style flake8 has no warnings |
| Runtime dependency absence and imports | VERIFIED_PASS | Fresh runtime has no Django, djangorestframework or drf-yasg distributions or import specs; AST runtime-import audit passes |
| Dependency consistency | VERIFIED_PASS | Bundled pip `--python` checks for both environments pass |
| Native ASGI and actual HTTP startup | VERIFIED_PASS | `velocloud_app.asgi:application` exercised in-process and through a real localhost Uvicorn child server; child stopped after checks |
| Authentication/signed sessions/local SQLite | VERIFIED_PASS | Actual original/native isolated SQLite record, signature/password, expiry/tampering/token/cookie/session-deletion tests pass; deployment identity not included |
| CSRF/validation/status/report comparisons | VERIFIED_PASS | Representative original Django differential tests pass; all 46 routes' required-field/OPTIONS contracts covered. Not 46 successful business workflows |
| Original `/api/mds/` behavior preserved | VERIFIED_PASS | Real mismatch test and unchanged business-function source comparison pass |
| `/api/mds/` functional report success | VERIFIED_FAIL | Pre-existing, expressly preserved four-argument call to six-argument function; original HTTP 200 error response remains |
| No-argument `start.sh` before correction | VERIFIED_FAIL | Docker-stub reproduction exits 1: `$1: unbound variable` |
| No-argument `start.sh` after correction | VERIFIED_PASS | `${1:-}` guard; default, `--no-log`, and all-three-option stub runs return zero; script syntax passes |
| Primary Docker/Gunicorn/Helm target consistency | VERIFIED_PASS | All point at ASGI application and Uvicorn worker; bind 8000, two workers, timeout 10000 retained. Static inspection only |
| Docker build/run / Linux Gunicorn | UNVERIFIED | Docker 29.6.2 client exists, server is null; `dockerDesktopLinuxEngine` pipe absent. No build attempted against private registry |
| Helm render / Kubernetes admission | UNVERIFIED | Helm unavailable. Templates/values reviewed, not rendered or applied |
| Ingress prefix at application boundary | VERIFIED_PASS | Original WSGI versus ASGI and direct/prefixed request tests pass for `/svc/velocloud`; real ingress/TLS/proxy identity unverified |
| Secret-file build-context exclusion | VERIFIED_FAIL | Both original/current Docker ignore rules omit `build_secrets`; both Dockerfiles copy the context. Git ignore also omits it. No such real file exists locally; build helper requires one |
| Legacy alternate-image credential retention | VERIFIED_FAIL | Dockerfile.unsecured writes authenticated pip configuration and APK repository URLs in final image. Static, inherited exposure risk; no image/credential used |
| Original TLS verification controls | VERIFIED_FAIL | 52 `verify=False` call sites in unchanged `api/utils.py`, one dormant AAF call. HTTPS host validation does not make these certificate checks effective |
| Upstream URL validation unit behavior | VERIFIED_PASS | Existing tests pass for trusted HTTPS/default/allowlist handling and rejected invalid targets. No DNS/redirect/real-network security proof |
| Actual deployment user/secret continuity | UNVERIFIED | Must verify active records, unchanged signing secret, trusted remote identity and external authorization in dev/test |
| DEBUG exception markup parity | VERIFIED_FAIL | Known native DEBUG traceback layout differs from original Django developer page; no new change in Phase 2. Production generic 500 comparison passes |
| Live business endpoint end-to-end success | UNVERIFIED | **0/46** exercised with real VeloCloud/MySQL/WebSocket services |

## Exact test, lint and runtime commands executed

All commands below ran from the application directory. `BUNDLED_PYTHON` below denotes the literal interpreter path shown in the final two pip commands; it was not a new system configuration. Windows ASGI/socket checks required sandbox escalation for local loopback. Tests still block external transports.

```powershell
.venv/Scripts/python.exe --version
.venv-runtime/Scripts/python.exe --version
.venv/Scripts/python.exe -m pytest api/tests -q --cov=api --cov=velocloud_app --cov-branch --cov-report=term --cov-report=xml:migration_docs/test-results/phase2-coverage.xml --junitxml=migration_docs/test-results/phase2-tests.xml --tb=short
.venv/Scripts/python.exe -m flake8 api velocloud_app manage.py gunicorn.py --count --select=E9,F63,F7,F82 --show-source --statistics
.venv/Scripts/python.exe -m flake8 api/browser.py api/csrf.py api/http.py api/parsers.py api/routing.py api/validation.py velocloud_app/asgi.py velocloud_app/auth_state.py manage.py --select=F401,F811,F821,F822,F823 --count --show-source
.venv-runtime/Scripts/python.exe api/tests/runtime_smoke.py
& 'C:\Users\Pc\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pip --python .venv-runtime/Scripts/python.exe check
& 'C:\Users\Pc\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pip --python .venv/Scripts/python.exe check
```

Direct `.venv/Scripts/python.exe -m pip check` was also attempted and failed with `No module named pip`: this environment was created without pip. The subsequent bundled-pip `--python` command above is the successful environment-consistency check; no dependency installation was needed.

Runtime smoke launches the actual child command (port dynamically selected on loopback):

```text
.venv-runtime/Scripts/python.exe -m uvicorn velocloud_app.asgi:application --host 127.0.0.1 --port <ephemeral-port> --log-level error
```

Real HTTP: `GET /api/swagger.json` returned 200 and Swagger `2.0`; `POST /api/report/billing` with `{}` returned 400 and original required-field JSON. In-process native ASGI additionally checked 46/46 validation responses, original schema initialization, known/unknown token behavior, existing-format sessions, browser/CSRF cookies and static delivery. This does not prove Linux multiworker startup or successful billing generation.

Observed runtime versions: FastAPI 0.162.0, Starlette 1.10.0, Pydantic 2.14.1, Uvicorn 0.54.0, uvicorn-worker 0.4.0, python-multipart 0.0.32, requests 2.34.2, Gunicorn 26.2.0. Gunicorn is installed, not executed on Windows. Original business requirements are still mostly unpinned; the Python 3.14 image resolution must be checked separately.

Additional read-only inspection commands executed:

```powershell
git status --short --untracked-files=all
git status --short --untracked-files=all -- .
git diff --stat
git diff --numstat
git branch --show-current
git diff --check
git check-ignore .venv/pyvenv.cfg .venv-runtime/pyvenv.cfg .baseline.zip .migration-baseline/api/views.py migration_docs/test-results/phase2-tests.xml .dockerenv build_secrets
git ls-files '*.pyc' '*__pycache__*' '*.zip' '*build_secrets*' '*.sqlite3' '*coverage*' '*junit*'
git ls-files -- .dockerenv build_secrets run.sh start.sh
git diff -- start.sh .dockerignore .gitignore
git show HEAD:apm0013173-css-ra-velocloud-main/.dockerignore
git show HEAD:apm0013173-css-ra-velocloud-main/.gitignore
Get-Command docker,helm,wsl -ErrorAction SilentlyContinue | Select-Object Name,Source
docker version --format '{{json .}}'
wsl --list --quiet
wsl -d docker-desktop -e sh -c 'command -v python3; command -v python; command -v helm; uname -s'
```

Python inline read-only audits checked installed distribution names/import specs and runtime import ASTs, parsed coverage XML and route declarations, counted `verify=False` call sites, and inspected only variable names/file existence for local secret configuration. No secret values were emitted. Source/deployment files were read with `Get-Content` and `rg`. These investigative reads did not execute deployment scripts.

## Test evidence and coverage

Raw Phase 2 evidence is retained locally in ignored `migration_docs/test-results/phase2-tests.xml` and `phase2-coverage.xml`. JUnit counts subtests as cases: 377 XML cases are **not** 377 independent collected tests. The headline is 122 passing items, eight skipped, plus 247 passing subtests.

Coverage: **3,839/9,354 statements = 41.04% lines; 1,059/4,560 = 23.22% branches; combined coverage.py display 35%**. `api/views.py` combined coverage 24%, `api/docs_mds.py` 3%. These low business-path figures are explicit evidence against a 100% parity claim. Six warnings are from the test client / original schema-renderer dependencies. No failed test or teardown error in this run.

All four business modules and all 55 view-function ASTs are unchanged according to the full-suite source-comparison test. The original framework source is loaded from the versioned oracle fixture, not a reimplemented mock endpoint.

## Confirmed migration correction

`start.sh` gained `set -u` during migration, but its final optional argument still used `$1`. Before changing it, a temporary copy ran in Git Bash with fake `ENV`/JFROG values and an exported `docker() { return 0; }` function. It failed at line 44 with an unbound variable. The proposed correction was explained to the user before applying it: use `${1:-}`, consistent with the other optional arguments. No Docker command, registry contact, real credential or container deletion occurred in this reproduction.

After the one-line change, the same harness returned zero for no arguments, `--no-log`, and `--no-log --no-network --no-env`. Git Bash `-n` accepted `run.sh`, `start.sh`, and `createproject.sh`. Initial Git Bash execution in the sandbox failed before script startup with Windows process code 3221225794; the actual reproduction and verification ran successfully with approved escalation. The full Python suite ran before this shell-only correction; relevant shell checks passed afterward.

The exact shell-harness command bodies were:

```bash
docker() { return 0; }; export -f docker; bash ./start.sh
docker() { return 0; }; export -f docker; bash ./start.sh --no-log
docker() { return 0; }; export -f docker; bash ./start.sh --no-log --no-network --no-env
```

Python `subprocess.run` invoked `C:\Program Files\Git\bin\bash.exe -c` with those bodies in a temporary directory containing a copy of the script and dummy-only config files; `bash.exe -n` was then invoked with absolute paths to the three repository scripts. Temporary harness directories were removed after use. No persistent validation code was added to the runtime.

## Deployment wiring review

- Primary Dockerfile and Helm use `/app/venv/bin/gunicorn` with `velocloud_app.asgi:application`, `uvicorn_worker.UvicornWorker`, port 8000, two workers and timeout 10000. The ASGI limiter retains one full request per worker; internal business executors remain unchanged. Actual Linux signal handling/process count remains unverified.
- Alternate Dockerfile installs Gunicorn through requirements, retains nginx, and starts `run.sh`. Native `collectstatic` populates nginx's `/app/static`; Gunicorn's UNIX socket `/app/config/gunicorn.sock` matches nginx. UID/permissions and nginx startup on the private Alpine image are unverified. Alpine `latest` and untrusted APK installation behavior are inherited risks.
- The primary image has no nginx and native static routing is DEBUG-only. Therefore the production-mode primary path does not itself serve browser assets. The original production Django path also required external static delivery. Confirm an actual external asset route before calling Swagger/browsable UI production-complete; do not change this silently during validation.
- Application-prefix tests cover both preserved and stripped `/svc/velocloud` paths. `chart/envs/dev.yaml` disables ingress rewriting and uses a Prefix rule; `chart/values-nprd.yaml` inherits the base rewrite configuration. Identify the values file actually used by CI and render it. Do not assume those override paths are equivalent.
- CSI SecretProviderClass object names map to environment aliases; deployment uses the matching synchronized Secret and CSI mount. Service-account annotation and pod workload-identity label are present. Verify actual cloud permissions, CSI synchronization and signing-secret continuity. None were queried here.
- `ENV` must be explicitly supplied for the intended environment. Missing/unrecognized environment defaults to debug behavior; no production claim is possible from unittest-mode Windows startup. `APP_DIR` comes from the image; POD/HOST IP values come from downward API. Database bootstrap is not automatically run at application startup: preserve/reuse existing tables, or initialize a genuinely empty local DB with the native command under the runtime UID before state-backed requests.
- Docker BuildKit secret IDs are `jfrog_username` and `jfrog_access_token` in the primary path; alternate uses `build_secrets`. The local helper translates the legacy token name, but the required file must not be copied into the context/image or committed. The alternate image also persists authenticated package-manager configuration, requiring a separately reviewed remediation/safe build approach before credentialed use.
- Shared external CI workflow internals were not available in Phase 1 and were not re-certified here. Repository CI variables request development dependencies for the oracle tests; run actual company CI before image promotion.

## Required configuration and secrets — names only

| Purpose | Names |
|---|---|
| Core startup / environment | `ENV`, `APP_DIR`, `DJANGO_SECRET` |
| Host / ingress configuration | `POD_IP`, `HOST_IP`, `SCRIPT_NAME` |
| Orchestrator selection and allowlist | `API_BASE_URL`, `API_BASE_ALLOWED_HOSTS` |
| Hardware statistics database | `VELO_DB_HOST`, `VELO_DB_USER`, `VELO_DB_PASS` |
| Proxies | `http_proxy`, `https_proxy`, `no_proxy`, `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` |
| Original optional integrations / dormant AAF | `AAF_USERNAME`, `AAF_PASSWORD`, `PAPERPLANE_TOKEN`, `TMATOMO_API_TOKEN` |
| Private build credentials | `JFROG_USERNAME`, `JFROG_ACCESS_TOKEN`, legacy `JFROG_TOKEN` |
| Primary BuildKit secret IDs | `jfrog_username`, `jfrog_access_token` |
| Alternate BuildKit secret ID / local filename | `build_secrets` |
| CSI / workload identity Helm configuration keys | `secretsStore.clientId`, `secretsStore.tenantId`, `secretsStore.keyVaultName`, `secretsStore.kubernetesSecretName` |
| Request credentials / tenant selection | `X-username`, `X-password`, `X-url`, `X-tenant-id`, optional `Authorization` |

`API_BASE_URL` is a fallback when the request supplies no destination; custom hosts require the existing allowlist rules. Database names are required only for HWStats; dormant/optional integrations are not all startup requirements. `DJANGO_SECRET` retains its historical name for signed-record compatibility and must retain the existing value. No environment values or credentials are reproduced here.

## Security findings requiring company review

1. **Build secret exposure:** `build_secrets` is absent now, but the helper requires it and current ignore rules do not exclude it. Both `COPY .` operations would include a future in-context file. `.dockerenv` is already tracked (currently no assignment names were parsed) and is Docker-excluded; never populate the tracked file with secrets. A commit restricted to intended application paths avoids the unrelated ZIP, but credential-safe image packaging must also be established.
2. **Alternate image credential persistence:** authenticated pip/APK configuration remains in the final image, unlike the primary multi-stage path where builder configuration is not copied as a whole. Do not perform a credentialed alternate build until this risk has been reviewed. No security-policy change was silently made.
3. **TLS:** 53 literal `verify=False` call sites across the utility and dormant AAF sources bypass certificate verification. They are unchanged; a hostname allowlist does not fix this. Package-manager `trusted-host` / `--allow-untrusted` in the alternate path also warrant review. Correcting original security behavior needs separate approval and trusted CA/configuration evidence.
4. **Authorization boundary:** original default DRF API permission behavior permits requests without a token; token authentication validates supplied tokens but does not make absent-token requests forbidden. AAF middleware was commented out in the supplied baseline. Verify the real ingress/SSO authorization boundary and tenant scoping before exposing this service. Native remote identity accepts trusted ASGI metadata, not arbitrary request headers; actual injection remains unverified.
5. **Upstream targets:** HTTPS, server-controlled allowlist/suffix, embedded-credential/query/fragment checks remain unchanged and unit-tested. Real DNS/proxy/redirect behavior is unverified. HTTP client redirect behavior is not a demonstrated egress restriction. Many original upstream calls lack explicit timeouts; preserve them here but test fault behavior in dev/test.
6. **State/debug:** reuse the signing secret and active schema. SQLite is pod-local temporary state, not shared persistence across replicas/restarts. Ensure owned private storage and authorization/cookie behavior under the actual proxy. DEBUG is enabled outside `prod`; restrict dev/test access and verify intended environment selection. Original request/business logging still needs data-exposure review. No blanket new authorization, TLS policy, cookie or CSRF behavior was introduced.

## Endpoint evidence interpretation

**Real-service successful end-to-end tests: 0/46.** Every route has original-versus-native HTTP required-field and OPTIONS evidence. The table below separates that baseline contract coverage from additional successful **simulated** HTTP execution or direct view unit tests. A successful simulated workbook uses real calculations/encoding but replaced upstream/database transport. It is not a live service end-to-end pass.

Three routes have simulated successful HTTP business execution: HWStats (JSON/XLSX with replaced SQL transport), `/api/report/mds` (empty inventory, real eight-sheet workbook and replaced VeloCloud transport), and network overview (replaced VeloCloud transport; concurrency checks). The network-overview success check is not a complete Django differential business-success comparison; its failure/rendering path is compared separately. MDS legacy failure and RMA creation rejection are deliberately unsuccessful paths. Additional original helper/report unit tests do not automatically establish an endpoint workflow pass.

## Critical deployment blockers and company dev/test plan

**Before a controlled deployment can be cleared:**

1. Establish a build context that cannot include `build_secrets` or other credentials, and address/review final-image credential retention before using the alternate Dockerfile. These findings are inherited and were not silently repaired under a migration-only instruction.
2. Build the intended private Linux/Python 3.14 image and start it under UID 10001; verify Gunicorn worker import, two-worker behavior, mounted temporary directory ownership, read-only root filesystem, socket/nginx behavior for the alternate path, and shutdown/signals. The local Docker daemon must be made available by its operator, or use company CI.
3. Run the eight Linux storage tests without skips. A separate Linux test environment needs `requirements-dev.txt`; runtime image dependencies alone intentionally cannot run the Django oracle. Ensure test transports remain isolated.
4. Render the actual Helm values used by CI; confirm image reference, environment selection, ingress rewrite/prefix, trusted proxy scheme/host, cloud identity, synchronized secrets, and an external production static-asset route. Verify an existing auth database/secret pair before requests that use active state. Do not invent/replace user records or a signing key.
5. Confirm the external authorization/tenant boundary and get company review of inherited TLS bypasses before any wider exposure. Keep the first deployment restricted to an approved dev/test tenant and reviewed test credentials/data. Resolve or explicitly accept the remaining DEBUG presentation contract difference before claiming full parity.

**Tests that require company dev/test resources:**

| Resource | Required tests | Current status |
|---|---|---|
| Real nonproduction VeloCloud and reviewed credentials | All 46 valid workflow request/response comparisons, login/logout, tenant selection, timeouts/retries/partial failures; read-only reports first | UNVERIFIED |
| Disposable authorized provisioning tenant | User creation, edge provisioning variants, configuration/policy changes and complete RMA OS/license/configuration sequence; verify intended results and recovery | UNVERIFIED |
| Real MySQL test schema/data | HWStats query/type/timezone/permissions behavior, JSON and XLSX, empty/large results and server errors | UNVERIFIED |
| VeloCloud edge/gateway WebSocket endpoints | `/api/report/tunnelsExport`, `/api/report/bgpFromGateway`, handshake/proxy/cookies, message/poll/timeout/close/failure behavior | UNVERIFIED |
| Populated report fixtures and original Django executable/oracle | Every report's semantic workbook/JSON output: populated MDS profiles/segments/policies, formulas/charts/styles/filenames and time boundaries, large inventories | UNVERIFIED |
| Existing auth state and trusted ingress identity | Active/inactive users and tokens, old signed sessions, expiry/tampering/logout, concurrent requests, cookies/CSRF, proxy scheme/host/prefix and authorization | UNVERIFIED outside local isolated SQLite tests |
| Kubernetes + CSI/Key Vault + registry | Real Helm render/admission/startup, required secret names populated, no secret values in image/logs, external assets, UID/volume ownership, worker capacity | UNVERIFIED |
| Company CI/shared reusable workflow | Correct oracle/test dependencies, lint/test/coverage quality gates, intended runtime-only image dependencies | UNVERIFIED |

Linux commands to execute later (**not executed here**):

```sh
python -m pip install -r requirements-dev.txt
python -m pytest api/tests/test_settings.py::PrivateDatabaseTests -q
python -m pytest api/tests -q --cov=api --cov=velocloud_app --cov-branch
helm lint chart -f chart/envs/dev.yaml
helm template phase2-dev chart -f chart/envs/dev.yaml
```

Use the company's actual values file if different; the commands above are not a deployment or approval to contact any service. Build/run commands depend on approved private-registry credentials and the corrected credential-safe context; none were executed here.

The preserved `/api/mds/` defect does not block framework comparison tests, but **does block a claim that this endpoint successfully generates its report**. It must remain a separate approved fix; do not make it pass by mocking the invocation or supplying guessed arguments. Report comparison success elsewhere does not waive this defect.

The next readiness milestone is **READY_FOR_CONTROLLED_DEV_TEST_VALIDATION** only after the packaging, Linux startup, identity/configuration and exposure prerequisites above have evidence. Live integration validation is then required to move beyond it. This report does not grant production release readiness.

## Complete endpoint evidence table

<!-- endpoint-evidence -->

| Business endpoint | Contract tests | Additional evidence | Real-service success |
|---|---|---|---|
| `/api/report/billing` | VERIFIED_PASS | Additional real HTTP validation and broad boundary/auth/prefix/production-error checks; no successful billing workflow. | UNVERIFIED |
| `/api/report/linkMetrics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/QOEMetrics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/deviceCount` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/routingTable` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/cssLocation` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/user/add` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/mds/` | VERIFIED_PASS | Real unchanged argument-mismatch HTTP error and five-call sequence compared; functional report VERIFIED_FAIL. | UNVERIFIED |
| `/api/report/mds` | VERIFIED_PASS | Simulated HTTP success: real eight-sheet empty-inventory workbook; exact six upstream calls; populated report UNVERIFIED. | UNVERIFIED |
| `/api/report/lmac` | VERIFIED_PASS | Additional direct view policy update/insert/error units with business helpers mocked; no successful HTTP workflow. | UNVERIFIED |
| `/api/report/vcoConfigReport` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/vcoGatewayMigrations` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/edge/provision` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/edge/aaedgeprovision` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/linksDownParser` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/utilisationMetrics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/getNetworkOverviewInfo` | VERIFIED_PASS | Simulated HTTP success and concurrency; replaced VeloCloud transport; production rendering-failure differential. | UNVERIFIED |
| `/api/report/troughputMax` | VERIFIED_PASS | Direct view upstream-license failure unit; no successful HTTP workflow. | UNVERIFIED |
| `/api/report/getEdgeNames` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/linkStatistics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/packetloss` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/objectgroups` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/licenses` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/applicationInsight` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/aggregatedLinksStatistics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/aggregatedEdgeStatistics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/gamingApplicationInsight` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/staticRoutesExport` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/siteInfoDetail` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/edge/provisionCitizens` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/flowsExportGE5` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/SephoraListPaths` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/tunnelsExport` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/edgeMetricsInfo` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/bgpFromGateway` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/msimLicense` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/dailyEdgeStatistics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/dailyCircuitStatistics` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/publicIpExport` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/AdidasLMAC` | VERIFIED_PASS | Additional direct view policy update/insert/error units with business helpers mocked; no successful HTTP workflow. | UNVERIFIED |
| `/api/report/hwstats` | VERIFIED_PASS | Simulated HTTP success: real JSON/XLSX; identical SQL/parameters and cleanup with replaced MySQL transport; failure/empty units. | UNVERIFIED |
| `/api/report/ServiceManagerReport` | VERIFIED_PASS | Direct view response/generator wiring unit with report generator mocked; separate report helper tests. | UNVERIFIED |
| `/api/report/CapacityPlanner` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/citizenswanlinks` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/report/DanoneBPExtract` | VERIFIED_PASS | Contract-only endpoint evidence; supporting helper tests, where present, are not a complete route execution. | UNVERIFIED |
| `/api/edge/EdgeRMA` | VERIFIED_PASS | HTTP creation-rejection call sequence/payload differential; direct mocked success/error units; no successful HTTP provisioning flow. | UNVERIFIED |
