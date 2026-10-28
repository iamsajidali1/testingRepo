# Remaining risks and release gates

Readiness: **IMPLEMENTATION_COMPLETE_VALIDATION_PENDING**. This identifies completion of the framework replacement code, not proof of full production equivalence. Required features were not silently excluded; incomplete verification and known response differences are listed here. No production-ready claim is made.

| Item | Current evidence / gap | Required next evidence |
|---|---|---|
| `/api/mds/` defect | Original four-argument call to six-argument function preserved; real TypeError/HTTP 200 response compared | Separate approved business fix after profiles/segments meaning is confirmed; do not classify as successful report |
| DEBUG exception HTML | Native traceback page differs from Django developer-page markup | Review importance of exact debug presentation; add representative comparisons/replacement if required. No approval to discard this contract is implied |
| Broad business parity | Functions preserved, selected real reports/integration sequences tested; many successful route paths unexecuted | Compare all required route workflows using reviewed fixtures and authorized dev/test services |
| Reports | Real HWStats and empty MDS workbooks plus original report suite | Populated MDS/all report goldens; workbook formulas/charts/names/data edge cases |
| Authentication deployment | Existing record formats and local state tests pass | Actual active records, signing-secret continuity, identity/proxy metadata and concurrent multiworker behavior |
| POSIX storage security | Original checks unchanged; eight tests skipped on Windows | Run on Linux as UID 10001 with original temporary-volume ownership and readonly root |
| Linux/Python 3.14 image | Local Python 3.12 only; private Docker daemon/base image unavailable | Build/install/start intended image; native worker and package compatibility checks |
| Helm/ingress | Template wiring reviewed; original-prefix differential tests pass | Helm render and actual forwarded scheme/host/prefix/static assets/TLS tests |
| VeloCloud / WebSockets / mutations | Original source and selected replaced-transport traces | Live dev/test payload/order/timeouts/session/recovery and mutation results |
| MySQL | Query/parameters/cleanup compared with mocked transport | Actual schema/permissions/results/timezone/scale and failure tests |
| Browser presentation | Original layouts/assets and representative complete-page comparisons | Arbitrary data/linkification/large response/error markup and interactive browser acceptance |
| External CI | Shared workflow unavailable (404) | Authorized CI run, dependency installation, quality/coverage gates |
| Dependency versions | New framework pinned, original business requirements remain mostly unpinned | Capture actual production versions and validate target resolved environment |
| Deployment overrides | Supplied source analyzed; AAF middleware inactive there | Confirm deployed middleware/auth backend configuration matches baseline |

No production credential/service access, database migration, deployment, destructive operation, or business defect correction was performed. Existing `verify=False`, logging and other business quirks remain separate review items. Exact compatibility with undocumented management commands or unknown production overrides is unverified.

Do not translate source preservation, HTTP 200 on a caught error, or 46/46 required-field tests into 100% functional success. Release requires the environment and workflow evidence above plus review of the confirmed DEBUG presentation difference.
