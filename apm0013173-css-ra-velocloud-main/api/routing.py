"""FastAPI routing with the existing API's parsing and HTTP error contract."""
import inspect
import json
import re
from http.cookies import _unquote
import secrets
import traceback
import html

from fastapi import APIRouter, Request
from fastapi.routing import APIRoute
from starlette.concurrency import run_in_threadpool
import anyio
from starlette.datastructures import FormData
from starlette.routing import Match

from api.http import APIError, BadRequest, HttpResponse, Response, negotiate
from api.parsers import parse_body
from api.validation import ValidationError
from velocloud_app import auth_state, settings


_NOT_LOADED = object()


class DisallowedHost(Exception):
    pass


class RequestContext:
    """The request attributes actually consumed by the existing handlers."""
    def __init__(self, request, loader):
        self.headers = request.headers
        self.path_params = request.path_params
        self.query_params = request.query_params
        self.method = request.method
        self.path_info = request.scope["path"]
        self.script_name = settings.FORCE_SCRIPT_NAME or request.scope.get("root_path", "")
        self.path = self.script_name + self.path_info.removeprefix(self.script_name)
        self.META = {"HTTP_" + key.upper().replace("-", "_"): value for key, value in request.headers.items()}
        self.META.update(REQUEST_METHOD=self.method, PATH_INFO=self.path_info, SCRIPT_NAME=self.script_name,
                         QUERY_STRING=request.scope.get("query_string", b"").decode("latin-1"),
                         CONTENT_TYPE=request.headers.get("content-type", ""),
                         CONTENT_LENGTH=request.headers.get("content-length", ""))
        if "remote_user" in request.scope:
            self.META["REMOTE_USER"] = request.scope["remote_user"]
        self.COOKIES = {}
        for chunk in request.headers.get("cookie", "").split(";"):
            key, separator, value = chunk.partition("=")
            if not separator:
                key, value = "", key
            if key.strip() or value.strip():
                self.COOKIES[key.strip()] = _unquote(value.strip())
        self.scheme = request.url.scheme
        self._parsed = _NOT_LOADED
        self._loader = loader
        self.csrf_secret, self.csrf_update = None, False
        value = self.COOKIES.get("csrftoken")
        if value is not None:
            chars = auth_state.CHARS
            if len(value) not in (32, 64) or any(char not in chars for char in value):
                self.csrf_secret = "".join(secrets.choice(chars) for _ in range(32))
                self.csrf_update = True
            elif len(value) == 64:
                self.csrf_secret = "".join(chars[chars.index(a) - chars.index(b)] for a, b in zip(value[32:], value[:32]))
            else:
                self.csrf_secret = value

    @property
    def data(self):
        if self._parsed is _NOT_LOADED:
            try:
                self._parsed = anyio.from_thread.run(self._loader)
            except Exception as exc:
                self._parsed = exc
        if isinstance(self._parsed, Exception):
            raise self._parsed
        return self._parsed

    def get_host(self):
        host = self.headers.get("host", "")
        match = re.fullmatch(r"([a-z0-9.-]+|\[[a-f0-9]*:[a-f0-9.:]+\])(?::[0-9]+)?", host.lower())
        domain = match.group(1).removesuffix(".") if match else ""
        if domain and any(pattern and (pattern == "*" or domain == pattern.lower() or
                                      pattern.startswith(".") and domain.endswith(pattern.lower()))
                          for pattern in settings.ALLOWED_HOSTS):
            return host
        raise DisallowedHost(host)

    def build_absolute_uri(self, path=None):
        return self.scheme + "://" + self.get_host() + (path or self.path)

    def csrf_token(self):
        if self.csrf_secret is None:
            self.csrf_secret = "".join(secrets.choice(auth_state.CHARS) for _ in range(32))
        self.csrf_update = True
        mask = "".join(secrets.choice(auth_state.CHARS) for _ in range(32))
        return mask + "".join(auth_state.CHARS[(auth_state.CHARS.index(a) + auth_state.CHARS.index(b)) % 62]
                              for a, b in zip(self.csrf_secret, mask))


class CompatibilityRoute(APIRoute):
    def matches(self, scope):
        match, child_scope = super().matches(scope)
        # Dispatch unsupported methods too: authentication and negotiation must
        # run before the legacy 405 response, including for HEAD and TRACE.
        return (Match.FULL if match == Match.PARTIAL else match), child_scope

    async def handle(self, scope, receive, send):
        await self.app(scope, receive, send)


router = APIRouter(route_class=CompatibilityRoute)


def _field_metadata(field, name=None):
    kinds = {"CharField": "string", "ListField": "list", "DictField": "nested object",
             "DateField": "date", "ChoiceField": "choice", "JSONField": "field"}
    result = {"type": kinds[type(field).__name__], "required": field.required}
    result["read_only"] = False
    if name is not None:
        result["label"] = name.replace("_", " ").capitalize()
    if field.child:
        result["child"] = _field_metadata(field.child)
    elif type(field).__name__ in ("ListField", "DictField"):
        result["child"] = {"type": "field", "required": True, "read_only": False}
    if field.choices:
        result["choices"] = [{"value": choice, "display_name": str(choice)} for choice in field.choices]
    return result


def metadata(view):
    name = re.sub(r"(((?<=[a-z])[A-Z])|([A-Z](?![A-Z]|$)))", r" \1", type(view).__name__)
    return {"name": " ".join(name.strip().split("_")).title(), "description": inspect.cleandoc(type(view).__doc__ or "").strip(),
            "renders": ["application/json", "text/html"],
            "parses": ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"],
            "actions": {"POST": {name: _field_metadata(field, name)
                                  for name, field in view.serializer_class().fields.items()}}}


def _error_page(status):
    title = {400: "Bad Request", 404: "Not Found", 500: "Server Error"}[status]
    heading = f"{title} ({status})" if status != 404 else title
    detail = {400: "", 404: "The requested resource was not found on this server.", 500: ""}[status]
    return HttpResponse(f'\n<!doctype html>\n<html lang="en">\n<head>\n  <title>{heading}</title>\n</head>\n<body>\n  <h1>{heading}</h1><p>{detail}</p>\n</body>\n</html>\n', status=status)


def _uncaught_error(context, exception, *, plaintext=False, status=500):
    if not settings.DEBUG:
        return _error_page(status)
    text = type(exception).__name__ + " at " + context.path + "\n" + str(exception) + "\n\n" + traceback.format_exc()
    if plaintext:
        return HttpResponse(text, content_type="text/plain; charset=utf-8", status=status)
    return HttpResponse("<!doctype html><html><head><title>" + html.escape(type(exception).__name__) +
                        "</title></head><body><pre>" + html.escape(text) + "</pre></body></html>", status=status)


def execute(request, loader, view_class=None, page=None):
    context = RequestContext(request, loader)
    view = view_class() if view_class else None
    render_html = False
    uncaught = False
    inner_middleware = False
    try:
        context.get_host()
        auth_state.start_request(context)
        inner_middleware = True
        if view:
            accept = request.headers.get("accept", "*/*")
            formats = request.query_params.get("format")
            if formats and formats not in ("json", "api"):
                raise APIError("Not found.", 404)
            renderers = [("json", "application/json"), ("api", "text/html")]
            if formats:
                renderers = [item for item in renderers if item[0] == formats]
            selected, context.accepted_media_type = negotiate(accept, renderers)
            if selected is None:
                raise APIError("Could not satisfy the request Accept header.", 406)
            render_html = selected == "api"
            auth_state.authenticate(context)
            if request.method == "OPTIONS":
                response = Response(metadata(view))
            elif request.method != "POST":
                response = Response({"detail": f'Method "{request.method}" not allowed.'}, status=405)
            else:
                view.request = context
                view.format_kwarg = formats
                response = view.post(context)
        elif page:
            response = page(context)
        else:
            response = _error_page(404)
    except BadRequest as exc:
        uncaught = True
        response = _uncaught_error(context, exc, plaintext=bool(view and inner_middleware and not render_html), status=400)
    except ValidationError as exc:
        response = Response(exc.detail, status=400)
    except APIError as exc:
        response = Response({"detail": exc.detail}, status=exc.status)
    except auth_state.AuthenticationError as exc:
        response = Response({"detail": exc.detail}, status=401)
        response.headers["WWW-Authenticate"] = "Token"
    except DisallowedHost:
        uncaught = True
        response = _error_page(400)
    except Exception as exc:
        # Detailed traceback logging remains available without exposing upstream
        # credentials in an invented JSON error envelope.
        import logging
        logging.exception("Unhandled request failure")
        uncaught = True
        response = _uncaught_error(context, exc, plaintext=bool(view and inner_middleware and not render_html))
    if isinstance(response, Response):
        try:
            response.body = response.render(response.data)
            response.headers["Content-Length"] = str(len(response.body))
        except Exception as exc:
            import logging
            logging.exception("Response rendering failed")
            accepted = request.headers.get("accept", "*/*")
            response = _uncaught_error(context, exc, plaintext=not any(media in accepted for media in ("*/*", "text/*", "text/html")))
            uncaught = True
    if view and not uncaught:
        response.headers["Allow"] = "POST, OPTIONS"
        response.headers["Vary"] = "Accept"
        if render_html and isinstance(response, Response):
            from api.browser import browsable
            before = response
            response = browsable(response, view, context)
            response.headers["Allow"] = "POST, OPTIONS"
            response.headers["Vary"] = "Accept"
            if "www-authenticate" in before.headers:
                response.headers["WWW-Authenticate"] = before.headers["www-authenticate"]
        elif isinstance(response, Response):
            match = re.search(r"(?:^|;)\s*indent\s*=\s*\"?([0-9]+)", getattr(context, "accepted_media_type", "") or "")
            if match and int(match[1]):
                from api.http import JSONEncoder
                response.body = json.dumps(response.data, cls=JSONEncoder, ensure_ascii=False, allow_nan=False,
                                           indent=min(int(match[1]), 8), separators=(",", ": ")).encode()
                response.headers["Content-Length"] = str(len(response.body))
    elif page and getattr(page, "http_api", False) and not uncaught:
        if isinstance(response, Response):
            from api.browser import documentation_error
            before = response
            response = documentation_error(response, context)
            if "www-authenticate" in before.headers:
                response.headers["WWW-Authenticate"] = before.headers["www-authenticate"]
        response.headers["Allow"] = "GET, HEAD, OPTIONS"
        response.headers["Vary"] = "Accept"
    if hasattr(context, "session"):
        try:
            response = auth_state.finish_request(context, response)
        except auth_state.SessionInterrupted:
            response = _error_page(400)
            inner_middleware = False
    if inner_middleware:
        response.headers.setdefault("X-Frame-Options", "DENY")
    for key, value in (("X-Content-Type-Options", "nosniff"), ("Referrer-Policy", "same-origin"),
                       ("Cross-Origin-Opener-Policy", "same-origin")):
        response.headers.setdefault(key, value)
    return response


def endpoint(view_class=None, page=None):
    async def handle(request: Request):
        parsed = None
        async def load_data():
            nonlocal parsed
            parsed = await parse_body(request)
            return parsed
        try:
            return await run_in_threadpool(execute, request, load_data, view_class, page)
        finally:
            if isinstance(parsed, FormData):
                await parsed.close()
    if view_class:
        handle.__name__ = view_class.__name__
        handle.__doc__ = view_class.__doc__
    return handle
