"""Render the original browser layouts and Swagger 2 contract without Django."""
import copy
import html
import json
import re
from http import HTTPStatus
from pathlib import Path

from api.http import HttpResponse, JSONEncoder, negotiate
from velocloud_app import auth_state


DIRECTORY = Path(__file__).resolve().parents[1] / "velocloud_app/documents/http"
SWAGGER = json.loads((DIRECTORY / "swagger.json").read_text(encoding="utf-8"))


def schema(request):
    document = copy.deepcopy(SWAGGER)
    document["host"] = request.get_host()
    document["schemes"] = [request.scheme]
    document["basePath"] = request.script_name.rstrip("/") + "/api"
    return document


def specification(request, format="json"):
    document = schema(request)
    if format == "yaml":
        import yaml
        class Dumper(yaml.SafeDumper):
            def ignore_aliases(self, data):
                return True
        def represent_text(dumper, value):
            return dumper.represent_scalar("tag:yaml.org,2002:str", value, style="|" if "\n" in value else None)
        Dumper.add_representer(str, represent_text)
        content = yaml.dump(document, Dumper=Dumper, allow_unicode=True, sort_keys=False)
        content_type = "application/yaml; charset=utf-8"
    else:
        content = json.dumps(document, ensure_ascii=False)
        content_type = "application/openapi+json; charset=utf-8" if format == "openapi" else "application/json; charset=utf-8"
    return HttpResponse(content, content_type=content_type)


def documentation(request, name):
    filename = "swagger_authenticated" if name == "swagger" and request.user.is_authenticated else name
    content = (DIRECTORY / (filename + ".html")).read_text(encoding="utf-8")
    substitutions = {"__STATIC__": html.escape(request.script_name.rstrip("/") + "/static/", quote=True),
                     "__PATH__": html.escape(request.path, quote=True), "__USER__": html.escape(str(request.user))}
    if "__CSRF__" in content:
        substitutions["__CSRF__"] = request.csrf_token()
    content = re.sub(r"__(?:STATIC|PATH|USER|CSRF)__", lambda match: substitutions[match.group()], content)
    return HttpResponse(content)


def documentation_page(request, name=None, format=None):
    from api.routing import APIError
    family = "html" if name else "yaml"
    request.doc_format = family
    # The checked-in drf-yasg configuration enables its legacy format suffixes.
    ui_names = [name, "redoc" if name == "swagger" else "swagger"] if name else []
    formats = ui_names + ["openapi", "json", "yaml", ".json", ".yaml"]
    selected = ("." + format) if format in ("json", "yaml") else format or request.query_params.get("format")
    if selected and selected not in formats:
        raise APIError("Not found.", 404)
    selected = selected.removeprefix(".") if selected else None
    candidates = ui_names + ["yaml", "json", "openapi"]
    media = {"swagger": "text/html", "redoc": "text/html", "openapi": "application/openapi+json",
             "json": "application/json", "yaml": "application/yaml"}
    chosen, _ = negotiate(request.headers.get("accept", "*/*"), [(item, media[item]) for item in candidates if not selected or item == selected])
    if chosen is None:
        raise APIError("Could not satisfy the request Accept header.", 406)
    request.doc_format = "html" if chosen in ("swagger", "redoc") else chosen
    auth_state.authenticate(request)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        raise APIError(f'Method "{request.method}" not allowed.', 405)
    if request.method == "OPTIONS":
        data = {"name": "Schema", "description": "", "renders":
                (["text/html"] * len(ui_names)) + ["application/yaml", "application/json", "application/openapi+json", "application/yaml", "application/json"],
                "parses": ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"]}
        if request.doc_format == "html":
            return HttpResponse("200 Ok")
        return HttpResponse(json.dumps(data, separators=(",", ":")), content_type=media[chosen] + "; charset=utf-8")
    return documentation(request, chosen) if request.doc_format == "html" else specification(request, request.doc_format)


def documentation_error(response, request):
    format = getattr(request, "doc_format", "openapi")
    if format == "html":
        return HttpResponse(str(response.status_code) + " " + HTTPStatus(response.status_code).phrase.title(), status=response.status_code)
    media = {"openapi": "application/openapi+json", "json": "application/json", "yaml": "application/yaml"}[format]
    return HttpResponse(response.body, content_type=media + "; charset=utf-8", status=response.status_code)


def _linkify(value):
    escaped = html.escape(value)
    return re.sub(r'https?://(?:(?!&quot;|&#x27;|&lt;|&gt;)[^\s<>])+',
                  lambda match: '<a href="' + match.group() + '" rel="nofollow">' + match.group() + '</a>', escaped)


def browsable(response, view, request):
    from api.routing import metadata
    meta = metadata(view)
    content = (DIRECTORY / (view.serializer_class.__name__ + ".html")).read_text(encoding="utf-8")
    headers = {key: value for key, value in response.headers.items()
               if key.lower() in ("allow", "vary", "www-authenticate")}
    headers = {{"allow": "Allow", "vary": "Vary", "www-authenticate": "WWW-Authenticate"}[key]: value for key, value in headers.items()}
    headers["Content-Type"] = "application/json"
    rendered = "<b>HTTP " + str(response.status_code) + " " + HTTPStatus(response.status_code).phrase + "</b>"
    for key, value in sorted(headers.items()):
        rendered += "\n<b>" + key + ":</b> <span class=\"lit\">" + _linkify(value) + "</span>"
    rendered += "\n\n</span>" + _linkify(json.dumps(response.data, cls=JSONEncoder, indent=4, ensure_ascii=False, allow_nan=False) if response.data is not None else "")
    description = "" if response.status_code in (401, 403) else "<p>" + html.escape(meta["description"]).replace("\n", "<br />") + "</p>"
    substitutions = {"__NAME__": html.escape(meta["name"]), "__DESCRIPTION__": description,
                     "__METHOD__": request.method, "__PATH__": html.escape(request.path + ("?" + request.META["QUERY_STRING"] if request.META["QUERY_STRING"] else ""), quote=True),
                     "__STATIC__": html.escape(request.script_name.rstrip("/") + "/static/", quote=True),
                     "__RESPONSE__": rendered, "__CSRF__": request.csrf_token()}
    # Replace markers once, so user-supplied response text cannot introduce a
    # second template expansion or replace an authentication token marker.
    content = re.sub(r"__(?:NAME|DESCRIPTION|METHOD|PATH|STATIC|RESPONSE|CSRF)__",
                     lambda match: substitutions[match.group()], content)
    if request.user.is_authenticated:
        content = re.sub(r'(<ul class="nav navbar-nav pull-right">).*?(</ul>)',
                         lambda match: match[0].replace('\n                  \n', '\n                  <li class="navbar-text">' + html.escape(str(request.user)) + '</li>\n', 1), content, count=1, flags=re.S)
    serializer = getattr(view, "_last_serializer", None)
    if view.serializer_class.__name__ == "HWStatsSerializer" and response.status_code == 400 and serializer and response.data is serializer.errors:
        data = serializer.initial_data
        if isinstance(data, dict):
            def field_html(match):
                block, field = match[0], match[1]
                value = "" if data.get(field) is None else str(data.get(field))
                errors = response.data.get(field, [])
                if errors:
                    kind = "select" if field == "output" else "input"
                    block = (DIRECTORY / ("form_" + kind + "_error.html")).read_text(encoding="utf-8").strip("\n")
                    spans = '\n      \n        '.join('<span class="help-block">' + html.escape(error) + '</span>' for error in errors)
                    block = block.replace('<span class="help-block">__ERROR__</span>', spans)
                    values = {"__FIELD__": field, "__LABEL__": field.capitalize(), "__VALUE__": html.escape(value, quote=True),
                              "__TYPE__": "date" if field.endswith("Date") else "text"}
                    block = re.sub(r"__(?:FIELD|LABEL|VALUE|TYPE)__", lambda token: values[token.group()], block)
                elif field != "output":
                    block = block.replace('value=""', 'value="' + html.escape(value, quote=True) + '"')
                if field == "output" and value in ("json", "xlsx"):
                    block = block.replace('<option value="' + value + '"  >', '<option value="' + value + '" selected >')
                return block
            content = re.sub(r'<div class="form-group[^\"]*">(?:(?!<div class="form-group).)*?(?:<input name="(startDate|endDate|customerName)"|<select class="form-control" name="(output)")(?:(?!<div class="form-group).)*?</div>\n</div>',
                             lambda match: field_html((match[0], match[1] or match[2])), content, flags=re.S)
    return HttpResponse(content, status=response.status_code)
