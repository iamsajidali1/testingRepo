""" api ser """
from rest_framework import serializers as ser

class RAGenericInput(ser.Serializer):
    """ validate basic input being JSON and having params + devices"""
    params = ser.ListField(child=ser.DictField(child=ser.JSONField()))
    devices = ser.ListField(child=ser.DictField(child=ser.CharField()))
    def create(self, _):
        """create main data"""
        return self

    def update(self, instance, validated_data):
        """update main data"""
        return self

class MdsSerializer(ser.Serializer):
    """ validate input for OLD MDS model """
    vco_url = ser.CharField()
    vco_username = ser.CharField()
    vco_password = ser.CharField()
    emails = ser.ListField(
        child=ser.CharField(),
        required=False, default=None
    )
    def create(self, _):
        """create main data"""
        return self

    def update(self, instance, validated_data):
        """update main data"""
        return self