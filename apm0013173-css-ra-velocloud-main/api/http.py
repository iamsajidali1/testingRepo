"""Small HTTP boundary retaining the business handlers' public interfaces."""
import datetime
import decimal
import json
import uuid

import starlette.status
from starlette.responses import Response as StarletteResponse

status = starlette.status


class APIError(Exception):
    def __init__(self, detail, status=400):
        self.detail, self.status = detail, status


class BadRequest(Exception):
    pass


class RequestDataTooBig(BadRequest):
    pass


class TooManyFieldsSent(BadRequest):
    pass


class TooManyFilesSent(BadRequest):
    pass


def negotiate(accept, renderers):
    """Match media specificity in renderer order, retaining legacy q handling."""
    accepted = []
    for raw in accept.split(","):
        parts = raw.strip().split(";")
        media = parts[0].strip().lower()
        main, _, sub = media.partition("/")
        rank = (0 if main == "*" else 1 if sub == "*" else
                3 if any(param.split("=")[0].strip().lower() != "q" for param in parts[1:]) else 2)
        accepted.append((rank, main, sub, raw.strip()))
    for rank in (3, 2, 1, 0):
        for format, mime in renderers:
            main, sub = mime.split("/")
            for priority, wanted_main, wanted_sub, raw in accepted:
                if priority == rank and wanted_main in ("*", main) and wanted_sub in ("*", sub):
                    return format, raw
    return None, None


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, datetime.datetime):
            value = obj.isoformat()
            return value[:-6] + "Z" if value.endswith("+00:00") else value
        if isinstance(obj, (datetime.date, datetime.time)):
            if isinstance(obj, datetime.time) and obj.utcoffset() is not None:
                raise ValueError("JSON can't represent timezone-aware times.")
            return obj.isoformat()
        if isinstance(obj, datetime.timedelta):
            return str(obj.total_seconds())
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, bytes):
            return obj.decode()
        if hasattr(obj, "tolist"):
            return obj.tolist()
        if hasattr(obj, "__getitem__"):
            try:
                return (list if isinstance(obj, (list, tuple)) else dict)(obj)
            except Exception:
                pass
        if hasattr(obj, "__iter__"):
            return tuple(obj)
        return super().default(obj)


class Response(StarletteResponse):
    media_type = "application/json"

    def __init__(self, data=None, status=200, headers=None):
        self.data = data
        # Render only after the handler returns, matching the original response
        # boundary. Rendering failures must not enter a business method's except.
        super().__init__(None, status_code=status, headers=headers)
        if data is None:
            del self.headers["content-type"]

    def render(self, content):
        if content is None:
            return b""
        return json.dumps(content, cls=JSONEncoder, ensure_ascii=False,
                          allow_nan=False, separators=(",", ":")).replace(
                              "\u2028", "\\u2028").replace("\u2029", "\\u2029").encode()


class HttpResponse(StarletteResponse):
    def __init__(self, content=b"", content_type="text/html; charset=utf-8", status=200):
        if not isinstance(content, (str, bytes, memoryview)):
            content = str(content)
        super().__init__(bytes(content) if isinstance(content, memoryview) else content,
                         status_code=status, headers={"Content-Type": content_type})

    def __setitem__(self, name, value):
        self.headers[name] = value


class GenericAPIView:
    """Only the serializer factory used by the unchanged business methods."""

    def get_serializer(self, *args, **kwargs):
        kwargs.setdefault("context", {"request": getattr(self, "request", None),
                                      "view": self, "format": getattr(self, "format_kwarg", None)})
        serializer = self.serializer_class(*args, **kwargs)
        self._last_serializer = serializer
        return serializer
