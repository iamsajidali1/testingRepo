""" general view module """
import sys
import logging
import base64
import json, os
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from azure.core.exceptions import HttpResponseError
from .az_file_mgmt import upload_blob, download_blob
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import generics, status
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from api.onetouch import getFtDataByHostname, pingDeviceByAddress, bootstrapDevice
from api import serializers
from api.client import ssh_client
from api.utils import cli_get_credentials, execute_edf_query, get_lon_lat, get_circuit_data, create_filename, execute_edf_query_with_concurrency,get_site_account_numbers,execute_oracle_sql_query
from api.docs import circuit_list, geodata_list, telenumber_ranges_list
from api.queries.edf import get_hub_sites_tele_ranges_query, get_remote_sites_tele_ranges_query, get_cnam_and_tn_query, get_ip_tollfree_tn_query, get_dialplans_by_customer_names_query
import re
from datetime import datetime
import oracledb
from api.constants import EDF_CONN

@extend_schema(
    methods=["GET"],
    tags=["EDF Test"],
    summary="Test connection to EDF DB",
    description="Test connection to the specified EDF Oracle database. Requires a 'connection' parameter in the URL."
)
class EDFTestConnection(APIView):
    permission_classes = []

    def get(self, request, **kwargs):
        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request.get_full_path(),
        )

        if "connection" not in kwargs:
            return Response({
                "status": "BadRequestError",
                "statusCode": status.HTTP_400_BAD_REQUEST,
                "message": "connection is mandatory, please pass as a parameter!"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        username = None
        password = None
        tns = None

        match kwargs["connection"].lower():
            case "edf-m11102":
                tns = EDF_CONN
                username = os.getenv("EDF_M11102_USERNAME")
                password = os.getenv("EDF_M11102_PASSWORD")
            case "edf-m33397":
                tns = EDF_CONN
                username = os.getenv("EDF_M33397_USERNAME")
                password = os.getenv("EDF_M33397_PASSWORD")
            case "edf-m28805":
                tns = EDF_CONN
                username = os.getenv("EDF_M28805_USERNAME")
                password = os.getenv("EDF_M28805_PASSWORD")
            case "edf-m97312":
                tns = EDF_CONN
                username = os.getenv("EDF_USERNAME")
                password = os.getenv("EDF_PASSWORD")
            case _:
                return Response({
                    "status": "BadRequestError",
                    "statusCode": status.HTTP_400_BAD_REQUEST,
                    "message": f"Unsupported connection: {kwargs['connection']}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        test_query = "SELECT USERNAME, ACCOUNT_STATUS, TO_CHAR(EXPIRY_DATE, 'YYYY-MM-DD') AS EXPIRY_DATE FROM USER_USERS"
        result = execute_oracle_sql_query(tns, username, password, test_query)
        if result["status"]:
            data = [dict(zip(result["cols"], row)) for row in result["rows"]]
            return Response({
                "status": "EDFConnectionSuccess",
                "statusCode": status.HTTP_200_OK,
                "message": "EDF DB connection test successful",
                "data": data
            }, status=status.HTTP_200_OK)
        else:
            logging.error("EDF DB connection test failed: %s - %s", result.get("errorCode"), result.get("errorMessage"))
            return Response({
                "status": "EDFConnectionError",
                "statusCode": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": f"EDF DB connection test failed: {result.get('errorMessage')}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(
    methods=["GET"],
    tags=["uCPE OneTouch"],
    summary="Retrieve device configuration XML from PHS",
    description=(
        "Get FT Data XML from PHS containing configs of multiple instances/devices within Flexware: "
        "JDM, JCP, and vSRX (if present). "
        "Requires a 'hostname' parameter in the URL. "
        "Returns configuration data for the specified device."
    ),
    parameters=[
        OpenApiParameter(
            name="hostname",
            type=str,
            location=OpenApiParameter.PATH,
            required=True,
            description="The hostname (serial number) of the device"
        )
    ],
    examples=[
        OpenApiExample(
            "Sample request",
            value=None,
            request_only=True,
            description="GET /api/onetouch/config/{hostname}/"
        ),
        OpenApiExample(
            "Sample response",
            value={
                "status": "Success",
                "statusCode": 200,
                "message": "Configuration data loaded",
                "data": {
                    "hostname": "FW123456",
                    "config_xml": "<xml>...</xml>"
                }
            },
            response_only=True,
            description="Device configuration XML for the specified hostname"
        ),
        OpenApiExample(
            "Missing hostname error",
            value={
                "status": "BadRequestError",
                "statusCode": 400,
                "message": "hostname is mandatory, please pass as a parameter!"
            },
            response_only=True,
            description="Returned if hostname is missing"
        ),
        OpenApiExample(
            "Invalid hostname error",
            value={
                "status": "BadRequestError",
                "statusCode": 400,
                "message": "Please use the serial number only!"
            },
            response_only=True,
            description="Returned if hostname contains 'ZZ01'"
        ),
    ]
)
class OneTouchConfig(generics.GenericAPIView):
    
    permission_classes = []

    def get(self, request, **kwargs):
        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        if "hostname" not in kwargs:
            return Response({
                "status": "BadRequestError",
                "statusCode": status.HTTP_400_BAD_REQUEST,
                "message": "hostname is mandatory, please pass as a parameter!"
            }, status=status.HTTP_400_BAD_REQUEST)

        hostname = kwargs["hostname"]
        if "ZZ01" in hostname:
            return Response({
                "status": "BadRequestError",
                "statusCode": status.HTTP_400_BAD_REQUEST,
                "message": "Please use the serial number only!"
            }, status=status.HTTP_400_BAD_REQUEST)
        phs_response = getFtDataByHostname(hostname)
        return Response(phs_response, status=phs_response["statusCode"])


@extend_schema(
    methods=["POST"],
    tags=["uCPE OneTouch"],
    summary="Ping a host by IPv4 or IPv6 address",
    description=(
        "Ping a host by IPv4 or IPv6 address. "
        "Accepts the IP address in the POST body."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "address": {
                    "type": "string",
                    "description": "The IP address to ping"
                }
            },
            "required": ["address"]
        }
    },
    examples=[
        OpenApiExample(
            "Ping Example",
            value={"address": "192.168.1.1"},
            request_only=True,
            description="Ping a device at 192.168.1.1"
        )
    ]
)
class OneTouchPing(APIView):

    permission_classes = []

    def post(self, request):
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        logging.debug("Request Body: %s", request.data)
        if "address" not in request.data:
            return Response({
                "status": "BadRequestError",
                "statusCode": status.HTTP_400_BAD_REQUEST,
                "message": "'address' is mandatory for ping, please pass as post body!"
            }, status=status.HTTP_400_BAD_REQUEST)
        ping_response = pingDeviceByAddress(request.data["address"])
        return Response(ping_response, status=ping_response["statusCode"])


@extend_schema(
    methods=["POST"],
    tags=["uCPE OneTouch"],
    summary="Send bootstrap to a device and activate it",
    description=(
        "Send bootstrap to a specific device and activate it. "
        "Accepts the mandatory Serial Number and JDM IP by POST."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "serial": {
                    "type": "string",
                    "description": "Device Serial Number"
                },
                "jdmip": {
                    "type": "string",
                    "description": "Device JDM IP"
                }
            },
            "required": ["serial", "jdmip"]
        }
    }
)
class OneTouchBootstrap(APIView):
    
    permission_classes = []

    def post(self, request):
        
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        logging.debug("Request Body: %s", request.data)
        if not all(key in request.data for key in ("serial", "jdmip")):
            return Response({
                "status": "BadRequestError",
                "statusCode": status.HTTP_400_BAD_REQUEST,
                "message": "'serial' and 'jdmip' is mandatory for bootstrap, please pass body!"
            }, status=status.HTTP_400_BAD_REQUEST)
        bootstrap_response = bootstrapDevice(request.data["serial"], request.data["jdmip"])
        return Response(bootstrap_response)

@extend_schema(
    methods=["POST"],
    tags=["CLI SSH"],
    summary="Send CLI script to device via SSH",
    description=(
        "Sending CLI script to device via SSH. "
        "Accepts CLI commands and device hostnames in the POST body."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "params": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "name": {"type": "string"},
                            "value": {}
                        },
                        "required": ["type", "name", "value"]
                    }
                },
                "devices": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "hostname": {"type": "string"}
                        },
                        "required": ["hostname"]
                    }
                }
            },
            "required": ["params", "devices"]
        }
    }
)
class RunCLISSH(generics.GenericAPIView):
    
    permission_classes = []
    serializer_class = serializers.RAGenericInput
    def post(self, request):
        
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        logging.debug("Request Body: %s", request.data)
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        client_data = cli_get_credentials(request)
        data = parsed.data
        cli_array = []
        for param in data["params"]:
            if param["type"] == "json" and param["name"] == "cli_list":
                cli_array = param["value"]
            elif param["type"] == "base64" and param["name"] == "cli_list":
                strinput = base64.b64decode(param["value"]).decode("utf-8")
                strinput = strinput.replace('\t', '')
                strinput = strinput.replace('\n', '')
                cli_array = json.loads(strinput)
        device = data["devices"][0]["hostname"]
        client_data["device"] = device
        client_data["cli_array"] = cli_array
        cli_resp = ssh_client(client_data)
        return Response(cli_resp)

@extend_schema(
    methods=["POST"],
    tags=["CLI SSH"],
    summary="Lookup geocoordinates for a single address",
    description=(
        "Accepts a single address in the request body and returns its latitude and longitude. "
        "The address should include city, state, postal code, and street address. "
        "The endpoint responds with the geolocation data for the given address."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "params": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "name": {"type": "string"},
                            "value": {
                                "type": "object",
                                "properties": {
                                    "city": {"type": "string", "example": "New York"},
                                    "state": {"type": "string", "example": "NY"},
                                    "postal_code": {"type": "string", "example": "10001"},
                                    "street_address": {"type": "string", "example": "123 Main St"}
                                },
                                "required": ["city", "state", "postal_code", "street_address"]
                            }
                        },
                        "required": ["type", "name", "value"]
                    }
                },
                "devices": {
                    "type": "array",
                    "items": {"type": "object"}
                }
            },
            "required": ["params", "devices"]
        }
    },
    examples=[
        OpenApiExample(
            "Sample address geolocation request",
            value={
                "params": [
                    {
                        "type": "json",
                        "name": "address",
                        "value": {
                            "city": "San Francisco",
                            "state": "CA",
                            "postal_code": "94105",
                            "street_address": "1 Market St"
                        }
                    }
                ],
                "devices": []
            },
            request_only=True,
            description="Request to get geocoordinates for a single address"
        )
    ]
)
class GetGeolocationForRA(generics.GenericAPIView):
   
    permission_classes = []
    serializer_class = serializers.RAGenericInput
    def post(self, request):
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        for param in data["params"]:
            if param["type"] == "json" and param["name"] == "address":
                input_data_nv = param["value"]
            elif param["type"] == "base64" and param["name"] == "address":
                strinput = base64.b64decode(param["value"]).decode("utf-8")
                strinput = strinput.replace('\t', '')
                strinput = strinput.replace('\n', '')
                try:
                    input_data_nv = json.loads(strinput)
                except ValueError as exception:
                    return Response({
                        "message":
                            f"Failed to create edge appliances JSON incorrect: {exception}",
                        "userMessage":
                            "Edge creation failed"
                            })
        if isinstance(input_data_nv, list):
            print("Recieved a list of Adresses!")
            idata = serializers.AddressListField(data={'input_data': input_data_nv})
            idata.is_valid(raise_exception=True)
            all_geodata = []
            geos = idata.data
            for geo in geos["input_data"]:
                print(geo)
                resp = get_lon_lat(geo)
                all_geodata.append(resp)
            return Response({
                "message": "GeoData succesfully loaded",
                "userMessage": "GeoData succesfully loaded",
                "data": all_geodata  
            })
        else:
            print("Recieved a single Adresses!")
            idata = serializers.Address(data=input_data_nv)
            idata.is_valid(raise_exception=True)
            location = get_lon_lat(idata.data)
            return Response({
                "message": "GeoData succesfully loaded",
                "userMessage": "GeoData succesfully loaded",
                "data": location  
            })

@extend_schema(
    methods=["POST"],
    tags=["CLI SSH"],
    summary="Lookup geocoordinates for multiple addresses",
    description=(
        "Accepts a list of addresses in the request body and returns their latitude and longitude. "
        "Each address should include city, state, postal code, and street address. "
        "The endpoint responds with geolocation data for all provided addresses and returns an XLSX file (base64-encoded) as well."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "params": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "name": {"type": "string"},
                            "value": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "city": {"type": "string", "example": "New York"},
                                        "state": {"type": "string", "example": "NY"},
                                        "postal_code": {"type": "string", "example": "10001"},
                                        "street_address": {"type": "string", "example": "123 Main St"}
                                    },
                                    "required": ["city", "state", "postal_code", "street_address"]
                                }
                            }
                        },
                        "required": ["type", "name", "value"]
                    }
                },
                "devices": {
                    "type": "array",
                    "items": {"type": "object"}
                }
            },
            "required": ["params", "devices"]
        }
    },
    examples=[
        OpenApiExample(
            "Multiple address geolocation request",
            value={
                "params": [
                    {
                        "type": "json",
                        "name": "address",
                        "value": [
                            {
                                "city": "San Francisco",
                                "state": "CA",
                                "postal_code": "94105",
                                "street_address": "1 Market St"
                            },
                            {
                                "city": "New York",
                                "state": "NY",
                                "postal_code": "10001",
                                "street_address": "123 Main St"
                            }
                        ]
                    }
                ],
                "devices": []
            },
            request_only=True,
            description="Request to get geocoordinates for multiple addresses"
        )
    ]
)
class GetGeolocationsForRA(generics.GenericAPIView):

    permission_classes = []
    serializer_class = serializers.RAGenericInput
    def post(self, request):
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        input_data_nv = {}
        for param in data["params"]:
            if param["type"] == "json" and param["name"] == "address":
                input_data_nv["input_data"] = param["value"]
            elif param["type"] == "base64" and param["name"] == "address":
                strinput = base64.b64decode(param["value"]).decode("utf-8")
                strinput = strinput.replace('\t', '')
                strinput = strinput.replace('\n', '')
                try:
                    input_data_nv["input_data"] = json.loads(strinput)
                except ValueError as exception:
                    return Response({
                        "message":
                            f"Failed to create edge appliances JSON incorrect: {exception}",
                        "userMessage":
                            "Edge creation failed"
                            })
        idata = serializers.AddressListField(data=input_data_nv)
        idata.is_valid(raise_exception=True)
        all_geodata = []
        geos = idata.data
        for geo in geos["input_data"]:
            print(geo)
            resp = get_lon_lat(geo)
            all_geodata.append({"city":geo["city"], "state":geo["state"],
                                "postal_code":geo["postal_code"],
                                "street_address":geo["street_address"], "lon":resp["lon"],
                                "lat":resp["lat"]})
        filename = create_filename("geodata", "xlsx")
        encodedfile = geodata_list(all_geodata)
        return Response({
            "message": "GeoData succesfully loaded",
            "userMessage": "GeoData succesfully loaded",
            "filename":filename,
            "data": [{"type": "application/vnd.ms-excel",
                      "value": encodedfile}]  
        })

@extend_schema(
    methods=["POST"],
    tags=["CLI SSH"],
    summary="Get circuit details based on circuit IDs",
    description=(
        "Accepts a list of circuit IDs in the request body and returns details for each circuit. "
        "The response includes an XLSX file (base64-encoded) containing the circuit data."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "params": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "example": "json"},
                            "name": {"type": "string", "example": "circuits"},
                            "value": {
                                "type": "array",
                                "items": {"type": "string", "example": "CIRCUIT12345"}
                            }
                        },
                        "required": ["type", "name", "value"]
                    }
                },
                "devices": {
                    "type": "array",
                    "items": {"type": "object"}
                }
            },
            "required": ["params", "devices"]
        }
    },
    examples=[
        OpenApiExample(
            "Sample circuit details request",
            value={
                "params": [
                    {
                        "type": "json",
                        "name": "circuits",
                        "value": ["CIRCUIT12345", "CIRCUIT67890"]
                    }
                ],
                "devices": []
            },
            request_only=True,
            description="Request to get details for multiple circuits"
        ),
        OpenApiExample(
            "Sample circuit details response",
            value={
                "message": "Circuit data completed",
                "userMessage": "Circuit data load completed",
                "filename": "circuits_20260126.xlsx",
                "data": [
                    {
                        "type": "application/vnd.ms-excel",
                        "value": "<base64-encoded-xlsx>"
                    }
                ]
            },
            response_only=True,
            description="Response with base64-encoded XLSX file containing circuit details"
        )
    ]
)
class GetCircuitDetails(generics.GenericAPIView):
   
    permission_classes = []
    serializer_class = serializers.RAGenericInput
    def post(self, request):
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        input_data_nv = {}
        for param in data["params"]:
            if param["type"] == "json" and param["name"] == "circuits":
                input_data_nv["input_data"] = param["value"]
            elif param["type"] == "base64" and param["name"] == "circuits":
                strinput = {}
                strinput = base64.b64decode(param["value"]).decode("utf-8")
                try:
                    input_data_nv["input_data"] = json.loads(strinput)
                except ValueError as exception:
                    return Response({
                        "message":
                            f"Failed to create edge appliances JSON incorrect: {exception}",
                        "userMessage":
                            "Edge creation failed"
                            })
        idata = serializers.StringListField(data=input_data_nv)
        idata.is_valid(raise_exception=True)
        all_circuits = []
        circuits = idata.data
        #loop for all circuits
        for circuit in circuits["input_data"]:
            all_circuits.append(get_circuit_data(circuit))
        filename = create_filename("circuits", "xlsx")
        encodedfile = circuit_list(all_circuits)
        return Response({
            "message": "Circuit data completed",
            "userMessage": "Circuit data load completed",
            "filename":filename,
            "data": [{"type": "application/vnd.ms-excel",
                      "value": encodedfile}]  
        })

@extend_schema(
    methods=["POST"],
    tags=["CLI SSH"],
    summary="Get BVoIP Tele Number details based on Dial Plan or Customer Name",
    description=(
        "Accepts a list of Dial Plan IDs or Customer Names in the request body and returns BVoIP Tele Number details. "
        "The response includes an XLSX file (base64-encoded) containing the tele number ranges, CNAM, and IP Toll-Free numbers."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "params": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "example": "json"},
                            "name": {"type": "string", "example": "dialplanId"},
                            "value": {
                                "type": "array",
                                "items": {"type": "string", "example": "DIALPLAN123"}
                            }
                        },
                        "required": ["type", "name", "value"]
                    }
                },
                "devices": {
                    "type": "array",
                    "items": {"type": "object"}
                }
            },
            "required": ["params", "devices"]
        }
    },
    examples=[
        OpenApiExample(
            "Sample BVoIP Tele Number request (by Dial Plan ID)",
            value={
                "params": [
                    {
                        "type": "json",
                        "name": "dialplanId",
                        "value": ["DIALPLAN123", "DIALPLAN456"]
                    }
                ],
                "devices": []
            },
            request_only=True,
            description="Request to get BVoIP Tele Number details for multiple Dial Plan IDs"
        ),
        OpenApiExample(
            "Sample BVoIP Tele Number request (by Customer Name)",
            value={
                "params": [
                    {
                        "type": "json",
                        "name": "customerName",
                        "value": ["CustomerA", "CustomerB"]
                    }
                ],
                "devices": []
            },
            request_only=True,
            description="Request to get BVoIP Tele Number details for multiple Customer Names"
        ),
        OpenApiExample(
            "Sample BVoIP Tele Number response",
            value={
                "message": "BVoIP Tele Number data completed",
                "userMessage": "BVoIP Tele Number Ranges report load completed",
                "filename": "telenumber_ranges_20260126.xlsx",
                "data": [
                    {
                        "type": "application/vnd.ms-excel",
                        "value": "<base64-encoded-xlsx>"
                    }
                ]
            },
            response_only=True,
            description="Response with base64-encoded XLSX file containing BVoIP Tele Number details"
        )
    ]
)
class GetBvoipTeleNumbers(generics.GenericAPIView):

    permission_classes = []
    serializer_class = serializers.RAGenericInput
    def post(self, request):
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        input_data_nv = {"input_data": {}}

        for param in data["params"]:
            if param["type"] == "json":
                input_data_nv["input_data"][param["name"]] = param["value"]

        idata = serializers.ListDictField(data=input_data_nv)
        idata.is_valid(raise_exception=True)
        dialplan_ids = [
            re.sub(r"[^\w]", "", str(dpid)).strip()
            for dpid in idata.data["input_data"].get("dialplanId", [])
        ]
        customer_names = idata.data["input_data"].get("customerName", [])
        # If both dialplan_ids and customer_names are provided, prioritize dialplan_ids
        if dialplan_ids and customer_names:
            logging.info("Both Dial Plan IDs and Customer Names provided, using Dial Plan IDs: %s", dialplan_ids)
        # If only dialplan_ids are provided, use them directly
        elif dialplan_ids and not customer_names:
            logging.info("Dial Plan IDs provided, using them directly: %s", dialplan_ids)
        # If only customer_names are provided, fetch dialplan_ids based on customer_names
        if not dialplan_ids and customer_names:
            logging.info("No Dial Plan IDs provided, fetching based on Customer Names: %s", customer_names)
            dialplan_ids_by_customer_name_query = get_dialplans_by_customer_names_query(customer_names)
            dialplans = execute_edf_query_with_concurrency(dialplan_ids_by_customer_name_query)
            dialplan_ids = [dialplan["DIAL_PLAN_ID"] for dialplan in dialplans]
        logging.info("Dial Plan IDs to be used: %s", dialplan_ids)
        bvoip_tele_ranges = []
        cnam_and_telenumbers = []
        ip_tollfree_telenumbers = []
        for dialplan_id in dialplan_ids:
            logging.info("Geting TN Ranges for Dial Plan ID: %s", dialplan_id)
            # -----------------------------------------------------------------------
            # STEP 1: Get all the HUB Sites Details and TN Ranges for the Dialplan ID
            # -----------------------------------------------------------------------
            hub_sites_tele_ranges_query = get_hub_sites_tele_ranges_query(dialplan_id)
            hub_sites_tele_ranges_raw = execute_edf_query_with_concurrency(hub_sites_tele_ranges_query)
            hub_sites_tele_ranges = deduplicate_ranges(hub_sites_tele_ranges_raw)
            
            # Filter unique 'SITE_IDENTIFIER' from tele number ranges (HUB Sites)
            distinct_hub_site_ids = list({x["SITE_ID"] for x in hub_sites_tele_ranges})
            # Filter unique 'BVOIP_CUSTOMER_SITE_DETAIL_ID' from tele number ranges (HUB Sites)
            distinct_hub_site_details_ids = list({x["BVOIP_CUSTOMER_SITE_DETAIL_ID"] for x in hub_sites_tele_ranges})
            # Also get the Account Numbers for the distinct HUB Sites
            site_account_numbers = get_site_account_numbers(distinct_hub_site_details_ids)
            # Add the Account Numbers to the hub_sites_tele_ranges
            for hub_site in hub_sites_tele_ranges:
                site_account_number = next(
                    (item for item in site_account_numbers if item["BVOIP_CUSTOMER_SITE_DETAIL_ID"] == hub_site["BVOIP_CUSTOMER_SITE_DETAIL_ID"]),
                    {}
                )
                hub_site["MAIN_ACCOUNT_NUMBER"] = site_account_number.get("MAIN_ACCOUNT_NUMBER", "N/A")
            
            # ---------------------------------------------------------------------------------
            # STEP 2: Get all the Remote Sites Details and TN Ranges for the distinct HUB Sites
            # ---------------------------------------------------------------------------------
            remote_sites_tele_ranges_query = get_remote_sites_tele_ranges_query(distinct_hub_site_details_ids)
            remote_sites_tele_ranges_raw = execute_edf_query_with_concurrency(remote_sites_tele_ranges_query, max_concurrent_pages=20)
            remote_sites_tele_ranges = deduplicate_ranges(remote_sites_tele_ranges_raw)
            
            # ---------------------------------------------------------------------------------
            # STEP 3: Merge the HUB and Remote Sites Details and TN Ranges
            # ---------------------------------------------------------------------------------
            for hub_site_details_id in distinct_hub_site_details_ids:
                # Filter out all the TN Ranges for this hub site and put it into bvoip_tele_ranges
                bvoip_tele_ranges.extend([x for x in hub_sites_tele_ranges if x["BVOIP_CUSTOMER_SITE_DETAIL_ID"] == hub_site_details_id])
                # Filter out all the TN Ranges for this remote site
                remote_sites_for_this_hub_site = [x for x in remote_sites_tele_ranges if x["BVOIP_CUSTOMER_SITE_DETAIL_ID"] == hub_site_details_id]
                # Get SITE_ID and CIRCUIT_ID for this hub site
                hub_site_details = next((item for item in hub_sites_tele_ranges if item["BVOIP_CUSTOMER_SITE_DETAIL_ID"] == hub_site_details_id), None)
                # Add SITE_ID, CIRCUIT_ID from the hub site to each remote site
                remote_sites_for_this_hub_site = [
                    {
                        "SITE_ID": hub_site_details["SITE_ID"],
                        "COMPANY_NAME": hub_site_details["COMPANY_NAME"],
                        **x,
                        "CIRCUIT_ID": hub_site_details["CIRCUIT_ID"],
                        "CUSTOMER_DIAL_PLAN_ID": hub_site_details["CUSTOMER_DIAL_PLAN_ID"],
                        "ENHANCED_SERVICE_INDR": hub_site_details["ENHANCED_SERVICE_INDR"],
                        "IPTF_SIP_OPTIONS_INDR": hub_site_details["ENHANCED_SERVICE_INDR"],
                        "MAIN_ACCOUNT_NUMBER": hub_site_details["MAIN_ACCOUNT_NUMBER"]
                    } for x in remote_sites_for_this_hub_site
                ]
                # Add the remote site TN Ranges to bvoip_tele_ranges
                bvoip_tele_ranges.extend(remote_sites_for_this_hub_site)
            
            # ---------------------------------------------------------------------------------
            # STEP 4: Get all the Tele Numbers and CNAM for the distinct HUB Sites
            # ---------------------------------------------------------------------------------
            cn_and_tns_query = get_cnam_and_tn_query(distinct_hub_site_ids)
            cn_and_tns = execute_edf_query_with_concurrency(cn_and_tns_query)
            # Append the CNAM and TN data to the cnam_and_telenumbers list
            cnam_and_telenumbers.extend(cn_and_tns)
            
            # ---------------------------------------------------------------------------------
            # STEP 5: Get all the IP Toll Free Tele Numbers for the dialplan ID
            # ---------------------------------------------------------------------------------
            ip_tollfree_query = get_ip_tollfree_tn_query(dialplan_id)
            ip_tollfree_tns = execute_edf_query_with_concurrency(ip_tollfree_query)
            # Append the IP Toll Free TN data to the ip_tollfree_telenumbers list
            ip_tollfree_telenumbers.extend(ip_tollfree_tns)
            
            # Print the summary of the data loaded
            logging.info("BVoIP Tele Numbers loaded for Dial Plan ID: %s", dialplan_id)
            logging.info(f"DialPlan: {dialplan_id}, Tele Ranges: {len(bvoip_tele_ranges)}, Cnam: {len(cn_and_tns)}, Ip Toll-Free: {len(ip_tollfree_tns)}")
                
        # Create a filename for the telenumber_ranges file with an "xlsx" extension
        filename = create_filename("telenumber_ranges", "xlsx")
        #filename = create_filename("telenumber_ranges", "zip")
        # bvoip_tele_ranges_deduplicated = deduplicate_ranges(bvoip_tele_ranges)
        
        # Encode the list of bvoip_tele_numbers into the telenumber_ranges file format
        encodedfile = telenumber_ranges_list(tn_ranges=bvoip_tele_ranges, cn_tn=cnam_and_telenumbers, iptf_tn=ip_tollfree_telenumbers)

        # Return a Response object with the encoded file
        return Response({
            "message": "BVoIP Tele Number data completed",
            "userMessage": "BVoIP Tele Number Ranges report load completed",
            "filename": filename,
            "data": [{ "type": "application/vnd.ms-excel", "value": encodedfile }]
        })

@extend_schema(
    methods=["POST"],
    tags=["File Management"],
    summary="Upload a file to Azure Blob Storage",
    description=(
        "Uploads a file to Azure Blob Storage. "
        "Accepts a file via multipart/form-data. "
        "Allowed file types: images, PDF, Excel, Word, RTF, text, ZIP."
    ),
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "file": {
                    "type": "string",
                    "format": "binary",
                    "description": "The file to upload"
                }
            },
            "required": ["file"]
        }
    },
    responses={
        201: OpenApiExample(
            "Successful upload",
            value={"message": "File uploaded successfully", "url": "https://.../yourfile.xlsx"},
            response_only=True,
            description="File uploaded successfully"
        ),
        400: OpenApiExample(
            "No file provided or invalid type",
            value={"error": "No file provided"},
            response_only=True,
            description="No file provided or invalid file type/extension"
        ),
        500: OpenApiExample(
            "Upload failed",
            value={"error": "File upload failed"},
            response_only=True,
            description="File upload failed due to server error"
        ),
    }
)
class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = []

    def post(self, request):
        file = request.data.get('file')

        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        allowed_content_types = [
            'image/jpeg', 'image/png', 'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/rtf',
            'text/plain',
            'application/zip'
        ]
        allowed_extensions = [
            '.jpg', '.jpeg', '.png', '.pdf',
            '.xlsx', '.xls',
            '.doc', '.docx',
            '.rtf',
            '.txt',
            '.zip'
        ]
        file_extension = os.path.splitext(file.name)[1].lower()

        if file.content_type not in allowed_content_types or file_extension not in allowed_extensions:
            return Response({"error": "Invalid file type or extension"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = upload_blob(file)
            if result:
                return Response({"message": "File uploaded successfully", "url": result}, status=status.HTTP_201_CREATED)
            else:
                return Response({"error": "File upload failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(
    methods=["GET"],
    tags=["File Management"],
    summary="Download a file from Azure Blob Storage",
    description=(
        "Downloads a file from Azure Blob Storage. "
        "Requires 'filename' and 'sas_token' as query parameters. "
        "Returns the file as an HTTP response or an error message."
    ),
    parameters=[
        OpenApiParameter(
            name="filename",
            type=str,
            location=OpenApiParameter.QUERY,
            required=True,
            description="The name of the file to download"
        ),
        OpenApiParameter(
            name="sas_token",
            type=str,
            location=OpenApiParameter.QUERY,
            required=True,
            description="The SAS token for secure access"
        ),
    ],
    responses={
        200: OpenApiTypes.BINARY,
        400: OpenApiExample(
            "Missing parameters",
            value={"error": "Filename and SAS token are required"},
            response_only=True,
            description="Missing required query parameters"
        ),
        403: OpenApiExample(
            "SAS token expired or invalid",
            value={"error": "The SAS token is expired or invalid. Please request a new token."},
            response_only=True,
            description="SAS token is expired or invalid"
        ),
        404: OpenApiExample(
            "File not found",
            value={"error": "The requested file was not found."},
            response_only=True,
            description="File not found in storage"
        ),
        500: OpenApiExample(
            "Unexpected error",
            value={"error": "An unexpected error occurred. Please try again later."},
            response_only=True,
            description="Unexpected server error"
        ),
    }
)
class FileDownloadView(APIView):
    permission_classes = []

    def get(self, request):
        filename = request.GET.get("filename")
        sas_token = request.GET.get("sas_token")
        if not filename or not sas_token:
            return Response(
                {"error": "Filename and SAS token are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = download_blob(filename, sas_token)
            return response

        except HttpResponseError as e:
            if e.status_code == 403:
                logging.error(f"Access denied or expired SAS token for blob '{filename}': {e.message}")
                return Response(
                    {"error": "The SAS token is expired or invalid. Please request a new token."},
                    status=status.HTTP_403_FORBIDDEN
                )
            elif e.status_code == 404:
                logging.error(f"Blob '{filename}' not found: {e.message}")
                return Response(
                    {"error": "The requested file was not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            else:
                logging.error(f"HTTP error occurred while downloading blob '{filename}': {e.message}", exc_info=True)
                return Response(
                    {"error": f"HTTP error occurred: {e.message}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logging.error(f"Unexpected error occurred while downloading blob '{filename}': {e}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

def parse_date(date_str):
    """Parse date in format like '07-OCT-20' or '01-SEP-16' or '31-MAR-21'."""
    for fmt in ("%d-%b-%y", "%d-%b-%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except Exception:
            continue
    return datetime.min

def deduplicate_ranges(ranges):
    """
    Remove duplicates based on PBX_BEGIN_RANGE and PBX_END_RANGE.
    Keep the record with the most recent date (LAST_UPDATE_DATE, LN_STRT_DT).
    Exclude records where HUB_RMT_IND is 'RB' and REMOTE_SITE_ID is N/A, None, or empty.
    """
    unique = {}
    for record in ranges:
        key = (record.get("PBX_BEGIN_RANGE"))
        # Parse dates, fallback to datetime.min if missing
        last_update = parse_date(record.get("LAST_UPDATE_DATE", "01-JAN-70"))
        ln_start = parse_date(record.get("LN_STRT_DT", "01-JAN-70"))
        best_date = max(last_update, ln_start)
        if key not in unique:
            unique[key] = (record, best_date)
        else:
            _, existing_best_date = unique[key]
            if best_date > existing_best_date:
                unique[key] = (record, best_date)
    # Return only the records, filtering out unwanted RB rows
    return [
        rec for rec, _ in unique.values()
        if not (rec.get("HUB_RMT_IND") == "RB" and str(rec.get("REMOTE_SITE_ID", "")).upper() in ("", "N/A", "NONE", "NULL"))
    ]