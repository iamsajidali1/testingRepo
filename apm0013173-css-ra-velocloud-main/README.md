# css-ra-velocloud

## Install and test

```sh
python -m pip install -r requirements.txt
python -m pip install pytest pytest-cov flake8
python -m pytest api/tests --junitxml=junit/test-results.xml
flake8 . --max-line-length=120 --ignore=E203,W503,E501 --count --select=E9,F63,F7,F82 --show-source --statistics
```

The tests mock upstream services and do not need production credentials.
Pytest generates `coverage.xml` with repository-relative source paths for SonarQube.
CI installs the test tools through the shared Python build action.
Quality-gate thresholds and source exclusions remain unchanged.

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

Outside test mode, Django uses `css-ra-velocloud/velocloud.sqlite3` beneath
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
For a fresh database, run Django migrations as the runtime user against the
new path before serving database-backed requests. Run migrations against any
restored database as required by the deployed Django version.

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
