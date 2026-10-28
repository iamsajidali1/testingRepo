"""Validation for the field types used by this adapter's four input schemas.

The public serializer interface is retained so business handlers do not change.
Errors intentionally follow the existing API's 400 response contract.
"""
import datetime
import json
import re
from collections.abc import Mapping
from copy import deepcopy
from starlette.datastructures import FormData


class ValidationError(Exception):
    def __init__(self, detail):
        self.detail = detail
        super().__init__(str(detail))


_MISSING = object()


def _input_type(value):
    return getattr(value, "_legacy_upload_type", type(value).__name__)


def _html_list(data, prefix="", default=_MISSING):
    result = {}
    pattern = re.compile(r"^" + re.escape(prefix) + r"\[([0-9]+)\](.*)$")
    for key, value in data.items():
        match = pattern.match(key)
        if match:
            index, child = int(match[1]), match[2]
            if not child:
                result[index] = value
            else:
                existing = result.get(index, {})
                if not isinstance(existing, dict):
                    existing = {}
                existing[child] = value
                result[index] = existing
    return [FormData(item) if isinstance(item, dict) else item for _, item in sorted(result.items())] if result else default


def _html_dict(data, prefix=""):
    pattern = re.compile(r"^" + re.escape(prefix) + r"\.(.+)$")
    return FormData([(match[1], value) for key in data for match in [pattern.match(key)] if match
                     for value in data.getlist(key)])


class Field:
    def __init__(self, *, required=True, default=_MISSING, allow_null=False,
                 allow_blank=False, child=None, choices=None, input_formats=None):
        self.required = required if default is _MISSING else False
        self.default = default
        self.allow_null = allow_null
        self.allow_blank = allow_blank
        self.child = child
        self.choices = choices
        self.input_formats = input_formats

    def fail(self, message):
        raise ValidationError([message])

    def run_validation(self, value=_MISSING):
        if value is _MISSING:
            if self.default is not _MISSING:
                return deepcopy(self.default)
            if self.required:
                self.fail("This field is required.")
            return _MISSING
        if value is None:
            if self.allow_null:
                return None
            self.fail("This field may not be null.")
        return self.to_internal_value(value)

    def to_internal_value(self, value):
        return value


class CharField(Field):
    def to_internal_value(self, value):
        if isinstance(value, bool) or not isinstance(value, (str, int, float)):
            self.fail("Not a valid string.")
        value = str(value).strip()
        if not value and not self.allow_blank:
            self.fail("This field may not be blank.")
        errors = []
        if "\x00" in value:
            errors.append("Null characters are not allowed.")
        for char in value:
            if 0xD800 <= ord(char) <= 0xDFFF:
                errors.append(f"Surrogate characters are not allowed: U+{ord(char):X}.")
                break
        if errors:
            raise ValidationError(errors)
        return value


class JSONField(Field):
    def to_internal_value(self, value):
        try:
            if getattr(value, "is_json_string", False):
                return json.loads(value)
            json.dumps(value, allow_nan=False)
        except (TypeError, ValueError):
            self.fail("Value must be valid JSON.")
        return value


class ListField(Field):
    def to_internal_value(self, value):
        if hasattr(value, "getlist"):
            value = _html_list(value, default=[])
        if isinstance(value, (str, Mapping)) or not hasattr(value, "__iter__"):
            self.fail(f'Expected a list of items but got type "{_input_type(value)}".')
        result, errors = [], {}
        for index, item in enumerate(value):
            try:
                result.append(self.child.run_validation(item) if self.child else item)
            except ValidationError as exc:
                errors[index] = exc.detail
        if errors:
            raise ValidationError(errors)
        return result


class DictField(Field):
    def to_internal_value(self, value):
        if hasattr(value, "getlist"):
            value = dict(_html_dict(value).items())
        if not isinstance(value, dict):
            self.fail(f'Expected a dictionary of items but got type "{_input_type(value)}".')
        result, errors = {}, {}
        for key, item in value.items():
            try:
                result[str(key)] = self.child.run_validation(item) if self.child else item
            except ValidationError as exc:
                errors[str(key)] = exc.detail
        if errors:
            raise ValidationError(errors)
        return result


class DateField(Field):
    def to_internal_value(self, value):
        if isinstance(value, datetime.datetime):
            self.fail("Expected a date but got a datetime.")
        if isinstance(value, datetime.date):
            return value
        for date_format in self.input_formats:
            try:
                return datetime.datetime.strptime(value, date_format).date()
            except (ValueError, TypeError):
                pass
        self.fail("Date has wrong format. Use one of these formats instead: YYYY-MM-DD.")


class ChoiceField(Field):
    def to_internal_value(self, value):
        choices = {str(choice): choice for choice in self.choices}
        if str(value) not in choices:
            self.fail(f'"{value}" is not a valid choice.')
        return choices[str(value)]


class Serializer:
    def __init__(self, *, data=_MISSING, many=False, context=None):
        self.initial_data = data
        self.many = many
        self.context = context or {}
        self.validated_data = [] if many else {}
        self.errors = [] if many else {}

    @property
    def fields(self):
        return {name: field for base in reversed(type(self).__mro__)
                for name, field in vars(base).items() if isinstance(field, Field)}

    def _validate_one(self, data):
        if data is None:
            raise ValidationError(["This field may not be null."])
        if not isinstance(data, Mapping):
            raise ValidationError({"non_field_errors": [
                f"Invalid data. Expected a dictionary, but got {type(data).__name__}."]})
        result, errors = {}, {}
        # Django QueryDict is retained for HTML form semantics (lists and blanks).
        html = hasattr(data, "getlist")
        for name, field in self.fields.items():
            value = data.get(name, _MISSING)
            if html:
                if isinstance(field, ListField):
                    value = data.getlist(name) if name in data else _html_list(data, prefix=name)
                elif isinstance(field, DictField):
                    value = _html_dict(data, prefix=name)
                elif value == "":
                    if field.allow_null and not field.allow_blank:
                        value = None
                    elif not field.required and not field.allow_blank:
                        value = _MISSING
            try:
                validated = field.run_validation(value)
                if validated is not _MISSING:
                    result[name] = validated
            except ValidationError as exc:
                errors[name] = exc.detail
        if errors:
            raise ValidationError(errors)
        try:
            return self.validate(result)
        except ValidationError as exc:
            if isinstance(exc.detail, Mapping):
                raise ValidationError({key: value if isinstance(value, (list, Mapping)) else [value]
                                       for key, value in exc.detail.items()}) from exc
            raise ValidationError({"non_field_errors": exc.detail if isinstance(exc.detail, list) else [exc.detail]}) from exc

    def validate(self, attrs):
        return attrs

    def is_valid(self, *, raise_exception=False):
        try:
            if self.initial_data is None:
                raise ValidationError({"non_field_errors": ["No data provided"]})
            if self.many:
                if not isinstance(self.initial_data, list):
                    raise ValidationError({"non_field_errors": [
                        f'Expected a list of items but got type "{type(self.initial_data).__name__}".']})
                results, errors = [], []
                for item in self.initial_data:
                    try:
                        results.append(self._validate_one(item))
                        errors.append({})
                    except ValidationError as exc:
                        results.append({})
                        errors.append(exc.detail)
                if any(errors):
                    raise ValidationError(errors)
                self.validated_data = results
            else:
                self.validated_data = self._validate_one(self.initial_data)
            self.errors = [] if self.many else {}
        except ValidationError as exc:
            self.errors = exc.detail
            self.validated_data = [] if self.many else {}
            if raise_exception:
                raise
        return not bool(self.errors)

    @property
    def data(self):
        def represent(value):
            if isinstance(value, datetime.date):
                return value.isoformat()
            if isinstance(value, dict):
                return {k: represent(v) for k, v in value.items()}
            if isinstance(value, list):
                return [represent(item) for item in value]
            return value
        def with_optional_nulls(data):
            result = dict(data)
            for name, field in self.fields.items():
                if name not in result and field.allow_null:
                    result[name] = None
            # Field declaration order is observable in JSON rendering.
            return {name: result[name] for name in self.fields if name in result}
        value = ([with_optional_nulls(item) for item in self.validated_data] if self.many
                 else with_optional_nulls(self.validated_data))
        return represent(value)
