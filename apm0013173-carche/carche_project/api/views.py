"""Define each method for template manipulation"""
import os
import logging
import json
import subprocess
import base64
import re
import traceback
from wsgiref.util import FileWrapper
import jsonpath_ng as jp
import netaddr

from jinja2 import Environment, meta
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser
from api.models import Template
from rest_framework_tracking.mixins import LoggingMixin
from django.http import HttpResponse
from jinja2schema import infer, to_json_schema
from jinja2schema.exceptions import InferException
from jinja2schema.exceptions import InvalidExpression
from .serializers import TemplateSerializer, CArcheCreateSerializer
from .serializers import JinjaCreateSerializer, GeneratedConfigSerializer
from .templatetypes import TemplateTypes
from .netaddrfunction import NetaddrFunctions
from .traversenodes import jinja_template_variables
from .a2jtranslator import translator


_logger = logging.getLogger(__name__)
"""_logger.error(request.data)"""


class GenerateConfig(APIView, LoggingMixin):
    """Class generated config"""
    parser_classes = (JSONParser,)

    @staticmethod
    def post(request):
        """ validate json integrity """
        message = 'Failed template type id is not defined correctly'
        requestdata = request.data
        if 'templateType' in requestdata['main_data']:
            templatetype = requestdata['main_data']['templateType']
            if templatetype == TemplateTypes.carche.value:
                serializer = CArcheCreateSerializer(data=requestdata)
                if serializer.is_valid():
                    output = generate_cofig_via_arche(serializer, requestdata)
                else:
                    output = Response(
                        serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )
            elif templatetype == TemplateTypes.jinja.value:
                serializer = JinjaCreateSerializer(data=requestdata)
                if serializer.is_valid():
                    output = generate_config_via_jinja(
                        serializer, requestdata
                    )
                else:
                    output = Response(
                        serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )
            else:

                output = Response(
                    data=message, status=status.HTTP_400_BAD_REQUEST
                )
            return output
        return Response(data=message, status=status.HTTP_400_BAD_REQUEST)


def generate_cofig_via_arche(serializer, request_data):
    """
    Generate the config for arche template save generated template in the disk.

    Parameters:
    serializer  (CArcheCreateSerializer):   The instance of
                                            the CArcheCreateSerializer object
    request_data (json):    The instance of Json object (request input data)

    Returns:
    response    (Response):   if error occurs the instance
                            of response is returned or file if outputtofile
                            is set to no, than the file is returned
    response    (HttpResponse): if the outputtofile is set to yes,
                                return the config as plain text
    """
    # save JSON on disk with name UUID
    path = "/code/_cArche/Input/"
    maindata = serializer.validated_data['main_data']
    if not os.path.exists(path):
        os.makedirs(path)
    filename = path + maindata['uuid'] + '.json'
    if os.path.exists(filename):
        return Response(
            {'error': 'such request exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    with open(filename, "a+") as fileinstance:
        fileinstance.write(
            str(
                json.dumps(
                    request_data, sort_keys=True,
                    indent=4, separators=(',', ': ')
                )
            )
        )
    # execute Arche
    file = 'Input/' + maindata['uuid'] + '.json'
    # result = \
    try:
        subprocess.check_output(
            ['perl', 'Arche3.24.pl', file],
            cwd="/code/_cArche/", stderr=subprocess.STDOUT,
            universal_newlines=True
        ).strip()
    except subprocess.CalledProcessError as error:
        return Response(error.output, status=status.HTTP_400_BAD_REQUEST)
    # return script as base64
    if maindata['windowsformat'] == 'yes':
        # change endline characters
        os.system(
            "sed -i 's/$/\r/' /code/_cArche/Configs/"
            + maindata['uuid'] + '.conf'
        )
        config_file = open(
            "/code/_cArche/Configs/" + maindata['uuid']
            + '.conf', 'r', newline="\r\n"
        )
    else:
        config_file = open(
            "/code/_cArche/Configs/" + maindata['uuid']
            + '.conf', 'rb'
        )
    if maindata['outputtofile'] == 'yes':
        response = HttpResponse(
            FileWrapper(config_file), content_type='text/plain'
        )
        conf = maindata['uuid'] + '.conf' + '"'
        response['Content-Disposition'] = 'attachment; filename="' + conf
    else:
        config_base64 = base64.b64encode(config_file.read())
        response = Response(
            {'status': 'SUCCESS', 'config_file': config_base64}
        )
    return response


def generate_config_via_jinja(serializer, request_data):
    """
    Generate the config for jinja template save
    generated template in the database

    Parameters:
    serializer  (JinjaCreateSerializer):   The instance of
                                            the JinjaCreateSerializer object
    request_data (json):    The instance of Json object (request input data)

    Returns:
    response    (Response):   if error occurs the
                             instance of response is returned
    response    (HttpResponse): if no error the config
                                is returned as plain text
    """
    env = Environment()
    gldata = serializer.validated_data['globals']
    maindata = serializer.validated_data['main_data']
    rtemplate = env.from_string(json.dumps(
        gldata['templatebody'])
    )

    variables = get_variable_jinga_internal(json.dumps(
        gldata['templatebody'])
    )
    netaddrfunctions = NetaddrFunctions.list()

    for netaddrf in netaddrfunctions:
        env.globals[netaddrf] = getattr(netaddr, netaddrf, None)
        if netaddrf in variables:
            variables.remove(netaddrf)

    result = {}
    for var in variables:
        path = jp.parse('$..' + var + '')
        inputdata = path.find(request_data)
        if inputdata and inputdata[0].value:
            result[var] = inputdata[0].value
        else:
            message = 'Input data not provided correctly'
            # return Response(
            #     data=message,
            #     status=status.HTTP_400_BAD_REQUEST
            # )

    rtemplatefinal = rtemplate.render(result)
    generatedconfigdata = {}
    generatedconfigdata['templatebody'] = gldata['templatebody']
    generatedconfigdata['generatedconfig'] = rtemplatefinal
    generatedconfigdata['inputdata'] = json.dumps(request_data)
    generatedconfigdata['templateid'] = gldata['templateid']
    genconfserializer = GeneratedConfigSerializer(data=generatedconfigdata)

    if genconfserializer.is_valid():
        genconfserializer.save()
        response = HttpResponse(
            json.loads(rtemplatefinal),
            content_type='text/plain'
        )
        conf = maindata['uuid'] + '.conf' + '"'
        response['Content-Disposition'] = 'attachment; filename="' + conf
    else:
        response = Response(
            genconfserializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    return response


class ListTemplates(APIView, LoggingMixin):
    """Define the list template method"""

    @staticmethod
    def post(request):
        """Define the list template post method"""
        template = []
        requestdata = request.data
        if 'contractid' in requestdata and 'services' in requestdata:
            contractid = requestdata['contractid']
            services = requestdata['services']
            template = Template.objects.filter(
                contractid=contractid, services=services
            ).values(
                'id', 'name', 'contractid', 'services', 'body',
                'deviceModel', 'version', 'dateCreated',
                'templateType', 'vendorType'
            )
        elif 'services' in requestdata and 'contractid' not in requestdata:
            services = requestdata['services']
            # set contracit id to null not select only services
            template = Template.objects.filter(
                services=services, contractid=""
            ).values(
                'id', 'name', 'contractid', 'services', 'body',
                'deviceModel', 'version', 'dateCreated',
                'templateType', 'vendorType'
            )
        elif 'contractid' in requestdata and 'services' not in requestdata:
            contractid = requestdata['contractid']
            template = Template.objects.filter(
                contractid=contractid,
            ).values(
                'id', 'name', 'contractid', 'services', 'body',
                'deviceModel', 'version', 'dateCreated',
                'templateType', 'vendorType'
            )
        else:
            template = Template.objects.all(
            ).values(
                'id', 'name', 'contractid', 'services', 'body',
                'deviceModel', 'version', 'dateCreated',
                'templateType', 'vendorType'
            )
        return Response(template)


class BasicListTemplates(APIView, LoggingMixin):
    """Define the list template method with basic info"""
    @staticmethod
    def post(request):
        """Define the list template post method with basic info"""
        template = Template.objects.all(
            ).values(
                'id', 'name', 'contractid', 'services',
                'deviceModel', 'version', 'templateType',
                'vendorType'
            )
        return Response(template)


class UpdateTemplate(APIView, LoggingMixin):
    """Define update template class"""

    @staticmethod
    def post(request):
        """define post method for update template"""
        requestdata = request.data
        if 'version' in requestdata:
            version = requestdata['version']
        else:
            version = 1
        serializer = TemplateSerializer(data=requestdata)
        if serializer.is_valid() and 'templateType' in requestdata:
            templatetype = requestdata['templateType']
            if templatetype == TemplateTypes.carche.value:
                output = save_template_to_file_and_db(
                    serializer, requestdata, version
                )
            elif templatetype == TemplateTypes.jinja.value:
                output = save_template_only_to_db(
                    serializer, requestdata, version
                )
            else:
                message = 'Failed template type id is not defined correctly'
                output = Response(
                    data=message, status=status.HTTP_400_BAD_REQUEST
                )
            return output
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    @staticmethod
    def put(request):
        """define put method for update template"""
        requestdata = request.data
        if 'version' in requestdata:
            version = requestdata['version']
        else:
            version = 1
        if 'id' in requestdata:
            template = Template.objects.get(
                name=requestdata['name'],
                id=requestdata['id']
            )
        elif 'contractid' in requestdata:
            template = Template.objects.get(
                name=requestdata['name'],
                contractid=requestdata['contractid']
            )
        elif 'services' in requestdata:
            template = Template.objects.get(
                name=requestdata['name'],
                services=requestdata['services']
            )
        serializer = TemplateSerializer(template, data=requestdata)
        if serializer.is_valid() and 'templateType' in requestdata:
            templatetype = requestdata['templateType']
            if templatetype == TemplateTypes.carche.value:
                output = save_template_to_file_and_db(
                    serializer, requestdata, version
                )
            elif templatetype == TemplateTypes.jinja.value:
                output = save_template_only_to_db(
                    serializer, requestdata, version
                )
            else:
                message = 'Failed template type id is not defined correctly'
                output = Response(
                    data=message, status=status.HTTP_400_BAD_REQUEST
                )
            return output
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )


def save_template_to_file_and_db(serializer, request_data, version):
    """
    Save template to the database and also in to the file system

    Parameters:
    serializer  (TemplateSerializer):   The instance of
                                        the TemplateSerializer object
    request_data (json):    The instance of Json object (request input data)
    version:     (int):    if not provided in input data, default value is 1

    Returns:
    response    (Response):   if error occurs the instance
                             of response is returned,
                            or if no error serializer data
                            instance is returned (TemplateSerializer object)
    """
    # decode body from base64
    cleanbody = base64.b64decode(request_data['body']).decode('utf-8')
    # create file on disk
    if 'contractid' in request_data:
        contractidstr = str(request_data['contractid'])
        path = "/code/_cArche/Templates/" + contractidstr
    elif 'services' in request_data:
        servicestr = str(request_data['services'])
        path = "/code/_cArche/Templates/services/" + servicestr
    else:
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    if not os.path.exists(path):
        os.makedirs(path)
    filename = path + "/" + request_data['name']
    with open(filename, "wt", newline='\n') as fileinstance:
        for line in cleanbody:
            fileinstance.write(str(line).rstrip('\r'))
    serializer.validated_data['body'] = cleanbody
    # create file path
    serializer.save(version=version, path=filename)
    # success response
    return Response(serializer.data, status=status.HTTP_201_CREATED)


def save_template_only_to_db(serializer, request_data, version):
    """
    Save template only to the database

    Parameters:
    serializer  (TemplateSerializer):   The instance
                                        of the TemplateSerializer object
    request_data (Json):    The instance of Json object (request input data)
    version:    (int):  if not provided in input data, default value is 1

    Returns:
    response    (Response):   if error occurs the
                             instance of response is returned,
                              or if no error serializer data instance
                              is returned (TemplateSerializer object)
    """
    cleanbody = base64.b64decode(request_data['body']).decode('utf-8')
    if 'contractid' in request_data or 'services' in request_data:
        # set path tu empty, template is not saved in disk
        filepath = ""
    else:
        message = 'Failed contract id or service is not provided'
        return Response(
            data=message,
            status=status.HTTP_400_BAD_REQUEST
        )
    serializer.validated_data['body'] = cleanbody
    serializer.save(version=version, path=filepath)
    # success response
    return Response(serializer.data, status=status.HTTP_201_CREATED)


class GetTemplate(APIView, LoggingMixin):
    """Define get template method"""

    @staticmethod
    def post(request):
        """define post method for get template"""
        fetch_key = request.data.get

        contractid = fetch_key('contractid')
        name = fetch_key('name')
        services = fetch_key('services')

        if contractid and name:
            template = Template.objects.filter(
                contractid=contractid, name=name
            ).values(
                'id', 'name', 'contractid', 'services',
                'body', 'deviceModel', 'version',
                'dateCreated', 'templateType', 'vendorType'
            )
            response = Response(template)
        elif services and name:
            template = Template.objects.filter(
                services=services, name=name,
            ).values(
                'id', 'name', 'contractid', 'services', 'body',
                'deviceModel', 'version', 'dateCreated',
                'templateType', 'vendorType'
            )
            response = Response(template)
        elif contractid:
            template = Template.objects.filter(
                contractid=contractid,
            ).values(
                'id', 'name', 'contractid', 'services', 'body',
                'deviceModel', 'version', 'dateCreated',
                'templateType', 'vendorType'
            )
            response = Response(template)
        else:
            response = Response(
                # todo: remove set() from here, use proper error message
                data={'Failed'}, status=status.HTTP_400_BAD_REQUEST
            )
        return response


class DeleteTemplate(APIView, LoggingMixin):
    """Define the delete template"""

    @staticmethod
    def post(request):
        """Define the delete template post method"""
        fetch_key = request.data.get

        contractid = fetch_key('contractid')
        name = fetch_key('name')
        services = fetch_key('services')
        identificator = fetch_key('id')

        if contractid and name:
            template = Template.objects.filter(
                contractid=contractid, name=name
            )
            if template.count():
                if os.path.exists(template[0].path):
                    os.remove(template[0].path)
                template.delete()
                return Response(
                    # todo: remove set() from here, use proper error message
                    data={'success'}, status=status.HTTP_200_OK
                )
            else:
                return Response(
                    # todo: remove set() from here, use proper error message
                    data={'Failed'}, status=status.HTTP_400_BAD_REQUEST
                )
        elif services and name:
            template = Template.objects.filter(
                services=services, name=name
            )
            if template.count():
                if os.path.exists(template[0].path):
                    os.remove(template[0].path)
                template.delete()
                return Response(
                    # todo: remove set() from here, use proper error message
                    data={'success'}, status=status.HTTP_200_OK
                )
            else:
                return Response(
                    # todo: remove set() from here, use proper error message
                    data={'Failed'}, status=status.HTTP_400_BAD_REQUEST
                )
        elif identificator:
            template = Template.objects.filter(id=identificator)
            if template.count():
                if os.path.exists(template[0].path):
                    os.remove(template[0].path)
                template.delete()
                return Response(
                    # todo: remove set() from here, use proper error message
                    data={'success'}, status=status.HTTP_200_OK
                )
            else:
                return Response(
                    # todo: remove set() from here, use proper error message
                    data={'Failed'}, status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                # todo: remove set() from here, use proper error message
                data={'Failed'}, status=status.HTTP_400_BAD_REQUEST
            )


class ListDirectory(APIView, LoggingMixin):
    """Define the list directory method"""

    @staticmethod
    def post(request):
        """define the post method list directory"""
        fetch_key = request.data.get

        contractid = fetch_key('contractid')
        services = fetch_key('services')

        if contractid:
            templates = Template.objects.filter(
                contractid=contractid
            ).values('name')
            response = Response(
                data=templates, status=status.HTTP_200_OK
            )
        elif services:
            templates = Template.objects.filter(
                services=services
            ).values('name')
            response = Response(
                data=templates, status=status.HTTP_200_OK
            )
        else:
            # todo: remove set() from here, use proper error message
            response = Response(
                data={'Failed'}, status=status.HTTP_400_BAD_REQUEST
            )
        return response


class GetVariables(APIView, LoggingMixin):
    """Define get variables method"""

    @staticmethod
    def post(request):
        """Define get variables post method"""
        fetch_key = request.data.get

        contractid = fetch_key('contractid')
        name = fetch_key('name')
        services = fetch_key('services')
        templatetype = fetch_key('templateType')
        identificator = fetch_key('id')

        template = []
        if contractid and name and templatetype:
            template = Template.objects.filter(
                name=name, contractid=contractid, templateType=templatetype
            )
        elif services and name and templatetype:
            template = Template.objects.filter(
                name=name, services=services, templateType=templatetype
            )
        elif identificator and templatetype:
            template = Template.objects.filter(
                id=identificator, templateType=templatetype
            )
        else:
            return Response(
                data='Failed unable to load template',
                status=status.HTTP_400_BAD_REQUEST
            )

        # check if template type is selected
        if templatetype == TemplateTypes.carche.value and len(template) > 0:
            output = get_variables_arche(template)
        elif templatetype == TemplateTypes.jinja.value and len(template) > 0:
            output = get_variables_jinja_template_ast(template)
        else:
            output = Response(
                data='Failed template type id is not defined correctly',
                status=status.HTTP_400_BAD_REQUEST
            )
        return output


def get_variables_arche(template):
    """
    Get variables for arche template

    Parameters:
    template  (Template):   The instance of the Template database model

    Returns:
    response    (Response):   return the list of found variable,
                            based on defined regex
    """
    regex = re.compile(r'(<[\d\D\s\S\w\W]{1,100}?>)')
    result = regex.findall(template[0].body)
    final_result = []
    for item in result:
        if item not in final_result:
            final_result.append(re.sub(r'[<>]{1,100}', '', item))
    _logger.error(final_result)
    return Response(data=final_result, status=status.HTTP_200_OK)


def get_variable_jinga_internal(body):
    """
    Get variables for jinja templates internal helper function,
    not return the list of properties if the variables
    is a list of object and has properties

    Parameters:
    body  (str):    The string value of
                    the template body (template definition)

    Returns:
    final_result    (list):   Returning the list of the
                            variables which template definition has
    """
    env = Environment()
    ast = env.parse(body)
    final_result = []
    variables = meta.find_undeclared_variables(ast)
    for item in variables:
        final_result.append(item)
    return final_result


def get_variables_dependecy_tree(template):
    """
    Get variables for jinja templates, expect if there is a
    list of object and object has properties it return
    all properties

    Parameters:
    template  (Template):   The instance of the Template database model

    Returns:
    response    (Response):   Returning the list of the
                            variables which template definition has,
                            or the error if exception occur
    """
    message = 'Failed unable to get all variable for jinja template'
    try:
        structure = infer(template[0].body)
    except InferException:
        why = 'Unable to resolve template variable structure'
        print(why)
        traceback.print_exc()
        return Response(
            data=f"{message}: {why}", status=status.HTTP_400_BAD_REQUEST
        )
    try:
        jinja_variables = to_json_schema(structure)
        variables = []
        final_variables = get_all_values(
            jinja_variables, variables, 'required')
        return Response(
            data=final_variables, status=status.HTTP_200_OK
        )
    except InvalidExpression:
        why = 'Encountered an invalid Jinja expression, check template syntax'
        print(why)
        traceback.print_exc()
        return Response(
            data=f"{message}: {why}", status=status.HTTP_400_BAD_REQUEST
        )


def get_variables_jinja_template_ast(template):
    """
    Get variables for jinja template, based on travernodes util.
    Take template and parse it to the AST structure and return variables
    based on node itmes from this structure.
    """
    finalvariables = jinja_template_variables(template[0].body)

    return Response(data=finalvariables, status=status.HTTP_200_OK)


def get_all_values(nested_dictionary, variables, condition):
    """
    In this function is implemented recursion to get all
    variables also from the list (based con required condition)

    Parameters:
    nested_dictionary  (Dict[]):   This dictionary contains
                                   nested dictionaries and lists
    variables   (List[]):   This is the list only to save the list
                            of found variables, used because of recursion
    condition   (str):  This str is contain the condition based
                        on matching this condition the values is added
                        to the list of the variables

    # Returns:
    #   variables    (list):   Returning the list of
                            the variables which template definition has
    """
    for key, value in nested_dictionary.items():
        if isinstance(value, dict):
            get_all_values(value, variables, condition)
        else:
            if key == condition:
                if isinstance(value, list):
                    variables += value
                else:
                    variables.append(value)

    return variables

class a2jTranslate(APIView, LoggingMixin):
    """Archie to Jinja Translator"""

    @staticmethod
    def post(request):
        requestdata = request.data
        maindata = requestdata['data']
        output = translator(maindata)
        response = Response(
            { "data" : output },
            status = status.HTTP_200_OK
        )
        return response