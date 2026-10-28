# Authentication and security

The user's final clarification supersedes earlier permissions to retain Django libraries. Runtime authentication, session persistence, cookies, CSRF and validation are implemented without those packages. See `velocloud_app/auth_state.py`, `api/routing.py`, `api/csrf.py`, and `velocloud_app/settings.py`.

The active original stack includes token authentication and remote-user/session middleware. An active Django session is not interchangeable with DRF SessionAuthentication: the original API uses its configured token authenticator. Tests preserve this distinction. The AAF/X-Authorization middleware source was not enabled in the supplied original settings and remains inactive; native adapters retain its application-owned helpers without enabling a new login flow.

Existing SQLite `auth_user`, `authtoken_token` and `django_session` tables and keys are reused. Native session handling retains JSON/Latin-1, optional zlib, URL-safe base64, base62 timestamps, salted SHA-256 HMAC, persisted backend identifiers and password-derived session auth hashes. The existing **DJANGO_SECRET must remain unchanged**. Rotating it was not authorized. Token failure text/status/challenge and inactive-user rejection are preserved. Native password creation produces original-compatible PBKDF2 hashes; no new password-login endpoint was added.

Tests `test_token_and_session_state`, `test_signed_records_and_password_hash_compatibility`, `test_concurrent_logout_does_not_restore_session`, and `test_original_schema_bootstrap_and_no_rebuild` use actual isolated SQLite databases. Django creates users/tokens/sessions consumed by the native runtime; Django verifies native signed records and password hashes. Expiry/tampering/session deletion and cookie attributes are covered. Native session updates cannot recreate a session deleted concurrently. No production database or credential was used.

Remote identity is accepted only from trusted ASGI scope metadata (`remote_user`), never an arbitrary HTTP `Remote-User` header. Real proxy identity injection and remote-user login still need deployment integration validation. Duplicate authorization headers are combined/rejected as in the original server path; underscore headers are dropped to retain Gunicorn's safe default mapping.

Original CSRF exemption on DRF API/schema views remains. Root/static views retain CSRF checks and failure responses. Cookie path, SameSite, HttpOnly, lifetime, renewal/deletion, masked CSRF tokens, security response headers, allowed-host checks and production debug setting are represented in tests. No blanket new CORS or CSRF policy was enabled.

The original `_private_database_path` function is unchanged: private owned directory, no untrusted directory/file/symlink reuse. Its eight POSIX tests were skipped on Windows after failing in the unmodified baseline; Linux execution is required. Original `requests` TLS-verification choices, assertions, log statements and dormant AAF behavior were not silently repaired. Existing `verify=False` calls and business logging deserve a separately approved security review.

This is not a claim of a security audit or compatibility with unknown production authentication overrides. Confirm actual deployed middleware, backend identifiers, secret continuity and restored record samples in authorized dev/test before release.
