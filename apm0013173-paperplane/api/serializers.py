from uuid import uuid4
from rest_framework import serializers
from django.contrib.auth.models import User as UserModel
from django.db.models.fields.reverse_related import ForeignObjectRel
from api.models import (
    ApplicationModel, MessageModel, SubscriptionTypeModel, SubscriberModel,
    MessageTypeModel, UnhandledMessageModel
)
from api import models as mod


class NamedPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    redacted_fields = ["password", "token"]

    def display_value(self, instance):
        fields = [
            # pylint: disable=protected-access
            field.name for field in instance._meta.get_fields(
                include_parents=False,
                include_hidden=False
            )
            if not isinstance(field, ForeignObjectRel)
        ]

        what = instance.__class__.__name__
        text_fields = []
        for field in fields:
            if field in self.redacted_fields:
                continue
            fvalue = getattr(instance, field, '')
            text_fields.append(f'{field}: {fvalue}')

        text_fields = ', '.join(text_fields)
        return f'{what} ({text_fields})'


class V2RegistrationSerializer(serializers.ModelSerializer):
    token = serializers.CharField(read_only=True)
    from_email = serializers.CharField(required=False)
    reply_to_email = serializers.CharField(required=False)

    class Meta:
        model = ApplicationModel
        fields = [
            "id", "app_name", "email", "backup_email",
            "from_email", "reply_to_email", "token"
        ]


class MessageSerializer(serializers.ModelSerializer):
    type = serializers.CharField(required=True)
    body = serializers.CharField(required=True)
    to = serializers.ListField(
        child=serializers.CharField(), required=True
    )
    reply_to = serializers.CharField(required=False)
    bcc = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    subject = serializers.CharField(max_length=100, required=False)
    sender = serializers.CharField(max_length=255, required=True)
    attachments = serializers.DictField(
        child=serializers.CharField(), required=False
    )
    time = serializers.DateTimeField(
        required=False, allow_null=True, default=None
    )

    class Meta:
        model = MessageModel
        fields = [
            "type", "body", "to", "reply_to",
            "bcc", "subject", "sender", "time", "attachments"
        ]


class V2MessageSerializer(serializers.ModelSerializer):
    type = serializers.CharField(required=True)
    body = serializers.CharField(required=True)
    to = serializers.ListField(
        child=serializers.CharField(allow_null=False, allow_blank=False),
        required=True, allow_null=False
    )
    reply_to = serializers.CharField(required=False)
    bcc = serializers.ListField(
        child=serializers.CharField(allow_null=False, allow_blank=False),
        required=False, allow_null=False
    )
    subject = serializers.CharField(max_length=100, required=False)
    notify_delivered = serializers.BooleanField(default=False, required=False)
    notify_read = serializers.BooleanField(default=False, required=False)
    attachments = serializers.DictField(
        child=serializers.CharField(), required=False
    )
    time = serializers.DateTimeField(
        required=False, allow_null=True, default=None
    )
    event_uid = serializers.CharField(required=False)

    class Meta:
        model = MessageModel
        fields = [
            "type", "body", "to", "reply_to",
            "bcc", "subject", "time", "attachments",
            "notify_delivered", "notify_read", "event_uid"
        ]


class V2EventSerializer(serializers.ModelSerializer):
    type = serializers.CharField(required=True)
    app = NamedPrimaryKeyRelatedField(read_only=True)
    uid = serializers.CharField(required=False, default="", initial="")
    description = serializers.CharField(
        required=False, default="", initial="Content of the event."
    )
    begin = serializers.CharField(
        required=True, initial="2000-01-01 00:00:00.000000"
    )
    end = serializers.CharField(
        required=True, initial="2000-01-01 00:00:01.000000"
    )
    timezone = serializers.CharField(required=True, initial="GMT+2")
    cancelled = serializers.BooleanField(default=False, required=False)
    rescheduled = serializers.BooleanField(default=False, required=False)

    def validate(self, data):
        if data.get('uid') in ("", "string", None):
            # each event has to have a unique ID
            data['uid'] = str(uuid4())

        return super().validate(data)

    class Meta:
        model = mod.EventModel
        fields = [
            "type", "app", "uid", "name", "description",
            "begin", "end", "timezone", "cancelled", "rescheduled"
        ]


class SubscriptionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTypeModel
        fields = "__all__"


class SubscriberSerializer(serializers.ModelSerializer):
    app = NamedPrimaryKeyRelatedField(
        queryset=ApplicationModel.objects.all()
    )
    type = NamedPrimaryKeyRelatedField(
        queryset=SubscriptionTypeModel.objects.all()
    )

    class Meta:
        model = SubscriberModel
        fields = ["app", "type", "user"]


class CustomUserSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField()

    class Meta:
        model = UserModel
        fields = ["username"]


class NewSubscriberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=6, help_text="attuid")
    email = serializers.CharField(max_length=255, help_text="attuid@att.com")

    class Meta:
        model = UserModel
        fields = ["username", "email"]


class TimeSerializer(serializers.Serializer):
    isotime = serializers.DateTimeField()


class MessageTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTypeModel
        fields = "__all__"


class EventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = mod.EventTypeModel
        fields = "__all__"


class UnhandledMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnhandledMessageModel
        fields = "__all__"


class BotTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = mod.BotTypeModel
        fields = "__all__"


class BotHeaderSerializer(serializers.ModelSerializer):
    class Meta:
        model = mod.BotAuthHeaderModel
        depth = 1
        fields = "__all__"


class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = mod.ApplicationModel
        fields = ["id", "app_name"]
