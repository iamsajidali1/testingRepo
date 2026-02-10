""" api ser """
from rest_framework import serializers as ser

def address_string_removal(data: str):
    """ remove incorrect data """
    data = data.replace('+', '')
    data = data.replace('.', '')
    data = data.replace(',', '')
    data = data.replace(';', '')
    data = data.replace('/', ' ')
    data = data.replace('-', ' ')
    return data

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

class Address(ser.Serializer):
    """ validate input as JSON """
    state = ser.CharField()
    postal_code = ser.CharField()
    city = ser.CharField()
    street_address = ser.CharField()
    @staticmethod
    def validate_state(value):
        """remove incorrect data """
        return address_string_removal(value)
    @staticmethod
    def validate_postal_code(value):
        """remove incorrect data """
        return address_string_removal(value)
    @staticmethod
    def validate_city(value):
        """remove incorrect data """
        return address_string_removal(value)
    @staticmethod
    def validate_street_address(value):
        """remove incorrect data """
        return address_string_removal(value)
    def create(self, _):
        """create main data"""
        return self
    def update(self, instance, validated_data):
        """update main data"""
        return self

class StringListField(ser.Serializer):
    """ validator on list of strings """
    input_data = ser.ListField(child=ser.CharField())
    def create(self, _):
        """create main data"""
        return self
    def update(self, instance, validated_data):
        """update main data"""
        return self
    
class ListDictField(ser.Serializer):
    """ 
    Validator for a dictionary where each key maps to a list of values.
    Example expected format:
    {
        "key1": ["value1", "value2"],
        "key2": ["value3"]
    }
    """
    input_data = ser.DictField()
    def create(self, _):
        """create main data"""
        return self
    def update(self, instance, validated_data):
        """update main data"""
        return self

class AddressListField(ser.Serializer):
    """ validator on list of strings """
    input_data = ser.ListField(child=Address())
    def create(self, _):
        """create main data"""
        return self
    def update(self, instance, validated_data):
        """update main data"""
        return self
