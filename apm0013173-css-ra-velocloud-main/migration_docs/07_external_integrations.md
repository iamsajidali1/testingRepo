# External integrations

`api/utils.py`, `api/docs_mds.py`, `api/docs_other.py` and `api/doc_utils_helpers.py` are unchanged normalized source. All 55 view function ASTs are unchanged. The original URLs, payload construction, headers, login/session reuse, proxies, request order, retry/timeout choices, response assertions and business thread pools consequently remain in those functions. Document 03 lists definitions and calls; document 02 maps each route to its handlers/callees. Source preservation is stronger than a rewritten mock implementation but is not evidence of live-service success.

| Integration | Source | Evidence / limit |
|---|---|---|
| VeloCloud login and portal REST API | `api/utils.py`: login/session helpers, batch and enterprise/edge/configuration/gateway/monitoring calls | Differential full call lists for network overview, MDS fetch paths, RMA rejection; existing helper tests. All other workflows need authorized service testing |
| Edge/gateway WebSockets | `get_websocket`, `get_websocket_bgp_from_gateway` in `api/utils.py`; associated views | Unchanged connection, message/poll/close and 40-second timeout logic. No live WebSocket validation |
| Provisioning/configuration/RMA mutations | `api/views.py`, `api/utils.py`: create/update/insert/provision helpers | Unchanged source; RMA creation-rejection payload/order tested. Successful mutation and rollback/recovery not exercised against services |
| Hardware statistics MySQL | `HWStats.post` in `api/views.py` | Exact query/parameters/cursor and connection closure compared using replaced transport; real DB server/schema/data unverified |
| AAF directory lookup | `velocloud_app/middleware/auth.py`, `get_user_groups` / related helpers | Framework references replaced; directory request logic preserved. Middleware originally inactive; no live AAF validation |
| Other runtime file/config references | Original `calls`, `documents`, `templates`, settings MATOMO/PAPERPLANE values | Retained in place, inventory in document 01; deployed permissions/availability require image test |

No production endpoints were contacted. `api/tests/conftest.py` blocks external sockets and MySQL transports by default; integration simulations replace transports, not the report calculations or endpoint business functions. Raw service credentials are not needed to run the suite.

The original two synchronous workers each served one complete request at a time. Native ASGI uses a per-worker request limiter of one while retaining internal business executors. `test_concurrent_request_isolation` checks peak one concurrent handler and response isolation; actual two-process Gunicorn behavior on Linux is pending. Timeouts and internal parallelism were not redesigned for async execution.

Remaining work: compare populated inventories, headers/cookies under the real ingress, upstream authorization/tenant scoping, retries on service faults, WebSocket lifecycle, and all mutation flows in an approved dev/test tenant. Tests must use reviewed data and avoid production state changes.
