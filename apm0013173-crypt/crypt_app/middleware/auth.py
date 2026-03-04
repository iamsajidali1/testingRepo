# pylint: disable=too-few-public-methods
import re
import traceback
from string import ascii_letters
from random import choice
from pprint import pprint
from urllib.parse import unquote, urlparse
from base64 import b64decode
from functools import lru_cache

import requests
from django.shortcuts import redirect
from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth import get_user_model

LETTERS = (
    ascii_letters
    + "".join([str(i) for i in range(10)])
    + "!_-$@#$~^&*{}^]['><"
)
GL_URL = "https://www.e-access.att.com/empsvcs/hrpinmgt/pagLogin/"
AAF_URL = "https://aaf.it.att.com"
AAF_INVALID_USERNAME = -1
AAF_UNEXPECTED_FORMAT = -2
DISABLE_CACHE = ("no-cache", "no-store")

# exclude auth for documentation pages
PATH_TO_EXCLUDE = ["/", "/api/swagger/", "/api/redoc/"]
# in-cluster calls to avoid AAF Auth
HOST_DOMAIN_TO_EXCLUDE = ".com-att-one.svc.cluster.local"


def attuid_from_atteshr(cookie: str) -> str:
    """
    Parse ATTUID from AT&T CSP Global Logon's attESHr cookie.
    """
    result = ""

    # original value is in urlencoded string (percent-encoded)
    cookie = unquote(cookie).split("|")

    # unhandled case, report back to log and find out how to implement later
    if len(cookie) < 5:
        print("User with strange HR cookie attempted to register!")
        print(cookie)
        return result

    attuid = cookie[-5].split(",")
    if attuid:
        attuid = attuid[0]

    # assert found (might be "")
    # attuid length (2 letters + 4 alphanumeric chars)
    if attuid and len(attuid) == 6:
        result = attuid

    return result


def create_user(username: str, email: str = ""):
    print(f"Create user: {username}")
    model = get_user_model()
    username = username.replace("@att.com", "")
    print(f"Real username: {username}")

    user = model.objects.filter(username=username).first()
    print(f"Search for user: {user!r}")

    if not user:
        user = model.objects.create_user(
            email=email or f"{username}@att.com", username=username,
            password="".join(choice(LETTERS) for _ in range(64))
        )
        print(f"Created user: {user}")

    return user


@lru_cache(maxsize=128)
def get_aaf_user_permissions(username: str, password: str) -> dict:
    print(f"Getting user permissions for {username}")

    result = {
        "status": 0, "message": "", "perms": []
    }

    perm_url = f"{AAF_URL}:8100/authz/perms/user"
    print(f"Base URL: {perm_url}")
    if "@" not in username:
        print(f"Invalid user was supplied: {username}")
        result["status"] = AAF_INVALID_USERNAME
        result["message"] = "Invalid username"
        return result

    url = f"{perm_url}/{username}"
    print(f"Trying URL: {url}")
    resp = requests.get(url=url, verify=False, auth=(username, password))
    status = resp.status_code

    print(f"Response: {resp}")
    pprint(resp.headers)

    result["status"] = status
    result["message"] = resp.text

    if status == 200:
        # 200 has to contain valid JSON
        result["message"] = ""
        perms = resp.json()

        if not isinstance(perms, dict):
            print(f"Something is wrong with AAF API: {perms!r}")
            result["status"] = AAF_UNEXPECTED_FORMAT
        else:
            result["perms"] = perms.get("perm", [])

    print(f"Found {len(result.get('perms'))} permissions")
    return result


class AAFAuthorization:
    """
    Middleware using Authorization header to check with AAF whether mechid or
    Global Logon creds were supplied. Replaces LGW on Azure and doesn't keep
    cache in a silly way.

    Settings:
    * reject_global_logon -> TBD
    * create_user -> create a Django user in app
    * set_request_user -> request.user = <user>
    * set_remote_user -> for REMOTE_USER auth middleware
    * home_url -> redirect to instead of 403
    * check_permissions -> validate user's permissions
    * required_permissions -> list of user's permissions in AAF format:
        [
            {"action": ..., "instance": ..., "type": ...},
            {"action": ..., "instance": ..., "type": ...}
        ]
    """
    def __init__(self, get_response):
        print("Initializing AAFAuthorization")
        self.get_response = get_response
        self.settings_name = "AAF_MIDDLEWARE"
        self.settings = getattr(settings, self.settings_name, dict(
            reject_global_logon=False,  # False | True (403) | "url" (302)
            create_user=False, set_request_user=False, set_remote_user=False,
            home_url=None, check_permissions=False, required_permissions=[]
        ))
        print(f"AAFAuthorization settings: {self.settings}")

    @staticmethod
    def forbid(home_url: str = ""):
        if home_url:
            print(f"Redirect to: {home_url}")
            return redirect(home_url)
        else:
            return HttpResponse(status=403)

    def __call__(self, request):
        sett = self.settings
        check_perms = sett.get("check_permissions", False)
        required_perms = sett.get("required_permissions", False)
        home_url = sett.get("home_url")
        # Skip PATHs for Auth Check
        uri_path = urlparse(request.META.get("REQUEST_URI")).path
        if uri_path in PATH_TO_EXCLUDE:
            print("Auth not needed for Doc paths")
            return self.get_response(request)
        # Skip HOSTs for Auth Check
        host = request.META.get("Host")
        if HOST_DOMAIN_TO_EXCLUDE in host:
            print("Auth not needed for Host: " + host)
            return self.get_response(request)

        auth = request.META.get("HTTP_AUTHORIZATION", None)
        if not auth or "Basic" not in auth:
            print("No or incorrect Authorization header data found")
            return self.forbid(home_url=home_url)

        cache_control = request.META.get("HTTP_CACHE_CONTROL", "")

        if any([item in cache_control for item in DISABLE_CACHE]):
            get_aaf_user_permissions.cache_clear()

        if isinstance(auth, bytes):
            auth = auth.decode("utf-8")

        # strip auth type prefix
        auth = auth.lstrip("Basic").strip(" ")
        auth = b64decode(auth).decode("utf-8")
        username, password = auth.split(":")
        result = get_aaf_user_permissions(username=username, password=password)

        if result["status"] != 200:
            print(f"AAFAuthorization: forbid: {result}")
            return self.forbid(home_url=home_url)

        if check_perms:
            if not all([item in result["perms"] for item in required_perms]):
                print(f"AAFAuthorization: missing perms!")
                return self.forbid(home_url=home_url)

        should_create_user = sett.get("create_user")
        print(f"AAFAuthorization: should create user: {should_create_user}")
        if should_create_user:
            user = create_user(username=username)

            if sett.get("set_remote_user"):
                request.META["REMOTE_USER"] = user.username

            if sett.get("set_request_user"):
                print(f"AAFAuthorization: set user: {user}")
                request.user = user

        response = self.get_response(request)
        return response


class XAuthorization:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_raw = request.META.get("HTTP_AUTHORIZATION", None)
        auth_xheader = request.META.get("HTTP_X_AUTHORIZATION", auth_raw)

        if auth_xheader:
            request.META["HTTP_AUTHORIZATION"] = auth_xheader

        response = self.get_response(request)
        return response
