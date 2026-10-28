import importlib
import os
import sys

import django.core.wsgi
import pytest


def load_wsgi(monkeypatch, script_name=None):
    calls = []

    def django_application(environ, start_response):
        calls.append((environ["SCRIPT_NAME"], environ["PATH_INFO"]))
        return [b"ok"]

    monkeypatch.setattr(django.core.wsgi, "get_wsgi_application", lambda: django_application)
    if script_name is None:
        monkeypatch.delenv("SCRIPT_NAME", raising=False)
    else:
        monkeypatch.setenv("SCRIPT_NAME", script_name)
    monkeypatch.delitem(sys.modules, "velocloud_app.wsgi", raising=False)
    return importlib.import_module("velocloud_app.wsgi"), calls


def call(module, path, script_name=""):
    return module.application({"PATH_INFO": path, "SCRIPT_NAME": script_name}, lambda *args: None)


@pytest.mark.parametrize(("path", "expected"), [
    ("/svc/velocloud/api/devices", ("/svc/velocloud", "/api/devices")),
    ("/svc/velocloud", ("/svc/velocloud", "")),
    ("/api/devices", ("", "/api/devices")),
    ("/svc/velocloudx/api", ("", "/svc/velocloudx/api")),
])
def test_strips_ingress_prefix_only_when_present(monkeypatch, path, expected):
    module, calls = load_wsgi(monkeypatch, "/svc/velocloud/")

    assert call(module, path) == [b"ok"]
    assert calls == [expected]


def test_removes_script_name_from_process_environment(monkeypatch):
    module, _ = load_wsgi(monkeypatch, "/svc/velocloud")

    assert module.URL_PREFIX == "/svc/velocloud"
    assert "SCRIPT_NAME" not in os.environ


def test_appends_prefix_to_existing_script_name(monkeypatch):
    module, calls = load_wsgi(monkeypatch, "/svc/velocloud")

    call(module, "/svc/velocloud/api", script_name="/outer")
    assert calls == [("/outer/svc/velocloud", "/api")]


def test_passes_requests_through_without_prefix(monkeypatch):
    module, calls = load_wsgi(monkeypatch)

    call(module, "/svc/velocloud/api")
    assert calls == [("", "/svc/velocloud/api")]
