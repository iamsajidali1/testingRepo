# Deployment changes and validation

| File | Necessary change |
|---|---|
| `requirements.txt`, `requirements-dev.txt` | Remove Django/DRF/drf-yasg from runtime; add pinned FastAPI/ASGI/parser dependencies; oracle/test dependencies development-only |
| `Dockerfile` | Gunicorn ASGI target and Uvicorn worker; original private Python 3.14.6 base, port 8000, UID, two workers, timeout, secrets and proxy conventions retained |
| `Dockerfile.unsecured`, `run.sh` | Replace uWSGI execution with Gunicorn ASGI, retain nginx and collected self-hosted browser assets |
| `gunicorn.py` | ASGI application target and `uvicorn_worker.UvicornWorker`; Gunicorn configuration key remains named `wsgi_app` |
| `chart/templates/deployment.yaml` | Native ASGI target/worker only; original ingress, identities, secrets, volumes and security context retained |
| `start.sh` | POSIX shell sourcing, primary Docker BuildKit secret wiring, matching proxy build arguments; no shell credential tracing |
| `manage.py` | Native `runserver`, `migrate --noinput`, `collectstatic --noinput` |
| `.dockerignore`, `.gitignore` | Exclude virtual environments, original checkout export, oracle/tests and local evidence from runtime image or Git as appropriate |
| `.coveragerc`, `.github/variables/ci_vars.yaml` | Application coverage source paths; development test dependencies and bounded source lint scope |
| `README.md` | Startup, data/secret continuity, development oracle and validation limits |

Obsolete Django WSGI/root URL modules and `uwsgi.ini` are removed. Original root/documentation routing and prefix behavior move to `velocloud_app/asgi.py`; old WSGI regression coverage is replaced with native ASGI and actual original WSGI differential tests using the fixture.

The user confirmed only repository-referenced management commands are in scope; no references to createsuperuser, token creation, password changes or clearsessions were found. Native CLI does not pretend to implement every Django administration command. Its schema command preserves the current schema; it is not a general Django migration engine.

Verified locally: full pytest suite; fatal source lint; POSIX shell syntax (`bash -n run.sh start.sh createproject.sh`); fresh runtime dependency check; Django-free import/in-process ASGI checks. `test_real_original_wsgi_and_native_asgi_prefix` compares original middleware and native handling under ingress prefixes; direct internal paths, redirect/schema links, HEAD and prefix boundaries are checked. No unexpected default FastAPI documentation endpoints are enabled.

Unverified deployment gates: Docker daemon is unavailable, private base images were not built, Linux Gunicorn two-worker launch was not executed, Helm is unavailable, and actual ingress/TLS/identity/readonly volumes were not exercised. The installed Docker WSL distribution has no Python runtime for Linux tests. These are validation blockers, not successful checks.

The external reusable CI workflow referenced by the repository could not be read through the connected GitHub accounts (404); its internal dependency-install behavior cannot be certified locally. Repository variables were updated but a real authorized CI run remains necessary. No CI workflow, image, chart or application was published/deployed.

Dev/test sequence: build the image with approved private-registry access; verify dependency absence; run all tests on Linux; validate Helm rendering/environment overrides; preserve existing SQLite records and DJANGO_SECRET; bootstrap only if the DB is actually empty; deploy through existing ingress and exercise identity/state/report/integration contracts. Do not deploy to production based on local unit tests alone.

Additional runtime transport check: a real local Uvicorn HTTP listener was launched using the fresh runtime interpreter with Django/DRF absent. Swagger 2 returned successfully and POST validation returned the original 400 JSON body. The child server was stopped after the check. This verifies local HTTP startup, not Linux Gunicorn/container startup.
