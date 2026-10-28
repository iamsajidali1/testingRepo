"""The three original request media types, with their original upload limits."""
import codecs
import json
import re
from email.message import Message
from urllib.parse import parse_qsl

from starlette.datastructures import FormData, Headers, UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser
from python_multipart.multipart import parse_options_header

from api.http import APIError, RequestDataTooBig, TooManyFieldsSent, TooManyFilesSent


MEMORY_LIMIT = 2_621_440


class _FieldLimit(MultiPartException):
    pass


class _MultipartParser(MultiPartParser):
    spool_max_size = MEMORY_LIMIT

    def __init__(self, *args, total_length, **kwargs):
        super().__init__(*args, **kwargs)
        self._field_bytes = 0
        self._total_length = total_length
        self._ignore_part = False

    def on_part_begin(self):
        self._ignore_part = False
        super().on_part_begin()

    def on_headers_finished(self):
        _, options = parse_options_header(self._current_part.content_disposition)
        if not options.get(b"name"):
            self._ignore_part = True
            self._current_fields += 1
            if self._current_fields > self.max_fields:
                raise MultiPartException("Too many fields.")
            return
        super().on_headers_finished()
        self._current_part.field_name = options[b"name"].decode(self._charset, errors="replace")
        if self._current_part.file is None:
            self._field_bytes += len(self._current_part.field_name) + 2
        elif self._total_length > MEMORY_LIMIT:
            self._current_part.file.file.rollover()

    def on_part_data(self, data, start, end):
        if self._ignore_part:
            return
        if self._current_part.file is None:
            self._field_bytes += end - start
            if self._field_bytes > MEMORY_LIMIT:
                raise _FieldLimit("Request body exceeded settings.DATA_UPLOAD_MAX_MEMORY_SIZE.")
        super().on_part_data(data, start, end)

    def on_part_end(self):
        if self._ignore_part:
            return
        if self._current_part.file is None:
            self.items.append((self._current_part.field_name, self._current_part.data.decode(self._charset, errors="replace")))
        else:
            super().on_part_end()


async def _without_preamble(request, boundary):
    marker = b"--" + boundary.encode("ascii")
    prefix, started = b"", False
    async for chunk in request.stream():
        if started:
            yield chunk
        else:
            prefix += chunk
            position = prefix.find(marker)
            if position >= 0:
                started = True
                yield prefix[position:]
            else:
                prefix = prefix[-len(marker):]


def _strict_constant(value):
    raise ValueError(f"Out of range float values are not JSON compliant: '{value}'")


async def parse_body(request):
    try:
        length = int(request.headers.get("content-length", 0))
    except ValueError:
        length = 0
    if length == 0:
        return {}
    media_type = request.headers.get("content-type", "")
    message = Message()
    message["content-type"] = media_type
    encoding = message.get_content_charset() or "utf-8"
    try:
        codecs.lookup(encoding)
    except LookupError:
        encoding = "utf-8"
    content_type = message.get_content_type() if media_type else ""
    if content_type == "multipart/form-data":
        try:
            media_type.encode("ascii")
        except UnicodeError as exc:
            raise APIError("Multipart form parse error - Invalid non-ASCII Content-Type in multipart: " + media_type) from exc
        boundary = message.get_param("boundary")
        if not boundary or not re.fullmatch(r"[ -~]{0,200}[!-~]", boundary):
            raise APIError("Multipart form parse error - Invalid boundary in multipart: " + str(boundary))
        if length < 0:
            raise APIError("Multipart form parse error - Invalid content length: " + str(length))
        headers = Headers({**dict(request.headers), "content-type": re.sub(r";\s*charset=[^;]+", "", media_type) + "; charset=" + encoding})
        parser = _MultipartParser(headers, _without_preamble(request, boundary), total_length=length,
                                  max_files=100, max_fields=1000, max_part_size=MEMORY_LIMIT)
        try:
            form = await parser.parse()
        except _FieldLimit as exc:
            raise RequestDataTooBig(str(exc)) from exc
        except MultiPartException as exc:
            if str(exc).startswith("Too many files"):
                raise TooManyFilesSent("The number of files exceeded settings.DATA_UPLOAD_MAX_NUMBER_FILES.") from exc
            if str(exc).startswith("Too many fields"):
                raise TooManyFieldsSent("The number of GET/POST parameters exceeded settings.DATA_UPLOAD_MAX_NUMBER_FIELDS.") from exc
            raise APIError("Multipart form parse error - " + str(exc)) from exc
        for _, value in form.multi_items():
            if isinstance(value, UploadFile):
                value._legacy_upload_type = "InMemoryUploadedFile" if length <= MEMORY_LIMIT else "TemporaryUploadedFile"
        return form
    body = await request.body()
    if not body:
        return {}
    if content_type == "application/json":
        try:
            return json.loads(body.decode(encoding), parse_constant=_strict_constant)
        except (ValueError, UnicodeError) as exc:
            raise APIError(f"JSON parse error - {exc}") from exc
    if content_type == "application/x-www-form-urlencoded":
        try:
            text = body.decode(encoding)
        except UnicodeDecodeError:
            text = body.decode("iso-8859-1")
        try:
            return FormData(parse_qsl(text, keep_blank_values=True, max_num_fields=1000, encoding=encoding))
        except ValueError as exc:
            raise TooManyFieldsSent("The number of GET/POST parameters exceeded settings.DATA_UPLOAD_MAX_NUMBER_FIELDS.") from exc
    raise APIError(f'Unsupported media type "{media_type}" in request.', 415)
