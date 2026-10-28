"""CSRF checks for the original non-exempt root and debug static views."""
import hmac
import html
from pathlib import Path
from urllib.parse import urlsplit

from api.http import APIError, BadRequest, HttpResponse
from velocloud_app import auth_state, settings


def check(request):
    if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
        return None
    origin = request.headers.get("origin")
    if origin is not None:
        if origin != request.scheme + "://" + request.get_host():
            return "Origin checking failed - " + origin + " does not match any trusted origins."
    elif request.scheme == "https":
        referer = request.headers.get("referer")
        if referer is None:
            return "Referer checking failed - no Referer."
        try:
            parsed = urlsplit(referer)
        except ValueError:
            return "Referer checking failed - Referer is malformed."
        if not parsed.scheme or not parsed.netloc:
            return "Referer checking failed - Referer is malformed."
        if parsed.scheme != "https":
            return "Referer checking failed - Referer is insecure while host is secure."
        if parsed.netloc.lower() != request.get_host().lower():
            return "Referer checking failed - " + referer + " does not match any trusted origins."
    if request.csrf_secret is None:
        return "CSRF cookie not set."
    data = None
    if request.method == "POST" and request.META["CONTENT_TYPE"].split(";")[0] in ("application/x-www-form-urlencoded", "multipart/form-data"):
        try:
            data = request.data
        except APIError as exc:
            raise BadRequest(exc.detail) from exc
    token = data.get("csrfmiddlewaretoken", "") if request.method == "POST" and hasattr(data, "getlist") else ""
    source = "POST"
    if not token:
        token = request.headers.get("x-csrftoken", "")
        source = "the 'X-Csrftoken' HTTP header"
    if not token:
        return "CSRF token missing."
    if len(token) not in (32, 64):
        return "CSRF token from " + source + " has incorrect length."
    if any(char not in auth_state.CHARS for char in token):
        return "CSRF token from " + source + " has invalid characters."
    if len(token) == 64:
        token = "".join(auth_state.CHARS[auth_state.CHARS.index(a) - auth_state.CHARS.index(b)] for a, b in zip(token[32:], token[:32]))
    if not hmac.compare_digest(token, request.csrf_secret):
        return "CSRF token from " + source + " incorrect."
    return None


def failure(reason):
    variant = "no_cookie" if reason == "CSRF cookie not set." else "no_referer" if reason == "Referer checking failed - no Referer." else "generic"
    path = Path(__file__).resolve().parents[1] / "velocloud_app/documents/http"
    template = (path / ("csrf_" + ("debug_" if settings.DEBUG else "prod_") + variant + ".html")).read_text(encoding="utf-8")
    return HttpResponse(template.replace("__REASON__", html.escape(reason)), status=403)
