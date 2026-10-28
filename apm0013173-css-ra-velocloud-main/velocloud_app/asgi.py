"""FastAPI ASGI entry point for both internal and ingress-prefixed requests."""
import os
import mimetypes

from velocloud_app import settings
from fastapi import FastAPI
import anyio
from contextlib import asynccontextmanager
from api.http import HttpResponse
from api.routing import CompatibilityRoute, endpoint
from api import browser
from api.urls import router
from pathlib import Path
from starlette.responses import FileResponse, Response as StarletteResponse
from email.utils import parsedate_to_datetime


@asynccontextmanager
async def lifespan(application):
    application.state.request_limiter = anyio.CapacityLimiter(1)
    yield


app = FastAPI(title="CSS Resource Adapter - Velocloud", version="v1", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None, redirect_slashes=False)
# Keep the compatibility route class at the top level. FastAPI's included-router
# optimizer applies its own method checks before a custom route's dispatcher.
app.router.routes.extend(router.routes)
app.router.route_class = CompatibilityRoute
URL_PREFIX = settings.FORCE_SCRIPT_NAME.rstrip("/")
os.environ.pop("SCRIPT_NAME", None)


def make_documentation(name=None, format=None):
    def page(request):
        return browser.documentation_page(request, name, format)
    page.http_api = True
    return page


for path, name, format in (("/api/swagger.json", None, "json"), ("/api/swagger.yaml", None, "yaml"),
                           ("/api/swagger/", "swagger", None), ("/api/redoc/", "redoc", None)):
    app.add_api_route(path, endpoint(page=make_documentation(name, format)), methods=["GET", "HEAD", "OPTIONS"], include_in_schema=False)


STATIC_DIRECTORY = Path(__file__).resolve().parent / "static"


def static_file(request):
    from api.routing import _error_page
    from api import csrf
    reason = csrf.check(request)
    if reason:
        return csrf.failure(reason)
    try:
        target = (STATIC_DIRECTORY / request.path_params["asset_path"]).resolve(strict=True)
        target.relative_to(STATIC_DIRECTORY.resolve())
        if not target.is_file():
            return _error_page(404)
        metadata = target.stat()
    except (OSError, ValueError):
        return _error_page(404)
    modified = request.headers.get("if-modified-since")
    if modified:
        try:
            if int(metadata.st_mtime) <= int(parsedate_to_datetime(modified).timestamp()):
                return StarletteResponse(status_code=304)
        except (ValueError, TypeError, OverflowError):
            pass
    response = FileResponse(target, stat_result=metadata, filename=target.name, content_disposition_type="inline")
    response.headers["Content-Type"] = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
    for header in ("etag", "accept-ranges"):
        if header in response.headers:
            del response.headers[header]
    return response


if settings.DEBUG:
    app.add_api_route("/static/{asset_path:path}", endpoint(page=static_file), methods=["GET", "HEAD"], include_in_schema=False)


def fallback(request):
    if request.path_info == "/":
        from api import csrf
        reason = csrf.check(request)
        if reason:
            return csrf.failure(reason)
        allowed = "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"
        if request.method == "OPTIONS" or request.method not in allowed.split(", "):
            response = HttpResponse(status=200 if request.method == "OPTIONS" else 405)
            response.headers["Allow"] = allowed
            return response
        response = HttpResponse(status=301)
        response.headers["Location"] = URL_PREFIX + "/api/swagger/"
        return response
    if request.path_info in ("/api/mds", "/api/swagger", "/api/redoc"):
        if settings.DEBUG and request.method in ("DELETE", "POST", "PUT", "PATCH"):
            raise RuntimeError("Cannot redirect a request with data while APPEND_SLASH is enabled.")
        response = HttpResponse(status=301)
        response.headers["Location"] = URL_PREFIX + request.path_info + "/" + ("?" + request.META["QUERY_STRING"] if request.META["QUERY_STRING"] else "")
        return response
    from api.routing import _error_page
    return _error_page(404)


app.add_api_route("/{path:path}", endpoint(page=fallback), methods=["GET"], include_in_schema=False)


async def application(scope, receive, send):
    if scope["type"] == "http":
        scope = dict(scope)
        scope["method"] = scope["method"].upper()
        headers = {}
        for key, value in scope["headers"]:
            key = key.lower()
            if b"_" in key:
                continue  # Preserve Gunicorn's default safe header-map policy.
            if key in headers and key not in (b"content-type", b"content-length"):
                headers[key] += b"," + value
            else:
                headers[key] = value
        scope["headers"] = list(headers.items())
        path = scope["path"]
        if URL_PREFIX and (path == URL_PREFIX or path.startswith(URL_PREFIX + "/")):
            scope["path"] = path[len(URL_PREFIX):] or "/"
            scope["root_path"] = scope.get("root_path", "") + URL_PREFIX
            scope["raw_path"] = scope["path"].encode()
        if scope["path"].startswith("/static/"):
            scope["headers"] = [(key, value) for key, value in scope["headers"] if key not in (b"range", b"if-range")]
        if scope["method"] == "HEAD":
            original_send = send
            async def send(message):
                if message["type"] == "http.response.body":
                    message = dict(message, body=b"")
                await original_send(message)
        limiter = getattr(app.state, "request_limiter", None)
        if limiter is None:
            limiter = app.state.request_limiter = anyio.CapacityLimiter(1)
        # The original two synchronous Gunicorn workers execute one complete
        # request each. Preserve that capacity; internal business executors stay
        # unchanged rather than introducing forty concurrent report threads.
        async with limiter:
            await app(scope, receive, send)
    else:
        await app(scope, receive, send)
