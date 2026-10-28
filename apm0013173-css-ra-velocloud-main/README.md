# css-ra-velocloud

## Install and test

```sh
python -m pip install -r requirements-dev.txt
python -m pytest api/tests --junitxml=junit/test-results.xml
flake8 api velocloud_app manage.py gunicorn.py --max-line-length=120 --ignore=E203,W503,E501 --count --select=E9,F63,F7,F82 --show-source --statistics
```

The tests mock upstream services and do not need production credentials.
Pytest generates `coverage.xml` with repository-relative source paths for SonarQube.
CI installs the test tools through the shared Python build action.
Quality-gate thresholds and source exclusions remain unchanged.

The HTTP runtime is FastAPI/ASGI. Install only `requirements.txt` in the deployed
image: Django, DRF and drf-yasg are test-oracle dependencies in
`requirements-dev.txt`, and are not needed by the runtime. The original source
used by differential tests is retained in `api/tests/fixtures/django_baseline.zip`
from baseline commit `063da1e`.

Existing paths, case and trailing slashes remain unchanged, including
`/api/swagger.json`, `/api/swagger.yaml`, `/api/swagger/` and `/api/redoc/`.
The Swagger 2 schema and browser assets are retained as static artifacts;
the runtime does not load a Django template engine or fetch assets from a CDN.
FastAPI's default `/docs` and `/openapi.json` routes are disabled.

For development, set `APP_DIR`, `DJANGO_SECRET` and the existing application
environment variables, then run `python manage.py runserver --noreload`.
On Linux the container uses `velocloud_app.asgi:application` with two Gunicorn
`uvicorn_worker.UvicornWorker` processes, retaining the original port and timeout.
Each worker handles one complete request at a time, preserving the original
synchronous-worker capacity; business functions retain their internal executors.

Migration evidence, exact limitations and the release-validation gates are in
`migration_docs/12_final_migration_report.md`. Local tests do not establish full
production equivalence or replace Linux/container and authorized dev/test checks.

Report regression tests decode the generated Excel workbooks and check worksheet
structure, headers, calculations, formatting, and charts. They also cover policy
reference ordering, event-log downtime, capacity-ranking boundaries, and bounded
parsing of long version/license strings. The service-manager implementation uses
`service_manager_report`; its legacy `Service_Manager_Report` Python name remains
available as an alias. Report endpoints and workbook labels are unchanged.

Upstream API base URLs must use HTTPS. Hostnames without a scheme default to
HTTPS; explicitly configured clear-text URLs are rejected before login.
The existing trusted-host checks still apply.

Requests select their orchestrator using the `X-url` header, validated through
the same HTTPS and trusted-host checks before credentials are sent upstream.
When the header is missing or empty, `API_BASE_URL` supplies the default.
An invalid request URL is rejected rather than silently using the default.
Multi-orchestrator deployments do not need a global `API_BASE_URL` when every
request supplies its destination. Custom orchestrator hosts must be explicitly
listed in `API_BASE_ALLOWED_HOSTS`; `.velocloud.net` hosts remain trusted.

## SQLite runtime storage

Outside test mode, the application uses `css-ra-velocloud/velocloud.sqlite3` beneath
Python's temporary directory (normally `/tmp` in the container). The parent
directory must be owned by the runtime user and private (mode `0700`).
Unsafe existing directories, database symlinks, and files owned by another
user cause startup to fail rather than being silently reused.

The fixed path is shared by Gunicorn workers within a pod. It works with the
chart's writable temporary volume and read-only root filesystem; it is not
persistent across pod replacement and is not shared between replicas.
Test mode (`ENV=unittest`) keeps its separate database setting.

This replaces the old `/tmp/velocloud` database location. Before deploying,
determine whether its Django authentication/session data must be retained.
If so, stop writers, verify the old file's ownership and integrity, and have
an operator back up and restore it into the private directory as the runtime
user. The application never automatically copies an untrusted temporary file.
For a fresh empty database, run `python manage.py migrate --noinput` as the runtime
user before serving database-backed requests. This restores the original schema,
captured from the Django baseline. An existing database is checked without schema
changes or rebuilding its tables. Existing users, token keys and signed sessions
retain their table formats. Keep the existing `DJANGO_SECRET` value so active
signed records continue to verify. Reuse restored databases with their existing
schema; the FastAPI runtime does not run Django schema upgrades.

## Capacity-report timezones

Business hours are Monday through Friday, 08:00 inclusive to 17:00 exclusive,
in the edge site's timezone. Epoch samples are converted to that timezone
using `zoneinfo`, including daylight-saving transitions, instead of assigning
the edge timezone to server-local clock values. This can change business-hours
averages and utilization percentages for non-UTC edges. An unknown edge
timezone is logged and falls back to UTC.
## Helm Secrets

The chart uses the Azure Key Vault provider for the Secrets Store CSI Driver
with Azure Workload Identity. Credential mappings, tenant ID, and the synced
Kubernetes Secret name are configured once in `chart/values.yaml` under
`secretsStore`; do not put plaintext passwords or tokens in values files.
Environment overrides only select the Key Vault and workload identity client ID.
The service-account client-ID annotation is generated from `secretsStore.clientId`.

The cluster must have the CSI driver, Azure provider, Kubernetes Secret sync, and
Workload Identity enabled. Each identity needs permission to read the configured
Key Vault secrets and a federated identity credential for the deployed service
account and namespace. An externally managed service account must have the
matching `azure.workload.identity/client-id` annotation.

Helm automatically loads `chart/values.yaml`. The existing pipeline uses
`chart/values-nprd.yaml` or `chart/values-prod.yaml` for non-secret environment
settings; `chart/envs/dev.yaml` and `chart/envs/prod.yaml` inherit the same shared
credential mappings. To configure CSI without an environment values file:

```sh
helm upgrade --install css-ra-velocloud ./chart \
	--namespace com-att-one \
	--set namespace=com-att-one \
	--set replicaCount=1 \
	--set image.repository=oneeastus2cr2azn0hvf.azurecr.io/css-ra-velocloud \
	--set image.tag=dev-latest \
	--set-string secretsStore.clientId='<workload-identity-client-id>' \
	--set-string secretsStore.keyVaultName='<key-vault-name>'
```

Also configure the non-secret application settings (such as the database host)
for the target environment. Secret values are mounted by CSI, synced to
`css-ra-velocloud-runtime`, and injected into the application via `envFrom`.
Restart pods after changing secret values so environment variables are refreshed.
