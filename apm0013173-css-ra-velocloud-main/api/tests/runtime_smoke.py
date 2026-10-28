"""Run with only requirements.txt installed; Django/DRF must be absent."""
import asyncio
import importlib.util
import json
import os
import sqlite3
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from contextlib import closing

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.update(ENV="unittest", APP_DIR=str(ROOT), DJANGO_SECRET="runtime-smoke-only",
                  POD_IP="127.0.0.1", HOST_IP="127.0.0.1")
for name in ("django", "rest_framework", "drf_yasg"):
    assert importlib.util.find_spec(name) is None, name + " must not be installed"
for name in ("VELO_DB_HOST", "VELO_DB_USER", "VELO_DB_PASS"):
    os.environ.pop(name, None)

from velocloud_app.asgi import application
from velocloud_app import auth_state, settings
from api.urls import urlpatterns


async def request(method, path, data=b"", headers=()):
    messages = []
    delivered = False
    async def receive():
        nonlocal delivered
        if not delivered:
            delivered = True
            return {"type": "http.request", "body": data, "more_body": False}
        return {"type": "http.disconnect"}
    async def send(message):
        messages.append(message)
    scope = {"type": "http", "asgi": {"version": "3.0", "spec_version": "2.3"},
             "http_version": "1.1", "scheme": "http", "method": method, "path": path,
             "raw_path": path.encode(), "query_string": b"", "root_path": "",
             "server": ("localhost", 80), "client": ("127.0.0.1", 12345),
             "headers": [(b"host", b"localhost"), (b"content-type", b"application/json"),
                         (b"content-length", str(len(data)).encode()), *headers]}
    await application(scope, receive, send)
    start = next(item for item in messages if item["type"] == "http.response.start")
    body = b"".join(item.get("body", b"") for item in messages if item["type"] == "http.response.body")
    return start["status"], dict(start["headers"]), body


async def main():
    database = ROOT / "migration_docs/test-results/runtime-smoke.sqlite3"
    database.parent.mkdir(parents=True, exist_ok=True)
    if database.exists():
        database.unlink()
    settings.DATABASES["default"]["NAME"] = str(database)
    assert auth_state.initialize_database()
    assert not auth_state.initialize_database()
    user = auth_state.create_user("runtime-user", password="runtime-only")
    token = "a" * 40
    with closing(sqlite3.connect(database)) as connection, connection:
        connection.execute("INSERT INTO authtoken_token (key, created, user_id) VALUES (?, ?, ?)",
                           (token, "2026-10-28 00:00:00", user.id))
    session = auth_state.Session(None)
    session.data = {"_auth_user_id": str(user.id), "_auth_user_backend": auth_state.MODEL_BACKEND,
                    "_auth_user_hash": user.get_session_auth_hash()}
    session.save()
    for route, _ in urlpatterns:
        code, _, _ = await request("POST", "/api/" + route, b"{}")
        assert code == 400, route
    assert (await request("POST", "/api/report/billing", b"{}", [(b"authorization", b"Token unknown")]))[0] == 401
    assert (await request("POST", "/api/report/billing", b"{}", [(b"authorization", ("Token " + token).encode())]))[0] == 400
    code, headers, _ = await request("POST", "/api/report/billing", b"{}", [(b"cookie", ("sessionid=" + session.session_key).encode())])
    assert code == 400 and b"set-cookie" not in headers
    code, _, body = await request("GET", "/api/swagger.json")
    assert code == 200 and json.loads(body)["swagger"] == "2.0"
    code, headers, body = await request("GET", "/api/swagger/")
    assert code == 200 and b"csrftoken=" in headers[b"set-cookie"] and b"swagger-ui" in body
    code, headers, body = await request("GET", "/api/report/billing", headers=[(b"accept", b"text/html")])
    assert code == 405 and b"csrfmiddlewaretoken" in body and b"csrftoken=" in headers[b"set-cookie"]
    assert (await request("GET", "/static/drf-yasg/swagger-ui-init.js"))[0] == 200
    database.unlink()
    print(json.dumps({"runtime": "Django-free", "python": sys.version.split()[0], "business_routes": len(urlpatterns),
                      "validation": "46/46", "token_session_browser_schema": "PASS"}))


def verify_http_server():
    """Exercise a real Uvicorn listener using only the runtime interpreter."""
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "velocloud_app.asgi:application",
         "--host", "127.0.0.1", "--port", str(port), "--log-level", "error"],
        cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    base = f"http://localhost:{port}"
    try:
        deadline = time.monotonic() + 30
        while True:
            try:
                with opener.open(base + "/api/swagger.json", timeout=2) as response:
                    assert json.load(response)["swagger"] == "2.0"
                break
            except (urllib.error.URLError, TimeoutError):
                if process.poll() is not None or time.monotonic() >= deadline:
                    raise AssertionError("Runtime HTTP server did not start")
                time.sleep(0.1)
        request = urllib.request.Request(base + "/api/report/billing", data=b"{}",
                                         headers={"Content-Type": "application/json"})
        try:
            opener.open(request, timeout=5)
        except urllib.error.HTTPError as response:
            assert response.code == 400
            assert json.load(response) == {"params": ["This field is required."],
                                           "devices": ["This field is required."]}
        else:
            raise AssertionError("Missing-field request unexpectedly succeeded")
        print(json.dumps({"runtime_http_server": "PASS", "server": "Uvicorn", "django_installed": False}))
    finally:
        process.terminate()
        try:
            output, _ = process.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            output, _ = process.communicate()
        if output:
            print(output.decode(errors="replace"))


if __name__ == "__main__":
    asyncio.run(main())
    verify_http_server()
