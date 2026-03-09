from django.db import models
from django.contrib.auth.models import User as UserModel
from rest_framework.authtoken.models import Token as TokenModel


class ApplicationModel(models.Model):
    id = models.AutoField(primary_key=True)
    app_name = models.CharField(max_length=200, unique=True)
    email = models.CharField(max_length=200)
    backup_email = models.CharField(max_length=200)
    reply_to_email = models.CharField(max_length=200, blank=True)
    from_email = models.CharField(max_length=200, blank=True)
    token = models.ForeignKey(
        TokenModel,
        db_column="token_id",
        on_delete=models.CASCADE
    )

    class Meta:
        managed = True
        db_table = "applications"


class MessageTypeModel(models.Model):
    name = models.CharField(max_length=50, unique=True)
    handle = models.BooleanField(default=1)
    description = models.TextField()

    class Meta:
        managed = True
        db_table = "message_type"


class MessageModel(models.Model):
    id = models.AutoField(primary_key=True)
    app = models.ForeignKey(
        ApplicationModel,
        db_column="app_id",
        on_delete=models.CASCADE
    )
    type = models.ForeignKey(
        MessageTypeModel, on_delete=models.CASCADE, default=1
    )
    body = models.TextField()
    to = models.TextField()
    reply_to = models.TextField(default="")
    bcc = models.TextField(default="[]")
    subject = models.CharField(max_length=100, default="")
    sender = models.CharField(max_length=255, blank=True)
    notify_delivered = models.BooleanField(default=False)
    notify_read = models.BooleanField(default=False)
    time = models.DateTimeField(null=True)
    processed = models.BooleanField(default=False)
    event_uid = models.CharField(max_length=128, blank=True)

    class Meta:
        managed = True
        db_table = "messages"


class EventTypeModel(models.Model):
    name = models.CharField(max_length=50, unique=True)
    handle = models.BooleanField(default=1)
    description = models.TextField()

    def __str__(self):
        return self.name

    class Meta:
        managed = True
        db_table = "event_type"


class EventModel(models.Model):
    id = models.AutoField(primary_key=True)
    type = models.ForeignKey(EventTypeModel, on_delete=models.CASCADE)
    app = models.ForeignKey(
        ApplicationModel, db_column="app_id", on_delete=models.CASCADE
    )
    uid = models.CharField(
        max_length=128, null=True, blank=True, unique=True
    )
    name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True, default="")
    begin = models.TextField()
    end = models.TextField()
    timezone = models.CharField(max_length=50)
    sequence = models.IntegerField(default=0)
    cancelled = models.BooleanField(default=False)
    rescheduled = models.BooleanField(default=False)
    processed = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    class Meta:
        managed = True
        db_table = "events"


class UnhandledMessageModel(models.Model):
    id = models.AutoField(primary_key=True)
    app = models.ForeignKey(
        ApplicationModel,
        db_column="app_id",
        on_delete=models.CASCADE
    )
    type = models.ForeignKey(
        MessageTypeModel, on_delete=models.CASCADE, default=1
    )
    body = models.TextField()
    to = models.TextField()
    reply_to = models.TextField(default="")
    bcc = models.TextField(default="[]")
    subject = models.CharField(max_length=100, default="")
    sender = models.CharField(max_length=255)
    time = models.DateTimeField(null=True)
    processed = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = "unhandled_messages"


class AttachmentModel(models.Model):
    name = models.TextField()
    binary = models.TextField()
    message = models.ForeignKey(MessageModel, on_delete=models.CASCADE)

    class Meta:
        managed = True
        db_table = "attachments"


class SubscriptionTypeModel(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField()

    class Meta:
        managed = True
        db_table = "subscription_type"


class SubscriberModel(models.Model):
    user = models.ForeignKey(UserModel, on_delete=models.CASCADE)
    app = models.ForeignKey(
        ApplicationModel, on_delete=models.CASCADE
    )
    type = models.ForeignKey(SubscriptionTypeModel, on_delete=models.CASCADE)

    class Meta:
        managed = True
        db_table = "subscribers"
        unique_together = ["user", "app", "type"]


class AttDomainsModel(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField()

    class Meta:
        managed = True
        db_table = "att_domains"


class BotTypeModel(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField()

    class Meta:
        managed = True
        db_table = "bot_type"


class BotAuthHeaderModel(models.Model):
    type = models.ForeignKey(BotTypeModel, on_delete=models.CASCADE)
    header = models.CharField(max_length=50)
    description = models.TextField()

    class Meta:
        managed = True
        db_table = "bot_auth_header"
        unique_together = ["type", "header"]
