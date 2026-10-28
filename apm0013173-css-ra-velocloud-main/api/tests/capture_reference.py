"""Regenerate browser/schema reference artifacts from the original test oracle.

Run manually with the development dependencies. This is never runtime code.
"""
import json
import re
import shutil
import sqlite3
import sys
import types
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from api.tests import conftest  # Isolated original settings, no production state.
from api.tests.test_migration import original, original_source
from django.test import Client, override_settings
from django.urls import path, include
from rest_framework import generics
from rest_framework.response import Response


def capture():
    reference = original.__wrapped__()
    output = ROOT / "velocloud_app/documents/http"
    output.mkdir(parents=True, exist_ok=True)
    for name in ("RAGenericInput", "MdsSerializer", "SingleEdgeProvisioning", "HWStatsSerializer"):
        cls = type("ReferenceView", (generics.GenericAPIView,), {
            "permission_classes": [], "serializer_class": getattr(reference.serializers, name),
            "get_view_name": lambda self: "__NAME__",
            "get_view_description": lambda self, html=False: "__DESCRIPTION__",
            "post": lambda self, request: Response(None),
            "http_method_not_allowed": lambda self, request: Response("__CONTENT__", status=405),
        })
        urls = types.ModuleType("_capture_urls")
        urls.urlpatterns = [path("__PATH__/", cls.as_view())]
        with override_settings(ROOT_URLCONF=urls):
            response = Client(HTTP_HOST="localhost").get("/__PATH__/", HTTP_ACCEPT="text/html")
        html = response.content.decode()
        token = re.search(r'name="csrfmiddlewaretoken" value="([A-Za-z0-9]+)"', html).group(1)
        html = html.replace(token, "__CSRF__").replace("/static/", "__STATIC__")
        html = html.replace("/__PATH__/", "__PATH__").replace("<b>GET</b>", "<b>__METHOD__</b>")
        html = re.sub(r'(<pre class="prettyprint"><span class="meta nocode">).*?(</pre>)',
                      r'\1__RESPONSE__\2', html, flags=re.S)
        (output / (name + ".html")).write_text(html, encoding="utf-8")
    original_urls = types.ModuleType("_capture_original_api_urls")
    source = original_source("api/urls.py").replace("from api import views", "import _original_views as views")
    sys.modules["_original_views"] = reference.views
    exec(compile(source, "original/api/urls.py", "exec"), original_urls.__dict__)
    urls = types.ModuleType("_capture_original_urls")
    urls.urlpatterns = [path("api/", include(original_urls))]
    with override_settings(ROOT_URLCONF=urls):
        client = Client(HTTP_HOST="localhost")
        for route, filename in (("swagger.json", "swagger.json"), ("swagger/", "swagger.html"), ("redoc/", "redoc.html")):
            response = client.get("/api/" + route)
            html = response.content.decode()
            if filename.endswith("html"):
                token = re.search(r'name="csrfmiddlewaretoken" value="([A-Za-z0-9]+)"', html)
                if token:
                    html = html.replace(token.group(1), "__CSRF__")
                html = html.replace("/static/", "__STATIC__").replace("/api/" + route, "__PATH__")
            (output / filename).write_text(html, encoding="utf-8")
        from rest_framework.test import force_authenticate
        from django.test import RequestFactory
        class ReferenceUser:
            is_authenticated = True
            def __str__(self):
                return "__USER__"
        request = RequestFactory().get("/api/swagger/", HTTP_HOST="localhost")
        force_authenticate(request, user=ReferenceUser())
        response = original_urls.urlpatterns[1].callback(request)
        response.render()
        content = response.content.decode()
        token = re.search(r'name="csrfmiddlewaretoken" value="([A-Za-z0-9]+)"', content)
        content = content.replace(token.group(1), "__CSRF__").replace("/static/", "__STATIC__").replace("/api/swagger/", "__PATH__")
        (output / "swagger_authenticated.html").write_text(content, encoding="utf-8")
    from django.template.loader import render_to_string
    field = types.SimpleNamespace(name="__FIELD__", label="__LABEL__", value="__VALUE__", errors=["__ERROR__"],
                                  help_text="", allow_null=False, allow_blank=False,
                                  iter_options=[types.SimpleNamespace(value=value, display_text=value, disabled=False,
                                      start_option_group=False, end_option_group=False) for value in ("json", "xlsx")])
    style = types.SimpleNamespace(input_type="__TYPE__", hide_label=False, placeholder="", autofocus=False)
    for kind in ("input", "select"):
        content = render_to_string("rest_framework/horizontal/" + kind + ".html", {"field": field, "style": style})
        (output / ("form_" + kind + "_error.html")).write_text(content, encoding="utf-8")
    import drf_yasg, rest_framework
    static = ROOT / "velocloud_app/static"
    roots = [Path(drf_yasg.__file__).parent / "static", Path(rest_framework.__file__).parent / "static"]
    wanted_yasg = {"style.css", "swagger-ui-init.js", "redoc-init.js", "insQ.min.js", "immutable.min.js",
                   "swagger-ui.css", "swagger-ui-bundle.js", "swagger-ui-standalone-preset.js", "favicon-32x32.png",
                   "oauth2-redirect.html", "oauth2-redirect.js", "redoc.min.js", "redoc-logo.png", "LICENSE", "NOTICE"}
    wanted_drf = {"bootstrap.min.css", "bootstrap-tweaks.css", "prettify.css", "default.css", "jquery-3.7.1.min.js",
                  "ajax-form.js", "csrf.js", "bootstrap.min.js", "prettify-min.js", "default.js", "load-ajax-form.js"}
    for root in roots:
        for file in root.rglob("*"):
            if not file.is_file():
                continue
            relative = file.relative_to(root)
            if "redoc-old" in relative.parts:
                continue
            needed = (file.name in wanted_yasg or file.name.endswith(".LICENSE.txt")) if root == roots[0] else (file.name in wanted_drf or file.name.startswith("glyphicons-"))
            if needed:
                target = static / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(file, target)
    print("Captured original HTML layouts, Swagger 2 schema and referenced browser assets.")
    from django.views.csrf import csrf_failure
    from django.test import RequestFactory
    reasons = {"no_cookie": "CSRF cookie not set.", "no_referer": "Referer checking failed - no Referer.",
               "generic": "CSRF token missing."}
    for debug in (True, False):
        with override_settings(DEBUG=debug):
            for name, reason in reasons.items():
                response = csrf_failure(RequestFactory().post("/"), reason=reason)
                content = response.content.decode().replace(reason, "__REASON__")
                (output / ("csrf_" + ("debug_" if debug else "prod_") + name + ".html")).write_text(content, encoding="utf-8")
    from django.conf import settings
    from django.core.management import call_command
    from django.db import connections
    database = ROOT / "migration_docs/test-results/schema-reference.sqlite3"
    if database.exists():
        database.unlink()
    connections.close_all()
    original_name = settings.DATABASES["default"]["NAME"]
    settings.DATABASES["default"]["NAME"] = str(database)
    connections["default"].settings_dict["NAME"] = str(database)
    call_command("migrate", interactive=False, verbosity=0, skip_checks=True)
    connections.close_all()
    with closing(sqlite3.connect(database)) as connection:
        sql = "\n".join(connection.iterdump())
    (ROOT / "velocloud_app/auth_schema.sql").write_text(
        "-- Empty database bootstrap captured from the original Django 6.0.9 migrations.\n"
        "-- Applied only to empty databases; existing schemas and records are never migrated.\n" + sql + "\n")
    settings.DATABASES["default"]["NAME"] = original_name
    connections["default"].settings_dict["NAME"] = original_name
    database.unlink()


if __name__ == "__main__":
    capture()
