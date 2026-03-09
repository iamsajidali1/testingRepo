from textwrap import dedent
from traceback import print_exc
from datetime import datetime, timezone
from urllib.parse import unquote

from django.contrib.auth.models import User
from django.db import IntegrityError, models as django_models
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.generics import (
    CreateAPIView, GenericAPIView, ListAPIView, RetrieveAPIView
)
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import LimitOffsetPagination
from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers

from piwikapi.tracking import PiwikTracker
from pp_application.settings import (
    ENV, MATOMO_URLS, MATOMO_IDS, TMATOMO_API_TOKEN, MYSQL_DUPLICATE_ENTRY
)

from api.serializers import (
    MessageSerializer, SubscriptionTypeSerializer, SubscriberSerializer,
    TimeSerializer, MessageTypeSerializer, UnhandledMessageSerializer
)
from api import serializers as ser
from api.models import (
    ApplicationModel, MessageModel, SubscriptionTypeModel, SubscriberModel,
    MessageTypeModel, AttachmentModel, UnhandledMessageModel
)
from api import models as mod
from broker.handlers import (
    new_message, check_planned_messages, notify_new_registration
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

    return " ".join(new_lines)


def _track_request(request, view, variables={}, attuid=None):
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


def track_request(*args, **kwargs):
    """Matomo is sometimes down and does not have auto-recovery."""
    try:
        _track_request(*args, **kwargs)
    except Exception:
        import traceback
        traceback.print_exc()


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


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v2"]))
class V2RegistrationView(CreateAPIView):
    __doc__ = make_swagger_doc("""
    Once you have AAF permission assigned to your user (``attuid@csp.att.com``
    or ``mechid@namespace.att.com``) you'll need to provide two headers in each
    HTTP request:

    ## Authorization

    This header is directly for LGW and contains base64 encoded value of
    ``user:password`` such as ``ms639x@csp.att.com:example-password`` or
    ``m12345@myapp.att.com:example-password``.

    ```
    Authorization: Basic YXR0dWlkQGNzcC5hdHQuY29tOnBhc3N3b3Jk
    ```

    ## X-Authorization

    This header is for Paperplane to identify your application and its value
    is the token returned from ``/register`` API.

    ```
    X-Authorization: Token 12345
    ```
    """)

    permission_classes = [AllowAny]
    serializer_class = ser.V2RegistrationSerializer
    queryset_class = ApplicationModel.objects.all()

    def create(self, request, *_, **__):
        # pylint: disable=no-else-return
        track_request(
            request, view="V2RegistrationView", variables=dict(method="create")
        )
        user = None
        if not request.user.is_authenticated:
            app = request.data.get("app_name")
            try:
                user = User.objects.create(username=app)
            except IntegrityError as exc:
                exc_id, msg, *_ = exc.args
                if exc_id == MYSQL_DUPLICATE_ENTRY:
                    return Response(
                        data={"message": f"App '{app}' exists"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return Response(
                        data={"message": msg},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        else:
            user = request.user
        assert user

        parsed = self.get_serializer(data=request.data)
        if not parsed.is_valid(raise_exception=False):
            user.delete()
            return Response(
                data={"message": "Incorrect input values!"},
                status=status.HTTP_400_BAD_REQUEST
            )

        app_obj = ApplicationModel.objects.create(
            # fetch validated  data from serializer spec
            **parsed.validated_data,

            # and provide on-the-fly generated token
            token=Token.objects.create(user=user)
        )

        # custom create
        serialized = self.get_serializer(app_obj).data
        headers = self.get_success_headers(serialized)

        # notify about the new account
        notify_new_registration(serialized)

        return Response(
            serialized, status=status.HTTP_201_CREATED, headers=headers
        )


@method_decorator(name='post', decorator=swagger_auto_schema(tags=['v1']))
class MessageView(GenericAPIView):  # LoggingMixin,
    __doc__ = make_swagger_doc("""
    Create a message by POSTing a JSON.

    To send an attachment (currently supported only in e-mails) use optional
    "attachments" field in the json and specify the field name + its base64
    encoded form. For example:

    ```
    {
        "type": "email",
        "body": "Paperplane attachment testing",
        "to": [
            "someone@att.com"
        ],
        "subject": "It should be attached :)",
        "sender": "MyApplication",
        "attachments": {
            "displayed_filename.docx": "base64 encoded value"
        }
    }
    ```

    Encode a file via shell:

    ```
    cat file.txt | base64
    ```

    Encode a file in Python:

    ```
    >>> from base64 import b64encode
    >>> with open("start.sh", "rb") as f:
    ...     print(b64encode(f.read()).decode("utf-8"))
    ```
    """)

    serializer_class = MessageSerializer
    queryset_class = MessageModel

    def post(self, request, *_, **__):
        track_request(
            request, view="MessageView", variables=dict(method="post")
        )
        if not isinstance(request.data, dict):
            request.data._mutable = True  # pylint: disable=protected-access

        data = self.get_serializer(request.data).data
        print(vars(request))

        try:
            user = ApplicationModel.objects.get(token=request.auth)
        except ApplicationModel.DoesNotExist:
            return Response(status=status.HTTP_403_FORBIDDEN)

        data["app"] = user
        try:
            data["type"] = MessageTypeModel.objects.get(name=data["type"])
        except MessageTypeModel.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # Ensure 'to' is a flat list of strings and serialize as JSON
        import json
        to_field = data.get("to")
        if isinstance(to_field, str):
            import ast
            try:
                to_field = ast.literal_eval(to_field)
            except Exception:
                to_field = [to_field]
        if isinstance(to_field, list):
            flat_to = []
            for item in to_field:
                if isinstance(item, list):
                    flat_to.extend(item)
                else:
                    flat_to.append(item)
            data["to"] = json.dumps(flat_to)
        else:
            data["to"] = json.dumps([str(to_field)] if to_field else [])

        attachments = None
        if "attachments" in data:
            print(f"Found 'attachments' in data, value: {data['attachments']}")
            attachments = data.pop("attachments")
        msg = MessageModel(**data)
        if attachments:
            print("Setting skip_signals = True")
            msg.skip_signals = True

        print("Saving message")
        msg.save()

        new_message(msg)
        # in case an attachments fails, we shouldn't really care
        # and save (and deliver) the message nevertheless
        try:
            # if attachments is incorrect, use empty dict as fallback
            for name, attach in (attachments or {}).items():
                AttachmentModel.objects.create(
                    name=name, message=msg,
                    binary=attach
                )
        except Exception:  # pylint: disable=broad-except
            print_exc()
        finally:
            if hasattr(msg, "skip_signals"):
                print("Deleting skip_signals")
                del msg.skip_signals

        if attachments and not vars(msg).get("skip_signals", False):
            print("Triggering signal manually (message with attachments)")
            django_models.signals.post_save.send(
                sender=msg.__class__, instance=msg, created=True,
                update_fields=None, raw=False, using=None
            )
        return Response(status=status.HTTP_201_CREATED)


@method_decorator(name='post', decorator=swagger_auto_schema(tags=['v2']))
class V2MessageView(GenericAPIView):
    __doc__ = make_swagger_doc("""
    Create a message by POSTing a JSON.

    First check the type of the message you want to send in the message types
    API, then supply the name of the type to the message API:

    ```
    > Request: GET /v*/message/types

    < Response: 200 OK
    < Body:
    [
        {
            "id": 1,
            "name": "qmessage",
            "handle": true,
            "description": "Standard 1-to-1 Q message."
        },
        ...
    ]

    > Request: POST /v*/message
    > Body:
    {
        "type": "qmessage",
        "body": "my message",
        "to": ["attuid", "attuid2"]
    }

    < Response: 201 Created
    ```

    ## Broadcasting

    With broadcasting the ``to`` field specifies the subscription type names
    from the ``/v*/subscribe/types``.

    For example you as an app want to send a MAINTENANCE announcement to your
    users and at the same time test whether the message is being delivered via
    DEBUG announcement to your devs, specify the request body this way:

    ```
    {
        "type": "broadcast",
        "body": "my message",
        "to": ["DEBUG", "MAINTENANCE"]
    }
    ```

    Paperplane will automatically use the token you provide in the auth header
    to get all your subscribers and you only need to specify the category.

    ## Read & Delivered notifications

    Supported only for e-mails and broadcasts.

    Get a notification back if someone receives or even reads your e-mail. The
    notification will be sent to "reply_to" email if specified otherwise to the
    "from_email" which is the main email specified when you registered your
    application and got a token back.

    Note: Notification about reading an email can be cancelled by user,
    so it might not be always reliable.

    ## Bots

    To use your own bots (such as Q Messenger bot) check the ``/v*/bot/`` APIs
    to get the headers that can switch the used credentials from the default
    ones to the credentials of your bot.

    ## Attachments

    To send an attachment (currently supported only in e-mails) use optional
    "attachments" field in the json and specify the field name + its base64
    encoded form. For example:

    ```
     {
         "type": "email",
         "body": "Paperplane attachment testing",
         "to": [
             "someone@att.com"
         ],
         "subject": "It should be attached :)",
         "attachments": {
             "displayed_filename.docx": "base64 encoded value"
         }
     }
    ```

    ### Encoding attachments

    Encode a file via shell:

    ```
    cat file.txt | base64
    ```

    Encode a file in Python:

    ```
    >>> from base64 import b64encode
    >>> with open("start.sh", "rb") as f:
    ...     print(b64encode(f.read()).decode("utf-8"))
    ```
    """)

    serializer_class = ser.V2MessageSerializer
    queryset_class = MessageModel

    def post(self, request, *_, **__):
        track_request(
            request, view="MessageView", variables=dict(method="post")
        )
        if not isinstance(request.data, dict):
            request.data._mutable = True  # pylint: disable=protected-access

        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        data = data.data
        print(vars(request))

        try:
            user = ApplicationModel.objects.get(token=request.auth)
        except ApplicationModel.DoesNotExist:
            return Response(status=status.HTTP_403_FORBIDDEN)

        data["app"] = user
        try:
            data["type"] = MessageTypeModel.objects.get(name=data["type"])
        except MessageTypeModel.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # Ensure 'to' is a flat list of strings and serialize as JSON
        import json
        to_field = data.get("to")
        if isinstance(to_field, str):
            import ast
            try:
                to_field = ast.literal_eval(to_field)
            except Exception:
                to_field = [to_field]
        if isinstance(to_field, list):
            flat_to = []
            for item in to_field:
                if isinstance(item, list):
                    flat_to.extend(item)
                else:
                    flat_to.append(item)
            data["to"] = json.dumps(flat_to)
        else:
            data["to"] = json.dumps([str(to_field)] if to_field else [])

        attachments = None
        if "attachments" in data:
            print(f"Found 'attachments' in data, value: {data['attachments']}")
            attachments = data.pop("attachments")

        msg = MessageModel(**data)

        print("Saving message")
        msg.save()

        # in case an attachments fails, we shouldn't really care
        # and save (and deliver) the message nevertheless
        try:
            print("Handling attachments")
            # if attachments is incorrect, use empty dict as fallback
            for name, attach in (attachments or {}).items():
                print(f"Attachment {name}")
                AttachmentModel.objects.create(
                    name=name, message=msg, binary=attach
                )
        except Exception:  # pylint: disable=broad-except
            print_exc()

        new_message(msg, options=dict(
            bot_type=request.META.get("HTTP_X_BOT_TYPE"),
            bot_username=request.META.get("HTTP_X_BOT_USERNAME"),
            bot_password=request.META.get("HTTP_X_BOT_PASSWORD"),
            bot_token=request.META.get("HTTP_X_BOT_TOKEN")
        ))
        return Response(status=status.HTTP_201_CREATED)


@method_decorator(name='post', decorator=swagger_auto_schema(tags=['v2']))
@method_decorator(name='put', decorator=swagger_auto_schema(tags=['v2']))
class V2EventView(GenericAPIView):
    __doc__ = make_swagger_doc("""
    Create a standard .ics event by POSTing a JSON.


    First check the type of the event you want to send in the event types
    API, then supply the name of the type to the event API:

    ```
    > Request: GET /v*/event/types

    < Response: 200 OK
    < Body:
    [
        {
            "id": 1,
            "name": "calendar-event",
            "handle": true,
            "description": "A standard .ics calendar event"
        },
        ...
    ]
    ```

    Note that the ``begin`` and ``end`` fields has to be in ISO standard
    datetime format. If the value contains a timezone info as well, it will
    be replaced by the timezone specified in the ``timezone`` field.

    ```
    > Request: POST /v*/event
    > Body:
    {
        "type": "calendar-event",
        "begin": "2020-04-22 20:53:46.883566+02:00",
        "end": "2020-04-22 20:57:46.883566+02:00",
        "timezone": "GMT+2"
    }
    ```

    To update your event's properties you'll need the ``uid`` provided from the
    POST API. Then provide the same response as you get from the POST API with
    appropriate fields changed.

    ```
    > Request: PUT /v*/event
    > Body:
    {
        "type": "calendar-event",
        "begin": "2020-04-22 20:53:46.883566+02:00",
        "end": "2020-04-22 20:57:46.883566+02:00",
        "timezone": "GMT+7"
    }
    ```
    """)

    serializer_class = ser.V2EventSerializer
    queryset_class = mod.EventModel

    def post(self, request, *_, **__):
        track_request(
            request, view="EventView", variables=dict(method="post")
        )
        if not isinstance(request.data, dict):
            request.data._mutable = True  # pylint: disable=protected-access

        print(vars(request))
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data

        try:
            user = ApplicationModel.objects.get(token=request.auth)
        except ApplicationModel.DoesNotExist:
            return Response(status=status.HTTP_403_FORBIDDEN)

        data["app"] = user
        try:
            data["type"] = mod.EventTypeModel.objects.get(name=data["type"])
        except mod.EventTypeModel.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        msg = mod.EventModel(**data)

        print("Saving event")
        msg.save()

        return Response(
            data=self.get_serializer(msg).data, status=status.HTTP_201_CREATED
        )

    def put(self, request, *_, **__):
        track_request(
            request, view="EventView", variables=dict(method="post")
        )
        if not isinstance(request.data, dict):
            request.data._mutable = True  # pylint: disable=protected-access

        print(vars(request))
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        fields = parsed.get_fields().keys()

        try:
            user = ApplicationModel.objects.get(token=request.auth)
        except ApplicationModel.DoesNotExist:
            return Response(status=status.HTTP_403_FORBIDDEN)

        data["app"] = user
        try:
            data["type"] = mod.EventTypeModel.objects.get(name=data["type"])
        except mod.EventTypeModel.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        evt = get_object_or_404(mod.EventModel, app=user, uid=data["uid"])

        # nothing silly with IDs allowed
        if "id" in data:
            del data["id"]

        # set all attrs, this is ok since serializer validates the input
        for key, value in data.items():
            # skip silly object hijacking stuff
            if key not in fields:
                continue
            try:
                setattr(evt, key, value)
            except Exception:  # pylint: disable=broad-except
                print_exc()

        print("Saving event")
        evt.save(update_fields=[
            "name", "description",
            "begin", "end", "timezone",
            "cancelled", "rescheduled"
        ])

        # re-fetch again to prevent returning forged data and mark for running
        evt = get_object_or_404(mod.EventModel, app=user, uid=data["uid"])
        evt.processed = False
        evt.save()

        return Response(
            data=self.get_serializer(evt).data, status=status.HTTP_200_OK
        )


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v1", "v2"]))
class MessageTypeView(ListAPIView):  # LoggingMixin,
    serializer_class = MessageTypeSerializer
    queryset = MessageTypeModel.objects.all()

    def get(self, request):
        track_request(
            request, view="MessageTypeView", variables=dict(method="get")
        )
        return super().get(request)


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v1", "v2"]))
class EventTypeView(ListAPIView):  # LoggingMixin,
    serializer_class = ser.EventTypeSerializer
    queryset = mod.EventTypeModel.objects.all()

    def get(self, request):
        track_request(
            request, view="EventTypeView", variables=dict(method="get")
        )
        return super().get(request)


class V2TimeView(GenericAPIView):
    serializer_class = TimeSerializer

    def get_queryset(self):
        # This method is intentionally left empty because the `V2TimeView` class
        # does not require a queryset. It is used to return the current server
        # time, which does not involve querying any database models.
        pass

    @swagger_auto_schema(
        tags=["v2"],
        operation_description=make_swagger_doc("""
        Return the current server time so that a scheduled message can be
        created with a proper time independent on timezones. The time is
        provided from current application's UTC time in a standard ISO format.
        """)
    )
    def get(self, request, *_, **__):
        track_request(
            request, view="TimeView", variables=dict(method="get")
        )
        class IsoTimeSerializer(serializers.Serializer):
            isotime = serializers.DateTimeField()

        serializer = IsoTimeSerializer(data={"isotime": datetime.now(timezone.utc).isoformat()})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v2"]))
class V2SubscriptionTypeView(ListAPIView):
    serializer_class = SubscriptionTypeSerializer
    queryset = SubscriptionTypeModel.objects.all()

    def get(self, request):
        track_request(
            request, view="V2SubscriptionTypeView",
            variables=dict(method="get")
        )
        return super().get(request)


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v2"]))
class V2RegisterSubscriberView(CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = ser.NewSubscriberSerializer

    def create(self, request, *_, **__):
        track_request(
            request, view="RegisterSubscriberView",
            variables=dict(method="create")
        )
        serialized = self.get_serializer(request.data).data
        response = None

        try:
            # Ensure serialized data is valid before creating a user
            if not serialized.username or not serialized.email:
                return Response(
                    data={"message": "Invalid username or email"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            User.objects.create(
                username=serialized.username, email=serialized.email
            )
        except IntegrityError as exc:
            exc_id, msg, *_ = exc.args
            if exc_id == MYSQL_DUPLICATE_ENTRY:
                response = Response(
                    data={"message": f"User '{serialized.username}' exists"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                response = Response(
                    data={"message": msg},
                    status=status.HTTP_400_BAD_REQUEST
                )

        response = response if response is not None else Response(
            serialized, status=status.HTTP_201_CREATED,
            headers=self.get_success_headers(serialized)
        )
        return response


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v2"]))
class V2SubscribeView(CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = SubscriberSerializer
    queryset = SubscriberModel.objects.all()

    def create(self, request, *args, **kwargs):
        track_request(
            request, view="V2SubscribeView", variables=dict(method="create")
        )
        return super().create(request, *args, **kwargs)


@method_decorator(
    name="post", decorator=swagger_auto_schema(tags=["v1", "v2"])
)
class TriggerCheckPlannedMessagesView(GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, *_):
        check_planned_messages()
        return Response(status=status.HTTP_200_OK)


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v1", "v2"]))
class UnhandledMessageView(RetrieveAPIView):  # LoggingMixin,
    serializer_class = UnhandledMessageSerializer
    queryset = UnhandledMessageModel.objects.all()
    pagination_class = LimitOffsetPagination
    lookup_field = "type_id"

    def get(self, request, *args, **kwargs):
        track_request(
            request, view="UnhandledMessageView", variables=dict(method="get")
        )
        return super().get(request, *args, **kwargs)


@method_decorator(
    name="patch", decorator=swagger_auto_schema(tags=["v1", "v2"])
)
class HandleMessageView(GenericAPIView):  # LoggingMixin,
    __doc__ = make_swagger_doc("""
    Just send a PATCH request to the endpoint with message_id as a query
    parameter.
    """)

    def patch(self, request, message_id, *_, **__):
        track_request(
            request, view="HandleMessageView", variables=dict(method="patch")
        )
        resp = Response(status=status.HTTP_200_OK)
        try:
            MessageModel.objects.filter(id=message_id).update(processed=1)
        except Exception:  # pylint: disable=broad-except
            print_exc()
            resp = Response(status=status.HTTP_400_BAD_REQUEST)
        return resp


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v2"]))
class V2BotTypeView(ListAPIView):
    serializer_class = ser.BotTypeSerializer
    queryset = mod.BotTypeModel.objects.all()

    def get(self, request):
        track_request(
            request, view="BotTypeView", variables=dict(method="get")
        )
        return super().get(request)


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v2"]))
class V2BotHeaderView(ListAPIView):
    serializer_class = ser.BotHeaderSerializer
    queryset = mod.BotAuthHeaderModel.objects.all()

    def get(self, request):
        track_request(
            request, view="BotHeaderView", variables=dict(method="get")
        )
        return super().get(request)


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v2"]))
class V2ApplicationView(ListAPIView):
    serializer_class = ser.ApplicationSerializer
    queryset = mod.ApplicationModel.objects.all()

    def get(self, request):
        track_request(
            request, view="V2ApplicationView", variables=dict(method="get")
        )
        return super().get(request)


@method_decorator(name="get", decorator=swagger_auto_schema(tags=["v2"]))
class Status(GenericAPIView):
    def get(self, *_):
        test_models = {
            item: getattr(mod, item) for item in dir(mod)
            if isinstance(getattr(mod, item), django_models.base.ModelBase)
        }
        result = {}
        for name, tmod in test_models.items():
            result[name] = tmod.objects.count()
        return Response(data=result)
