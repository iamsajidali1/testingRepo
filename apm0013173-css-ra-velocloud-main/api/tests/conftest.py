"""Local-only migration tests: isolated state and no outbound service access."""
import os
from pathlib import Path
import socket
import sys
import types
import zipfile

import pytest


ROOT = Path(__file__).resolve().parents[2]
os.environ.update(ENV="unittest", APP_DIR=str(ROOT), DJANGO_SECRET="local-migration-tests-only",
                  POD_IP="127.0.0.1", HOST_IP="127.0.0.1")
# Django exists only in the development environment as an independent oracle.
oracle_settings = types.ModuleType("_django_oracle_settings")
oracle_settings.__file__ = str(ROOT / "velocloud_app/settings.py")
with zipfile.ZipFile(ROOT / "api/tests/fixtures/django_baseline.zip") as archive:
    source = archive.read("velocloud_app/settings.py")
exec(compile(source, "original/velocloud_app/settings.py", "exec"), oracle_settings.__dict__)
oracle_settings.ROOT_URLCONF = types.ModuleType("_oracle_empty_urls")
oracle_settings.ROOT_URLCONF.urlpatterns = []
sys.modules[oracle_settings.__name__] = oracle_settings
os.environ["DJANGO_SETTINGS_MODULE"] = oracle_settings.__name__
import django
django.setup()


@pytest.fixture(autouse=True)
def forbid_external_services(monkeypatch):
    original_connect = socket.socket.connect
    def denied(*args, **kwargs):
        raise AssertionError("Tests must replace external network/database transports")
    def local_only(sock, address):
        # Windows asyncio uses loopback sockets for its internal self-pipe.
        if isinstance(address, tuple) and address[0] in ("127.0.0.1", "::1"):
            return original_connect(sock, address)
        return denied()
    monkeypatch.setattr(socket.socket, "connect", local_only)
    import mysql.connector
    monkeypatch.setattr(mysql.connector, "connect", denied)


def pytest_collection_modifyitems(items):
    if os.name != "posix":
        for item in items:
            if item.path.name == "test_settings.py" and "PrivateDatabaseTests" in item.nodeid:
                item.add_marker(pytest.mark.skip(reason="Original POSIX ownership/mode/symlink tests require Linux; Windows baseline failed these tests."))
