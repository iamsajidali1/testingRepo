# Phase 3 approval proposal: security-safe packaging

Date: 2026-10-28 (Asia/Calcutta). **PROPOSED ONLY — security-sensitive changes have not been applied.** This document is the reviewable approval boundary requested by the user. Phase 1/2 application implementation is retained. No business logic, API contract, calculation, authentication state, TLS policy or `/api/mds/` correction is proposed.

Current readiness: **NOT READY_FOR_CONTROLLED_DEV_TEST_VALIDATION**. Packaging failures and Linux/container validation gaps below must be resolved first. No production credentials, production endpoints, deployment, push or CI dispatch were used during this investigation.

## Proposed changes by exact file

| Affected file | Confirmed risk / reason | Proposed minimal correction |
|---|---|---|
| `.dockerignore` | Broad Docker context permits future `build_secrets`, private config, caches and developer files. Both Dockerfiles currently use broad COPY | Change to default-deny context with an explicit list of current runtime source/data/browser-asset paths and their parent directories. Omit tests/oracle ZIP, local envs, DBs, build_secrets, keys, archives, caches, CI, charts and migration documents. The Dockerfile itself remains available to the builder; excluded secrets remain available only through BuildKit's separate secret channel |
| `.gitignore` | `build_secrets` and `.dockerenv` are not excluded; ignoring does not protect already tracked files | Exclude private env/config, build-secret variants, key/certificate credential files, local DBs, generated archives and development output. Preserve legitimate public application JSON and licensed assets. Do not blanket-ignore all JSON or all config files |
| `.dockerenv` (tracking only) | The placeholder is already tracked; adding an ignore entry alone cannot protect future local values | Stop tracking this one file while preserving its local copy. Add the ignore rule and the safe example below. No history rewrite or deletion of local credential data; no commit is made automatically. This requires an index change limited to this path after approval |
| `.dockerenv.example` (new) | Developers need the names of expected local runtime configuration without a tracked secrets file | Add a small example with configuration names/empty secret placeholders only; no real values. Continue using the existing local `.dockerenv` filename |
| `Dockerfile` | Authenticated pip config persists in a builder layer/cache even though the final stage copies only the virtualenv. Broad source COPY is unnecessary | Keep original Python 3.14.6 base images and package operations. Retain secret IDs `jfrog_username` and `jfrog_access_token`; make required mounts explicit. Generate authenticated pip config and private installation logs only on a BuildKit tmpfs, direct pip there, and do not persist package-manager config/cache. Suppress private install output on success/failure; emit only the failed operation name. Use explicit runtime COPY sources in addition to the context allowlist. No secret ARG/ENV or shell tracing |
| `Dockerfile.unsecured` | Authenticated APK repositories and pip config survive in final image layers. `/app/run.sh` is executed directly but Git tracks it as mode 0644 | Retain original Alpine base, package list and update/upgrade/install sequence, nginx and UID 10001. Keep legacy BuildKit `build_secrets` input for compatibility, required and mounted separately from context. Use a temporary authenticated APK repositories file and temporary pip config/logs on tmpfs, within the same secret-mounted RUN that performs the relevant installs. Do not write credentials to `/etc/apk/repositories` or persistent pip config. Do not copy the secret. Apply executable permissions explicitly when copying run.sh. Use explicit runtime COPY sources |
| `.gitattributes` (new) | Windows checkout conversion can make Linux shell entry points invalid | Add a narrow shell-script LF rule (`*.sh text eol=lf`). This changes packaging line endings, not shell behavior |
| `start.sh` | Must stay aligned with existing primary BuildKit IDs and avoid printing or baking private input | Keep primary secret IDs and legacy token-name fallback. Support supplied build credentials from the environment, with the ignored local secret file only as fallback; never print/source with tracing. Keep runtime config in ignored `.dockerenv`. Validate required inputs by name only and reject credentials embedded in proxy build-argument URLs. Preserve launch arguments/port and do not run this helper automatically, because it builds and replaces a container |
| `run.sh` | Alternate startup depends on public static collection, nginx and the UNIX socket; it must not expose private directory contents | Keep collectstatic, nginx, cleared alternate SCRIPT_NAME and exec Gunicorn. Remove only the unnecessary `/var/log/nginx` directory listing. No shell tracing or credential/config dumps. Preserve current worker configuration |
| `azure-pipelines.yml` | DockerInstaller pins 17.09.0-ce, incompatible with current BuildKit secret-mount Dockerfiles | Remove the obsolete installer step; use the provisioned company runner's BuildKit-capable engine/buildx and add a fail-fast version/capability preflight. Explicitly enable BuildKit for the build task. Retain current two secret-ID mappings and credential-free proxy argument names. Fail safely if the runner lacks capability rather than installing/upgrading a daemon automatically |
| `velocloud_app/asgi.py` | Primary image has no nginx; its bundled static route is registered only when DEBUG is true | Register the existing fixed-directory bundled asset handler in all environments. Serve only packaged public assets under the original `/static/` path, retaining its containment checks, prefix handling and existing headers. Do not mount the application root, documents or user uploads. No business route/authentication/CSRF redesign |
| `api/tests/test_migration.py` | Need evidence that the specific packaging/static corrections work | Add only focused assertions for approved packaging exclusions/entry-point consistency and bundled asset delivery under prod configuration. Preserve all existing source/contract/report/MDS tests. Use dummy canary secrets to test context exclusion and redaction; never actual credentials |
| `migration_docs/PHASE_3_SECURITY_PACKAGING_PROPOSAL.md` and follow-up validation report | Separate approved scope, inherited risks and actual evidence | Record approval scope, exact diffs/commands, redacted results and remaining company gates. Do not rewrite the Phase 2 evidence as if checks had run on Linux |

No changes are currently proposed to `requirements.txt`, business modules/views/serializers, `gunicorn.py`, `nginx.conf`, Helm identity/secret mappings, `.github/workflows/*`, or `.github/variables/*`. Their required ASGI target and public runtime names remain. A newly confirmed issue in those files would be explained before expanding this scope.

## Build credential handling, concretely

Primary input stays `--secret id=jfrog_username,env=JFROG_USERNAME` and `--secret id=jfrog_access_token,env=JFROG_ACCESS_TOKEN`. Existing Azure mapping from `JFROG_TOKEN` to the second ID remains valid: secret ID and host environment name are distinct.

Alternate input stays `--secret id=build_secrets,src=<private-file>`; the host file can be excluded from the context without preventing a separate secret mount. No public Docker ARG carries the credential content. Installation retains its original package choices and authentication to the same package repositories.

Authenticated repository/config files and captured install logs exist only in the secret-mounted RUN's tmpfs. APK operations use the temporary repositories-file input instead of editing the image's persistent repository file. Pip operations use a temporary PIP_CONFIG_FILE instead of `pip config set`. Config is created without xtrace. On an installation failure, print the operation name and exit nonzero without printing private logs or URLs. Retain the original optional wheel-uninstall behavior; do not broaden which package failures are ignored.

Keep credential-free proxy endpoint arguments consistent across Dockerfiles/helper/CI. Embedded proxy credentials must fail preflight with a name-only message, rather than being stored in image ENV/metadata. If company installation actually requires an authenticated proxy, that credential needs a separately reviewed secret-mounted input; do not guess or silently pass it as a build argument.

BuildKit mount behavior protects mounted files, not arbitrary data a command copies or prints. Context allowlisting, transient package config, suppressed private tool logs and post-build layer/metadata scans are all required. Deleting a secret in a later Docker layer is not an acceptable fix. Existing caches/previously published images are outside this working-tree cleanup; an operator must assess any previous exposure and rotation separately, without this task rotating active credentials.

An allowlist cannot prove that a developer has not embedded a password inside an allowed source file. A redacted candidate-secret scan and review of the exact commit set remain necessary. Do not claim a universal secret-free guarantee based only on `.dockerignore`. The sibling ZIP export remains outside the commit scope and is not deleted.

## Runtime files and browser assets

Retain all application Python modules, required JSON/reference data, original documents and browser assets. Specifically, business code reads `api/app_additional.json` and root `ADI_ip_ranges.json`; these must survive context restriction. Existing original data files and document path dependencies must be accounted for before excluding any current runtime file. The final explicit list will be compared against the runtime dependency inventory and smoke tests.

The bundled `drf-yasg` and `rest_framework` directories contain public JS/CSS/fonts/images and licenses, **not Django/DRF Python runtime packages**. They are required by preserved Swagger 2/ReDoc/browsable HTML. Removing them breaks required presentation behavior.

Alternate path: run.sh collects public assets to `/app/static`, and nginx serves `/static/`. Keep it. Primary path: Gunicorn/ASGI currently has no prod asset registration, so self-contained prod asset delivery fails by source inspection. Proposed fix reuses the existing ASGI asset handler for the exact public directory even with DEBUG disabled; arbitrary filesystem files remain inaccessible. Ingress-prefixed and direct paths must both be tested. This change needs explicit approval because it changes production route availability for public assets.

Actual external ingress static handling is **UNVERIFIED**. No evidence in the supplied ingress configuration identifies a separate static server; therefore external asset hosting cannot be assumed as a substitute for this fix.

## CI and environment observations

The repository Azure build task already supplies the two correct primary BuildKit secret IDs. It also pins Docker 17.09 earlier, which is incompatible. The legacy Azure job's `No Test Suits to Execute!` step is not evidence that tests run; local Phase 2 tests passed separately. Replacing an entire company CI design is not proposed here. Linux full-suite execution must be a distinct evidenced check before readiness.

GitHub CI delegates to an externally referenced reusable workflow. Its internal Docker build-secret handling was unavailable in Phase 1/2; no local schema for inventing new shared-workflow variables is available. Keep repository variables unchanged unless that contract can be verified. No workflow is dispatched automatically: existing workflows may push/promote/deploy.

Render `chart/envs/dev.yaml` and also compare `chart/values-nprd.yaml`: they select different ingress rewriting behavior. Confirm which is actually consumed by the shared dev deployment path. Do not change tenant IDs, hostnames, identities, secret contents, ingress authorization or environment selection speculatively.

## Results at the approval boundary

| Check | Status | Evidence |
|---|---|---|
| Primary and alternate broad context COPY | VERIFIED_FAIL | Both Dockerfiles copy `.`, current ignore rules omit build_secrets/private variants |
| Alternate authenticated config in layers | VERIFIED_FAIL | APK repository edits and pip config writes persist in separate RUN layers |
| Primary builder-layer credential residue | VERIFIED_FAIL | Persistent authenticated pip config in builder stage; final-stage copying does not erase builder cache |
| Alternate direct shell entry point permissions | VERIFIED_FAIL | Git mode 100644 for run.sh; direct CMD has no executable COPY/chmod guarantee on a Linux checkout |
| Azure build-tool compatibility | VERIFIED_FAIL | DockerInstaller pin 17.09 precedes secret-mount Docker build task |
| Public browser assets are needed | VERIFIED_PASS | Original/captured HTML references bundled JS/CSS; Phase 2 browser/static comparisons passed |
| Primary self-contained prod public asset routing | VERIFIED_FAIL | ASGI route registration guarded by DEBUG; primary image does not launch nginx |
| Real ingress static/identity/secret behavior | UNVERIFIED | No dev cluster requests or cloud-secret access performed |
| Docker/Linux build/run availability | UNVERIFIED | Recheck: Docker client 29.6.2, server null, dockerDesktopLinuxEngine pipe absent |
| Linux Python / Helm availability | UNVERIFIED | Existing docker-desktop WSL reports Linux but no python3 or helm; host Helm absent |
| New security corrections | UNVERIFIED | Awaiting explicit approval; no affected runtime/config file modified in this phase |

## Post-approval validation, without deployment

1. Apply only the approved packaging/static changes. Review exact diff; scan context, Git candidate paths, image metadata and saved layers using dummy canary credentials with values never printed. Verify required runtime files survive and local private files do not.
2. If an authorized engine and nonproduction build inputs are available, build intended private Python 3.14 Linux image. Do not substitute a public Python 3.12 image and report it as the intended image. An inaccessible registry/engine remains UNVERIFIED. Do not start/upgrade Docker Desktop or contact Key Vault without a separately authorized need.
3. Start actual Gunicorn/Uvicorn ASGI under UID 10001 with read-only root and bounded writable mounts. Use test-only local secrets. Verify two workers, ownership/modes, direct and prefixed HTTP, public assets with DEBUG disabled, protected path rejection, cookies/statuses and shutdown of both workers. Build/start alternate nginx path separately; do not infer its result from the primary image.
4. Run all eight POSIX private-SQLite tests and full migrated suite in a separate Linux test environment with development-only Django oracle dependencies; verify runtime image still lacks Django/DRF. Record exact Python version, commands, failures/skips/coverage. Do not add Django to the deployed image merely to run oracle tests.
5. If Helm becomes available, render/lint the actual company dev values locally. Review command/image, prefix, environment, volumes, read-only root, workload identity annotations/labels and SecretProviderClass synchronization names. Rendering is not cloud permission or admission proof.
6. Do not deploy, push, trigger workflows that publish/deploy, use production secrets or perform live business mutations. If required capabilities remain unavailable, record each missing result as UNVERIFIED rather than re-running more Windows unit tests as a substitute.

## Separate inherited behavior decisions — excluded from this approval

| Item | Existing behavior | Company decision/evidence required |
|---|---|---|
| TLS | 52 literal verify=False call sites in api/utils.py, one dormant AAF call; alternate APK --allow-untrusted and trusted-host behavior | Approved CA/TLS policy and service compatibility testing. No TLS policy change proposed here; credential-safe transient package config retains installation behavior |
| Default authorization | Original API accepts absent-token requests; supplied malformed/invalid tokens are rejected. AAF middleware was commented out; trusted remote identity is deployment-dependent | Confirm actual ingress/SSO and tenant authorization boundary before exposure. Do not silently add login requirements or alter existing users/tokens/sessions |
| DEBUG developer HTML | Native exception traceback markup differs from original Django developer page; production generic 500 comparison passes | Explicit acceptance or separately scoped presentation correction. Do not label full parity while unresolved |
| Legacy MDS defect | Four positional arguments supplied to a six-argument function; real caught error returns original HTTP 200 body | Separate approved business fix only after required inputs are confirmed. This phase does not modify it |

Remaining company dev/test integration tests are unchanged: successful workflows for all 46 endpoints with reviewed VeloCloud credentials/tenant data; MySQL schema/data/permissions and large HWStats output; edge/gateway WebSocket handshake/proxy/poll/timeout/close; populated workbook goldens; real ingress identity and active signed records; provisioning/RMA/config mutations in a disposable approved tenant. Current real-service end-to-end pass count remains 0/46.

## Approval requested

Approve the file-scoped packaging/CI corrections and the public bundled-asset registration above, or approve packaging only and retain static serving as an unresolved deployment blocker. TLS, default authorization, DEBUG HTML and the legacy MDS defect remain outside this change set. Approval is required by the user's explicit Phase 3 instruction to review security-sensitive changes first, not by an added skill or automatic tool-review rejection.
