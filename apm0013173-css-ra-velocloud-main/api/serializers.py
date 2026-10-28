""" api ser """
from rest_framework import serializers as ser


class RAGenericInput(ser.Serializer):
    """ validate basic input being JSON and having params + devices"""
    params = ser.ListField(child=ser.DictField(child=ser.JSONField()))
    devices = ser.ListField(child=ser.DictField(child=ser.CharField()))
    output = ser.CharField(required=False, allow_blank=True, allow_null=True)
    
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


class SingleEdgeProvisioning(ser.Serializer):
    """ validate input as JSON """
    routedInterfaces = ser.ListField()
    links = ser.ListField()
    loopbackInterfaces = ser.DictField(required=False, default=None)
    old_edge = ser.CharField(required=False, allow_null=True)
    new_interface = ser.CharField(required=False, allow_null=True)
    old_interface = ser.CharField(required=False, allow_null=True)
    description = ser.CharField()
    site = ser.DictField()
    bgp = ser.DictField()
    def create(self, _):
        """create main data"""
        return self

    def update(self, instance, validated_data):
        """update main data"""
        return self


class HWStatsSerializer(ser.Serializer):
    """Validate input for HWStats endpoint."""
    startDate = ser.DateField(input_formats=["%Y-%m-%d"])
    endDate = ser.DateField(input_formats=["%Y-%m-%d"])
    customerName = ser.CharField()
    output = ser.ChoiceField(choices=["json", "xlsx"], required=False, default="xlsx")

    def validate(self, attrs):
        """Ensure endDate is not before startDate."""
        if attrs["endDate"] < attrs["startDate"]:
            raise ser.ValidationError({"endDate": "endDate must be greater than or equal to startDate."})
        return attrs

    def create(self, _):
        """create main data"""
        return self

    def update(self, instance, validated_data):
        """update main data"""
        return self
