"""Defining serializer for template types and generatedconfig"""
# todo: move "in"/"not in" checks into dedicated functions
# todo: add spaces between condition blocks - otherwise harder to read

import re
import logging

from rest_framework import serializers
from .models import Template, GeneratedConfig

REGEX_VALIDATE_STRING = r'[a-zA-Z0-9_\-\.]*$'
REGEX_VALIDATE_UUID = (
    r'^([0-9a-fA-F]){8}-([0-9a-fA-F])'
    r'{4}-([0-9a-fA-F]){4}-([0-9a-fA-F])'
    r'{4}-([0-9a-fA-F]){12}$'
)
REGEX_VALIDATE_CUSTOMER_SERVICE = r'^.{1,30}$'

_logger = logging.getLogger(__name__)


class TemplateSerializer(serializers.ModelSerializer):
    """Define template serializer"""

    class Meta:
        """Define meta class for template serializer"""
        model = Template
        fields = (
            'id', 'name', 'contractid', 'path', 'body', 'services',
            'version', 'deviceModel', 'dateCreated',
            'templateType', 'vendorType'
        )
        read_only_fields = ('dateCreated', 'path',)

    def create(self, validated_data):
        """create template object"""
        return Template.objects.create(**validated_data)

    @staticmethod
    def validate_name(value):
        """validate name"""
        pattern = re.compile(REGEX_VALIDATE_STRING)
        if pattern.match(value) is not None:
            return value
        raise serializers.ValidationError("Incorrect Template name")

    @staticmethod
    def validate_services(value):
        """validate service"""
        pattern = re.compile(REGEX_VALIDATE_STRING)
        if pattern.match(value) is not None:
            return value
        raise serializers.ValidationError("Incorrect service")

    @staticmethod
    # pylint: disable=C0103
    def validate_templateType(value):
        """validate template type"""
        pattern = re.compile(REGEX_VALIDATE_STRING)
        if pattern.match(value) is not None:
            return value
        raise serializers.ValidationError("Incorrect template type")


class GeneratedConfigSerializer(serializers.ModelSerializer):
    """Define generated config serializer"""

    class Meta:
        """Define meta class for generated config serializer"""
        model = GeneratedConfig
        fields = (
            'id', 'templatebody', 'generatedconfig',
            'dateCreated', 'inputdata', 'templateid'
        )
        read_only_fields = ('dateCreated',)

    def create(self, validated_data):
        """create generated config object"""
        return GeneratedConfig.objects.create(**validated_data)


class CArcheCreateSerializer(serializers.Serializer):
    """Define carche serializer"""
    globals = serializers.JSONField()
    main_data = serializers.JSONField()

    def validate_globals(self, value):
        """
        Check if template exists
        split input into name & version
        """
        if 'templatefile' not in value:
            raise serializers.ValidationError("No templatename provided")

        initial_main_data = self.initial_data['main_data']
        # if contract id is provided but not service
        if (
                'contractid' in initial_main_data
                and 'version' in initial_main_data
                and 'services' not in initial_main_data
                and 'id' in initial_main_data
                and 'templateType' in initial_main_data
        ):
            pathoftemplate = initial_main_data['contractid']
            template = Template.objects.filter(
                name=value['templatefile'],
                version=initial_main_data['version'],
                contractid=initial_main_data['contractid'],
                id=initial_main_data['id'],
                templateType=initial_main_data['templateType']
            )
        # if service is provided but not contract id
        if (
                'services' in initial_main_data
                and 'version' in initial_main_data
                and 'contractid' not in initial_main_data
                and 'id' in initial_main_data
                and 'templateType' in initial_main_data
        ):
            pathoftemplate = 'services/' + initial_main_data['services']
            template = Template.objects.filter(
                name=value['templatefile'],
                version=initial_main_data['version'],
                services=initial_main_data['services'],
                id=initial_main_data['id'],
                templateType=initial_main_data['templateType']
            )
        # if contractid and also service is provided
        # if the contract id is the path for the templates is always the same
        if (
                'services' in initial_main_data
                and 'version' in initial_main_data
                and 'contractid' in initial_main_data
                and 'id' in initial_main_data
                and 'templateType' in initial_main_data
        ):
            pathoftemplate = initial_main_data['contractid']
            template = Template.objects.filter(
                name=value['templatefile'],
                version=initial_main_data['version'],
                services=initial_main_data['services'],
                contractid=initial_main_data['contractid'],
                id=initial_main_data['id'],
                templateType=initial_main_data['templateType']
            )
        if not template:
            raise serializers.ValidationError("No such Template exists")

        value['tempfile'] = 'Temp/' + initial_main_data['uuid']
        value['outputpath'] = 'Configs/'
        value['filenamefield'] = 'uuid'
        value['outputext'] = '.conf'
        value['templatepath'] = 'Templates/' + pathoftemplate + '/'
        value['templatefile'] = value['templatepath'] + value['templatefile']
        return value

    @staticmethod
    def validate_main_data(value):
        """validate main data"""
        uuid = re.compile(REGEX_VALIDATE_UUID)
        contractid = re.compile(REGEX_VALIDATE_CUSTOMER_SERVICE)
        services = re.compile(REGEX_VALIDATE_CUSTOMER_SERVICE)
        # Check if each mandatory fields are defined
        if 'contractid' not in value:
            if 'services' not in value:
                raise serializers.ValidationError(
                    "No contractid/services provided"
                )
        if 'contractid' in value:
            if contractid.match(value['contractid']) is None:
                raise serializers.ValidationError(
                    "Incorrect contractid"
                )
        if 'services' in value:
            if services.match(value['services']) is None:
                raise serializers.ValidationError(
                    "Incorrect services"
                )
        # validation if both service and contract id is provided
        if 'contractid' in value and 'services' in value:
            if (
                    services.match(value['services']) is None
                    and contractid.match(value['contractid']) is None
            ):
                raise serializers.ValidationError(
                    "Incorrect contractid and services"
                )
        if 'uuid' not in value:
            raise serializers.ValidationError("No UUID provided")
        if 'uuid' in value:
            if uuid.match(value['uuid']) is None:
                raise serializers.ValidationError("Incorrect UUID")
        if 'id' not in value:
            raise serializers.ValidationError(
                "Template id was not provided"
            )
        if 'templateType' not in value:
            raise serializers.ValidationError(
                "Template type was not provided"
            )
        if 'outputtofile' not in value:
            value['outputtofile'] = 'no'
        if 'windowsformat' not in value:
            value['windowsformat'] = 'no'
        return value

    def create(self, _):
        """create main data"""
        return self

    def update(self, _):
        """update main data"""
        return self


class JinjaCreateSerializer(serializers.Serializer):
    """Define jinja serializer"""
    globals = serializers.JSONField()
    main_data = serializers.JSONField()

    def validate_globals(self, value):
        """ Check if template exists split input into name & version """
        if 'templatefile' not in value:
            raise serializers.ValidationError("No templatename provided")

        initial_main_data = self.initial_data['main_data']
        # if contract id is provided but not service
        if (
                'contractid' in initial_main_data
                and 'version' in initial_main_data
                and 'services' not in initial_main_data
                and 'id' in initial_main_data
                and 'templateType' in initial_main_data
        ):
            template = Template.objects.filter(
                name=value['templatefile'],
                version=initial_main_data['version'],
                contractid=initial_main_data['contractid'],
                id=initial_main_data['id'],
                templateType=initial_main_data['templateType']
            )

        # if service is provided but not contract id
        if (
                'services' in initial_main_data
                and 'version' in initial_main_data
                and 'contractid' not in initial_main_data
                and 'id' in initial_main_data
                and 'templateType' in initial_main_data
        ):
            template = Template.objects.filter(
                name=value['templatefile'],
                version=initial_main_data['version'],
                services=initial_main_data['services'],
                id=initial_main_data['id'],
                templateType=initial_main_data['templateType']
            )

        # if contractid and also service is provided
        # if the contract id is the path for the templates is always the same
        if (
                'services' in initial_main_data
                and 'version' in initial_main_data
                and 'contractid' in initial_main_data
                and 'id' in initial_main_data
                and 'templateType' in initial_main_data
        ):
            template = Template.objects.filter(
                name=value['templatefile'],
                version=initial_main_data['version'],
                services=initial_main_data['services'],
                contractid=initial_main_data['contractid'],
                id=initial_main_data['id'],
                templateType=initial_main_data['templateType']
            )

        if not template:
            raise serializers.ValidationError(
                "No such Template exists"
            )

        value['templatebody'] = template[0].body
        value['templateid'] = template[0].id
        return value

    @staticmethod
    def validate_main_data(value):
        """validate main data"""
        uuid = re.compile(REGEX_VALIDATE_UUID)
        contractid = re.compile(REGEX_VALIDATE_CUSTOMER_SERVICE)
        services = re.compile(REGEX_VALIDATE_CUSTOMER_SERVICE)
        # Check if each mandatory fields are defined
        if 'contractid' not in value:
            if 'services' not in value:
                raise serializers.ValidationError(
                    "No contractid/services provided"
                )
        if 'contractid' in value:
            if contractid.match(value['contractid']) is None:
                raise serializers.ValidationError(
                    "Incorrect contractid"
                )
        if 'services' in value:
            if services.match(value['services']) is None:
                raise serializers.ValidationError(
                    "Incorrect services"
                )
        # validation if both service and contract id is provided
        if 'contractid' in value and 'services' in value:
            if (
                    services.match(value['services']) is None
                    and contractid.match(value['contractid']) is None
            ):
                raise serializers.ValidationError(
                    "Incorrect contractid and services "
                )

        if 'uuid' not in value:
            raise serializers.ValidationError("No UUID provided")

        if uuid.match(value['uuid']) is None:
            raise serializers.ValidationError("Incorrect UUID")

        if 'id' not in value:
            raise serializers.ValidationError("Template id was not provided")

        if 'templateType' not in value:
            raise serializers.ValidationError(
                "Template type was not provided"
            )

        return value

    def create(self, _):
        """create main data"""
        return self

    def update(self, _):
        """update main data"""
        return self
