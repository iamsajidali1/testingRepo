from rest_framework import serializers
from api import models


class KdbxFiles(serializers.ModelSerializer):
    file = serializers.CharField(required=False)

    class Meta:
        model = models.KdbxFiles
        fields = ["id", "user", "name", "file"]


class CredentialsInput(serializers.Serializer):
    kdbx_name = serializers.CharField()
    password = serializers.CharField(required=False)
    paths = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    tags = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    url = serializers.CharField(required=False, default=None)

    def validate(self, data):
        if "paths" not in data and "tags" not in data:
            raise serializers.ValidationError(
                "One of 'paths' or 'tags' has to be specified."
            )

        if "paths" in data and "tags" in data:
            raise serializers.ValidationError(
                "'paths' and 'tags' can't be used together"
            )

        if "kdbx_name" not in data:
            raise serializers.ValidationError("Missing 'kdbx_name'.")

        return data


class CredentialsOutput(serializers.Serializer):
    title = serializers.CharField()
    username = serializers.CharField()
    password = serializers.CharField()
    url = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField())
    notes = serializers.CharField()
    attachments = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField())
    )


class TokenResync(serializers.Serializer):
    username = serializers.CharField(allow_blank=True)
    password = serializers.CharField(allow_blank=True)
    token = serializers.ReadOnlyField()
