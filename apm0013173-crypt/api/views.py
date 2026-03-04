import sys
import logging
from io import BytesIO
from textwrap import dedent
from urllib.parse import unquote
from base64 import b64decode, b64encode

from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import authenticate

from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

from piwikapi.tracking import PiwikTracker
from pykeepass import PyKeePass

from crypt_app.settings import (
    ENV, MATOMO_URLS, MATOMO_IDS, TMATOMO_API_TOKEN
)

from api import serializers as ser
from api import models as mod
logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='[crypt] %(asctime)s: %(levelname)-8s: %(message)s'
)


def make_swagger_doc(text):
    lines = dedent(text).splitlines()
    new_lines = []

    in_code = False

    for line in lines:
        code_mark = line.startswith("```")

        # keep newlines between paragraphs
        if not line:
            new_lines.append("\n")

        # ordinary wrapped text, strip newlines
        if not in_code and not code_mark:
            line = line.strip()
            new_lines.append(line)
            continue

        # beginning a code section
        # * add newline prefix to separate it from paragraph
        # * add newline to prevent wrapping
        if not in_code and code_mark:
            in_code = True
            new_lines.append("\n" + line + "\n")
            continue

        # in a code section, add a newline to prevent wrapping
        if in_code and not code_mark:
            new_lines.append(line + "\n")
            continue

        # ending a code section, add a newline to separate from next
        # section after the code block
        if in_code and code_mark:
            in_code = False
            new_lines.append(line + "\n")
            continue

    return " ".join(new_lines)


def track_request(request, view, variables={}, attuid=None):
    print("Matomo tracking:", request, view, variables, attuid)
    print(vars(request))

    # !!!never use set_ip(), causes 302 GL redirect!!!
    tracker = PiwikTracker(MATOMO_IDS[ENV], request)
    tracker.set_api_url(MATOMO_URLS[ENV])
    tracker.set_token_auth(TMATOMO_API_TOKEN)

    lgw_user = request.META.get("HTTP_LGW_SECURITY_LOGIN_ID", "<no LGW auth>")

    # pull username from User model, AnonymousUser has always ""
    django_user = getattr(
        getattr(request, "user", {}),
        "username", "<no Django auth>"
    )

    # in case someone steals Global Logon credentials
    # -> LGW and attESHr are changed, Token user is correct
    # in case someone steals Global Logon cookies (attESHr)
    # -> LGW and Token user are correct
    # in case someone steals Token
    # -> LGW and attESHr are correct
    if not attuid:
        eshr = request.COOKIES.get("attESHr", "")
        attuid = attuid_from_atteshr(eshr) if eshr else attuid

    assert len(variables) <= 2, len(variables)
    tracker.set_custom_variable(1, "lgw_user", lgw_user)
    tracker.set_custom_variable(2, "attuid", attuid)
    tracker.set_custom_variable(3, "django_user", django_user)
    for idx, item in enumerate(variables.items(), start=4):
        key, val = item
        tracker.set_custom_variable(idx, key, val)
    print(vars(tracker))
    print(tracker.do_track_page_view(view))


def attuid_from_atteshr(cookie: str) -> str:
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


class KdbxFiles(generics.ListCreateAPIView):
    __doc__ = make_swagger_doc("""
    - Get a base64-encoded string of the ``.kdbx`` file.

    - ``POST`` to the latest version of ``kdbx`` API

    - ``GET`` the latest version of ``kdbx`` API to confirm it's been uploaded.
    """)

    queryset = mod.KdbxFiles.objects.all()
    serializer_class = ser.KdbxFiles
    permission_classes = [AllowAny]

    def anon_or_request(self, request):
        user = request.user
        result = Response(status=status.HTTP_403_FORBIDDEN)
        if not isinstance(user, AnonymousUser) and user is not None:
            self.queryset = self.queryset.filter(user=request.user)
            if not isinstance(request.data, dict):
                request.data._mutable = True
            request.data["user"] = request.user.id
            result = getattr(super(), request.method.lower())(request)
        return result

    def get(self, request):
        return self.anon_or_request(request)

    def post(self, request):
        return self.anon_or_request(request)


class KdbxFilesRUD(generics.RetrieveUpdateDestroyAPIView):
    queryset = mod.KdbxFiles.objects.all()
    serializer_class = ser.KdbxFiles
    permission_classes = [AllowAny]
    lookup_field = "id"

    def anon_or_request(self, request, *args, **kwargs):
        user = request.user
        result = Response(status=status.HTTP_403_FORBIDDEN)
        if not isinstance(user, AnonymousUser) and user is not None:
            self.queryset = self.queryset.filter(user=request.user)
            if not isinstance(request.data, dict):
                request.data._mutable = True
            request.data["user"] = request.user.id
            result = getattr(
                super(), request.method.lower()
            )(request, *args, **kwargs)
        return result

    def put(self, request, *args, **kwargs):
        return self.anon_or_request(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.anon_or_request(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.anon_or_request(request, *args, **kwargs)


class Credentials(generics.GenericAPIView):
    __doc__ = make_swagger_doc("""
    Use the JSON template from swagger to pull the credentials from your saved
    KDBX database. Use path for retrieving multiple credentials. For example:

    ```
    / (root group)
    |
    +--> New Entry
    |
    +-- Some folder
        |
        +--> my key
    ```

    ```
    {
        "kdbx_name": "name of stored kdbx",
        "paths": ["New Entry", "Some folder/my key"],
        "password": "password to KDBX",
        "url": "optional match for exact URL"
    }
    ```
    """)

    queryset = mod.KdbxFiles.objects.all()
    serializer_class = ser.CredentialsInput
    serializer_output_class = ser.CredentialsOutput
    permission_classes = [AllowAny]

    @staticmethod
    def fetch_entries(entries):
        output = []
        out_cls = Credentials.serializer_output_class

        for entry in entries:
            logging.debug("Checking entry: %s", entry)
            if entry is None:
                logging.debug("Entry is None, skipping")
                continue

            logging.debug("Fetching entry's fields")
            out = {
                attr: getattr(entry, attr) if hasattr(entry, attr) else None
                for attr in out_cls().get_fields()
            }
            logging.debug("Fetching entry's attachments")
            out["attachments"] = [
                b64encode(file.data).decode("utf-8")
                for file in getattr(entry, "attachments", [])
            ]
            output.append(out)
        return output

    @staticmethod
    def find_by_paths(kdbx, paths: list):
        output = []
        for path in paths:
            logging.debug("Checking path: '%s'", path)

            if path == "*":
                entries = kdbx.entries
            else:
                # !!!! path is a list !!!!
                entries = kdbx.find_entries(path=[path])

            logging.debug("Found entries: %s", entries)

            if not isinstance(entries, list):
                # because why having a consistent output... smh
                entries = [entries]

            output += Credentials.fetch_entries(entries)
        return output

    @staticmethod
    def find_by_tags(kdbx, tags: list):
        logging.debug("Checking tags: '%s'", tags)

        entries = []
        for entry in kdbx.entries:
            if(set(tags).issubset(set(getattr(entry, "tags", []) or []))):
                entries.append(entry)
        logging.debug("Found entries: %s", entries)

        if not isinstance(entries, list):
            # because why having a consistent output... smh
            entries = [entries]

        return Credentials.fetch_entries(entries)

    def post(self, request):
        logging.debug("Obtaining creds for: %s", request.user)
        out_cls = self.serializer_output_class
        queryset = self.get_queryset().filter(user=request.user)

        if not queryset:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class
        logging.debug("Checking data")
        serializer = serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.data
        # prefer password from header
        headerpass = request.META.get("HTTP_X_CRYPT_PASS")
        if headerpass is not None:
            data["password"] = headerpass
        elif headerpass is None and "password" not in data:
            logging.debug("password not provided")
            return Response({"password":"password not provided"},status=status.HTTP_400_BAD_REQUEST)
        logging.debug("Data valid")

        queryset = queryset.filter(name=data["kdbx_name"])

        if not queryset:
            logging.debug("kdbx_name not found in DB")
            return Response(status=status.HTTP_404_NOT_FOUND)

        output = []

        logging.debug("Loading KDBX as bytes")
        stream = BytesIO(b64decode(queryset.first().file.encode("utf-8")))
        stream.seek(0)

        logging.debug("Opening KDBX with password")
        with PyKeePass(stream, password=data["password"]) as kdbx:
            paths = data.get("paths")
            tags = data.get("tags")
            url = data.get("url")

            if paths:
                logging.debug("Checking paths... %s", repr(paths))
                output += self.find_by_paths(kdbx, paths)
            elif tags:
                logging.debug("Checking tags... %s", repr(tags))
                output += self.find_by_tags(kdbx, tags)
            if url:
                filt_out=[]
                for entry in output:
                    if url == entry["url"]:
                        filt_out.append(entry)
                output = filt_out
        logging.debug("Sending data")
        serializer = out_cls(output, many=True)
        return Response(serializer.data)


class TokenResync(generics.GenericAPIView):
    __doc__ = make_swagger_doc("""
    Resync a user token, retrieves a new one once a user and password are
    provided.

    ```
    {
        "username": "my-username",
        "password": "special-password"
    }
    ```
    """)

    serializer_class = ser.TokenResync
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Token.objects.filter(user=self.request.user)

    def post(self, request):
        out_cls = self.serializer_class

        raw_data = out_cls(data=request.data)
        raw_data.is_valid(raise_exception=True)
        data = raw_data.data

        user = authenticate(
            username=data["username"], password=data["password"]
        )
        if not user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        self.request.user = user

        self.get_queryset().delete()
        token = Token.objects.get_or_create(user=user)

        return Response(data=out_cls(dict(
            username=user.username, password="", token=token[0].key
        )).data)
