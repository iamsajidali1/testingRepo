""" general view module """
import sys
import logging
from base64 import b64decode, b64encode
from io import BytesIO
import pandas as pd
import numpy as np
from api.authentication import Authentication
from api.device import ( get_device_list, get_device_int_stats, get_bulkApis_options, get_device_templates, 
    get_feature_templates, show_attached_dev_to_device_templates, get_device_input_variables, get_tshoot_outputs)

from api.utils import create_filename, get_credentials
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from api import serializers
from datetime import datetime

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s')

@method_decorator(name="get", decorator=swagger_auto_schema(tags=["Status"]))
class Status(generics.GenericAPIView):
    """ 
    Testing class - shows the status
    """

    def get_serializer(self, *args, **kwargs):
        pass

    def get_serializer_class(self):
        pass
    permission_classes = []
    def get(self, request, **kwargs):
        """
        To check if the endpoint is running
        
        Attributes:
            N/A
        """

        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        return Response({
            "status": 'OK',
            "statusCode": 200,
            "message": "The endpoint is authenticated, up and running!"
        }, status=200
        )

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["Device"]))
class GetDevicesList(generics.GenericAPIView):
    """
    A view to get the list of devices. This view allows users to retrieve a list of devices.
    """

    def get_serializer(self, *args, **kwargs):
        pass

    def get_serializer_class(self):
        pass
    
    permission_classes = []

    def post(self, request, **kwargs):
        """
        Handles the POST request for retrieving a list of devices. No input needed. 
        This view allows users to retrieve a list of devices. 

        Methods:
        - get: Retrieves the list of devices.
            This view allows users to retrieve a list of devices.

        Methods:
        - get: Retrieves the list of devices.
       
        Attributes:
            N/A
        """
        logging.debug(
            "%s: Incoming post request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        host, port, user, password = get_credentials(request)
        auth = Authentication(host=host, port=port, user=user, password=password)
        try:
            session = auth.login()
            logging.debug("Acquired login session: %s", session)
            api_data = get_device_list(session=session, host=host, port=port)
            
            # creating the columns to excel
            extracted_data = [{
                'host-name': entry.get('host-name'),
                'deviceId': entry.get('deviceId'),
                'device-type': entry.get('device-type'),
                'system-ip': entry.get('system-ip'),
                'state': entry.get('state'),
                'reachability': entry.get('reachability'),
                'status': entry.get('status'),
                'device-model': entry.get('device-model'),
                'personality': entry.get('personality'),
                'timezone': entry.get('timezone'),
                'device-groups': entry.get('device-groups'),
                'lastupdated': entry.get('lastupdated'),
                'domain-id': entry.get('domain-id'),
                'board-serial': entry.get('board-serial'),
                'certificate-validity': entry.get('certificate-validity'),
                'max-controllers': entry.get('max-controllers'),
                'uuid': entry.get('uuid'),
                'controlConnections': entry.get('controlConnections'),
                'version': entry.get('version'),
                'connectedVManages': entry.get('connectedVManages'),
                'site-id': entry.get('site-id'),
                'latitude': entry.get('latitude'),
                'longitude': entry.get('longitude'),
                'isDeviceGeoData': entry.get('isDeviceGeoData'),
                'platform': entry.get('platform'),
                'uptime-date': entry.get('uptime-date'),
                'statusOrder': entry.get('statusOrder'),
                'device-os': entry.get('device-os'),
                'validity': entry.get('validity'),
                'state_description': entry.get('state_description'),
                'model_sku': entry.get('model_sku'),
                'local-system-ip': entry.get('local-system-ip'),
                'total_cpu_count': entry.get('total_cpu_count'),
                'testbed_mode': entry.get('testbed_mode'),
                'layoutLevel': entry.get('layoutLevel')
            } for entry in api_data]
            
            # Creating dataframe and formatting the date columns
            df = pd.DataFrame(extracted_data)
            df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")
            df["uptime-date"] = pd.to_datetime(df["uptime-date"], unit="ms")
            
            #df.sort_values(by='host_name', inplace=True)

            output = BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Sheet1')
                
                workbook = writer.book
                worksheet = writer.sheets['Sheet1']
                worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
                    'columns': [{'header': column_name} for column_name in df.columns],
                    'style': 'Table Style Medium 9'
                })
                # setting the width of particular columns
                worksheet.set_column('A:A', 30)
                worksheet.set_column('B:Z', 20)
                
            data = b64encode(output.getvalue()).decode('utf-8')
            output.close()
            
            filename = create_filename("Device_List", "xlsx")
            # return encoded_excel

            return Response({
                "status": 'OK',
                "statusCode": 200,
                "message": "The list of devices",
                "filename": filename,
                "data": [{
                    "type": "application/vnd.ms-excel",
                    "value": data
                }]
            }, status=200)
        except Exception as e:
            logging.error(
                "%s: An error occurred: %s", self.__class__.__name__, e
            )
            return Response({
                "status": 'Error',
                "statusCode": 500,
                "message": str(e)
            }, status=500)
        finally:
            logging.debug("Logging out for session: %s", session)
            auth.logout()

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["Device"]))
class GetInterfaceStatistics(generics.GenericAPIView):
    """
    A view to see the interface status for all devices.
    """
    serializer_class = serializers.RAGenericInput
    permission_classes = []

    def post(self, request, **kwargs):
        """
        Handles the POST request for retrieving a statistics of interfaces for all online devices.
        
        Attributes:
            N/A

        Input for the function
        {
            "devices":[
                ]
            "params": [
            ],
        }
        """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        devices = parsed.data["devices"]

        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        host, port, user, password = get_credentials(request)
        auth = Authentication(host=host, port=port, user=user, password=password)

        try:
            session = auth.login()
            logging.debug("Acquired login session: %s", session)

            # Getting the input data to proceed with calls
            deviceId_fromAPI = get_device_list(session=session, host=host, port=port)
            device_id = ""
            api_data = []
            
            for hostname in deviceId_fromAPI:
                device_id = hostname["deviceId"]   # getting deviceId from hostname input
                try:    
                    temp_data = get_device_int_stats(session=session, host=host, port=port, deviceId=device_id)
                    api_data.extend(temp_data)
                except:
                    logging.error("No data for edge {device_id} - edge offline!")
            
            # creating the columns to excel - sorted
            extracted_data = [{
                "vdevice-host-name": entry.get('vdevice-host-name'),
                "vdevice-name": entry.get('vdevice-name'),
                "ifname": entry.get('ifname'),
                "if-admin-status": entry.get('if-admin-status'),
                "if-oper-status": entry.get('if-oper-status'),
                "hwaddr": entry.get('hwaddr'),
                "interface-type": entry.get('interface-type'),
                "ip-address": entry.get('ip-address'),
                "ipv4-subnet-mask": entry.get('ipv4-subnet-mask'),
                "mtu": entry.get('mtu'),
                "speed-mbps": entry.get('speed-mbps'),
                "num-flaps": entry.get('num-flaps'),
                "vpn-id": entry.get('vpn-id'),
                "ipv4-tcp-adjust-mss": entry.get('ipv4-tcp-adjust-mss'),
                "ipv6-tcp-adjust-mss": entry.get('ipv6-tcp-adjust-mss'),
                "bia-address": entry.get('bia-address'),
                "auto-downstream-bandwidth": entry.get('auto-downstream-bandwidth'),
                "rx_octets": entry.get('rx_octets'),
                "rx-kbps":  entry.get('rx-kbps'),
                "rx-errors": entry.get('rx-errors'),
                "rx-pps": entry.get('rx-pps'),
                "rx-packets": entry.get('rx-packets'),
                "rx-drops": entry.get('rx-drops'),
                "tx-kbps": entry.get('tx-kbps'),
                "tx-pps": entry.get('tx-pps'),
                "tx-errors": entry.get('tx-errors'),
                "tx-drops": entry.get('tx-drops'),
                "tx-octets": entry.get('tx-octets'),
                "tx-packets": entry.get('tx-packets'),
                "lastupdated": entry.get('lastupdated')
            } for entry in api_data]

            # Creating dataframe and formatting the date columns
            df = pd.DataFrame(extracted_data)
            df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")
            
            output = BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Sheet1')
                workbook = writer.book
                worksheet = writer.sheets['Sheet1']
                worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
                    'columns': [{'header': column_name} for column_name in df.columns],
                    'style': 'Table Style Medium 9'
                })
                # setting the width of particular columns
                worksheet.set_column('A:C', 30)
                worksheet.set_column('D:ZZ', 20)  
                
            data = b64encode(output.getvalue()).decode('utf-8')
            output.close()
            # return encoded_excel

            filename = create_filename("Interface_List", "xlsx")
            # return encoded_excel

            return Response({
                "status": 'OK',
                "statusCode": 200,
                "message": "The list of devices",
                "filename": filename,
                "data": [{
                    "type": "application/vnd.ms-excel",
                    "value": data
                }]
            }, status=200)
        
        except Exception as e:
            logging.error(
                "%s: An error occurred: %s", self.__class__.__name__, e
            )
            return Response({
                "status": 'Error',
                "statusCode": 500,
                "message": str(e)
            }, status=500)
        
        finally:
            logging.debug("Logging out for session: %s", session)
            auth.logout()

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["Device"]))
class GetBulkApisOptionOutput(generics.GenericAPIView):
    """
    BULK-APIS - This command is executing GET api calls. It is BULK API developed by Cisco and thanks to that, we can gather informations from all devices very quickly. 
        Data are gathered from all vEdge devices + controllers. At this time, cEdges are not supported. 
    """

    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request, **kwargs):
        """
        BULK-APIS - This command is executing GET api calls. It is BULK API developed by Cisco and thanks to that, we can gather informations from all devices very quickly. 
        Data are gathered from all vEdge devices + controllers. At this time, cEdges are not supported. 
        
        Params:
            bfd-sessions               = BFD sessions, all devices
            control-connection         = Active Control connections, al devices
            control-local-property     = Basic configuration parameters and local device properties to the control plane, all devices
            control-wan-int            = WAN interface control connection information, all devices
            hw-alarms                  = Active hardware alarms, all devices
            hw-enviroment              = Status information about router components, including temperature, all devices
            hw-inventory               = Inventory of router hardware components, including serial numbers, all devices
            interface                  = Interface information, all devices
            omp-peers                  = Active OMP peering sessions, all devices
            system                     = Summary of general system-wide parameters, all devices
            system-status              = Logging, reboot, and configuration history, all devices
        
            
        Input for the function
        {
            "devices": [
                ]   
            "params": [
                 {
                    "type": "json",
                    "name": "option",
                    "value": "omp-peers"
                }
            ],
        }
        """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        devices = parsed.data["devices"]

        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        host, port, user, password = get_credentials(request)
        auth = Authentication(host=host, port=port, user=user, password=password)

        try:
            session = auth.login()
            logging.debug("Acquired login session: %s", session)
            
            # Find out the param which has name="option"
            option_param = [item for item in params if item["name"] == "option"]
            # If no option param is found, return error
            if not option_param:
                return Response({
                    "status": 'Error',
                    "statusCode": 500,
                    "message": "The option parameter is missing!"
                }, status=500)
            
            # Get the value of the option param
            option = option_param[0]["value"]

            # Check if the option is supported and execute the API
            # Display information about interface.
            if option == "interface":     
                get_api_url = "dataservice/data/device/state/Interface?"

                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'ip-address': entry.get('ip-address'),
                    'ifname': entry.get('ifname'),
                    'port-type': entry.get('port-type'),
                    'if-oper-status': entry.get('if-oper-status'),
                    'if-admin-status': entry.get('if-admin-status'),
                    'tcp-mss-adjust': entry.get('tcp-mss-adjust'),
                    'mtu': entry.get('mtu'),
                    'shaping-rate': entry.get('shaping-rate')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                #df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")

            # Display an inventory of router hardware components, including serial numbers.
            elif option == "hw-inventory":
                get_api_url = "dataservice/data/device/state/HardwareInventory?"

                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'vmanage-system-ip': entry.get('vmanage-system-ip'),
                    'createTimeStamp': entry.get('createTimeStamp'),
                    'recordId': entry.get('recordId'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'hw-type': entry.get('hw-type'),
                    'serial-number': entry.get('serial-number'),
                    'version': entry.get('version'),
                    'hw-description': entry.get('hw-description'),
                    'part-number': entry.get('part-number'),
                    'lastupdated': entry.get('lastupdated')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # Display status information about router components, including component temperature.
            elif option == "hw-enviroment":
                get_api_url = "dataservice/data/device/state/HardwareEnvironment?"

                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'vmanage-system-ip': entry.get('vmanage-system-ip'),
                    'createTimeStamp': entry.get('createTimeStamp'),
                    'measurement': entry.get('measurement'),
                    'recordId': entry.get('recordId'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'hw-item': entry.get('hw-item'),
                    'hw-class': entry.get('hw-class'),
                    'status': entry.get('status'),
                    'lastupdated': entry.get('lastupdated')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # Display information about currently active hardware alarms.
            elif option == "hw-alarm":
                get_api_url = "dataservice/data/device/state/HardwareAlarms?"

            # TODO NOT working, ASK PETER where this API is coming from !

                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'vmanage-system-ip': entry.get('vmanage-system-ip'),
                    'alarm-id': entry.get('alarm-id'),
                    'alarm-description': entry.get('alarm-description'),
                    'alarm-instance': entry.get('alarm-instance'),
                    'alarm-time': entry.get('alarm-time'),
                    'alarm-category': entry.get('alarm-category'),
                    'alarm-name': entry.get('alarm-name'),
                    'recordId': entry.get('recordId'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'lastupdated': entry.get('lastupdated')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                #df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # Display information about the WAN interface control connection
            elif option == "control-wan-int":
                get_api_url = "dataservice/data/device/state/ControlWanInterface?"
                
                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'interface': entry.get('interface'),
                    'admin-state': entry.get('admin-state'),
                    'operation-state': entry.get('operation-state'),
                    'color': entry.get('color'),
                    'nat-type': entry.get('nat-type'),
                    'private-ip': entry.get('private-ip'),
                    'private-port': entry.get('private-port'),
                    'public-ip': entry.get('public-ip'),
                    'public-port': entry.get('public-port'),
                    'wan-port-hopped': entry.get('wan-port-hopped'),
                    'vmanage-connection-preference': entry.get('vmanage-connection-preference'),
                    'last-resort': entry.get('last-resort'),
                    'weight': entry.get('weight'),
                    'preference': entry.get('preference'),
                    'per-wan-max-controllers': entry.get('per-wan-max-controllers'),
                    'num-vsmarts': entry.get('num-vsmarts'),
                    'num-vmanages': entry.get('num-vmanages'),
                    'low-bandwidth-link': entry.get('low-bandwidth-link'),
                    'createTimeStamp': entry.get('createTimeStamp'),
                    'lastupdated': entry.get('lastupdated')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # Display the basic configuration parameters and local properties related to the control plane.
            elif option == "control-local-property":
                get_api_url = "dataservice/data/device/state/ControlLocalProperty?"
                
                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'site-id': entry.get('site-id'),
                    'system-ip': entry.get('system-ip'),
                    'device-type': entry.get('device-type'),
                    'number-vbond-peers': entry.get('number-vbond-peers'),
                    'retry-interval': entry.get('retry-interval'),
                    'max-controllers': entry.get('max-controllers'),
                    'vmanage-system-ip': entry.get('vmanage-system-ip'),
                    'tls-port': entry.get('tls-port'),
                    'certificate-not-valid-before': entry.get('certificate-not-valid-before'),
                    'certificate-not-valid-after': entry.get('"certificate-not-valid-after'),
                    'uuid': entry.get('uuid'),
                    'number-active-wan-interfaces': entry.get('number-active-wan-interfaces'),
                    'protocol': entry.get('protocol'),
                    'board-serial': entry.get('board-serial'),
                    'recordId': entry.get('recordId'),
                    'vsmart-list-version': entry.get('vsmart-list-version'),
                    'vedge-list-version': entry.get('vedge-list-version'),
                    'certificate-status': entry.get('certificate-status'),
                    'port-hopped': entry.get('port-hopped'),
                    'organization-name': entry.get('organization-name'),
                    'domain-id': entry.get('domain-id'),
                    'root-ca-chain-status': entry.get('root-ca-chain-status'),
                    'dns-name': entry.get('dns-name'),
                    'createTimeStamp': entry.get('createTimeStamp'),
                    'sp-organization-name': entry.get('sp-organization-name'),
                    'register-interval': entry.get('register-interval'),
                    'token': entry.get('token'),
                    'keygen-interval': entry.get('keygen-interval'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'certificate-validity': entry.get('certificate-validity'),
                    'lastupdated': entry.get('lastupdated')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # Display information about active control plane connections.
            elif option == "control-connection":
                get_api_url = "dataservice/data/device/state/ControlConnection?"

                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'site-id': entry.get('site-id'),
                    'local-color': entry.get('local-color'),
                    'remote-color': entry.get('remote-color'),
                    'system-ip': entry.get('system-ip'),
                    'state': entry.get('state'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'uptime-date': entry.get('uptime-date'),
                    'public-ip': entry.get('public-ip'),
                    'private-ip': entry.get('private-ip'),
                    'private-port': entry.get('private-port'),
                    'controller-group-id': entry.get('controller-group-id'),
                    'lastupdated': entry.get('lastupdated'),
                    'createTimeStamp': entry.get('createTimeStamp')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["uptime-date"] = pd.to_datetime(df["uptime-date"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # # Display information about BFD sessions.
            elif option == "bfd-sessions":
                get_api_url = "dataservice/data/device/state/BFDSessions?"
                
                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'site-id': entry.get('site-id'),
                    'local-color': entry.get('local-color'),
                    'color': entry.get('color'),
                    'src-ip': entry.get('src-ip'),
                    'dst-ip': entry.get('dst-ip'),
                    'src-port': entry.get('src-port'),
                    'dst-port': entry.get('dst-port'),
                    'system-ip': entry.get('system-ip'),
                    'state': entry.get('state'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'createTimeStamp': entry.get('createTimeStamp'),
                    'uptime-date': entry.get('uptime-date'),
                    'detect-multiplier': entry.get('detect-multiplier'),
                    'lastupdated': entry.get('lastupdated')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["uptime-date"] = pd.to_datetime(df["uptime-date"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # Display information about active OMP peering sessions.
            elif option == "omp-peers":
                get_api_url = "dataservice/data/device/state/OMPPeer?"
                
                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'vmanage-system-ip': entry.get('vmanage-system-ip'),
                    'recordId': entry.get('recordId'),
                    'domain-id': entry.get('domain-id'),
                    'createTimeStamp': entry.get('createTimeStamp'),
                    'refresh': entry.get('refresh'),
                    'site-id': entry.get('site-id'),
                    'type': entry.get('type'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'peer': entry.get('peer'),
                    'legit': entry.get('legit'),
                    'state': entry.get('state'),
                    'lastupdated': entry.get('lastupdated')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")

            # Display logging, reboot, and configuration history.
            elif option == "system-status":
                get_api_url = "dataservice/data/device/state/SystemStatus?"
                
                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'vmanage-system-ip': entry.get('vmanage-system-ip'),
                    'board_type': entry.get('board_type'),
                    'total_cpu_count': entry.get('total_cpu_count'),
                    'reboot_type': entry.get('reboot_type'),
                    'fp_cpu_count': entry.get('fp_cpu_count'),
                    'chassis-serial-number': entry.get('chassis-serial-number'),
                    'state_description': entry.get('state_description'),
                    'personality': entry.get('personality'),
                    'disk_status': entry.get('disk_status'),
                    'state': entry.get('state'),
                    'linux_cpu_count': entry.get('linux_cpu_count'),
                    'reboot_reason': entry.get('reboot_reason'),
                    'testbed_mode': entry.get('testbed_mode'),
                    'createTimeStamp': entry.get('createTimeStamp'),
                    'model_sku': entry.get('model_sku'),
                    'tcpd_cpu_count': entry.get('tcpd_cpu_count'),
                    'version': entry.get('version'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'bootloader_version': entry.get('bootloader_version'),
                    'fips_mode': entry.get('fips_mode'),
                    'build_number': entry.get('build_number'),
                    'lastupdated': entry.get('lastupdated'),
                    'loghost_status': entry.get('loghost_status'),
                    'uptime-date': entry.get('uptime-date')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["createTimeStamp"] = pd.to_datetime(df["createTimeStamp"], unit="ms")
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")
                df["uptime-date"] = pd.to_datetime(df["uptime-date"], unit="ms")

            # Display summary of the parameters configured in the system hierarchy.
            elif option == "system":
                get_api_url = "dataservice/data/device/state/System?"
                
                # running the function
                api_data = get_bulkApis_options(session=session, host=host, port=port, api_option=get_api_url)

                # creating the columns to excel based on user input
                extracted_data = [{
                    'vdevice-host-name': entry.get('vdevice-host-name'),
                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                    'vdevice-name': entry.get('vdevice-name'),
                    'vmanage-system-ip': entry.get('vmanage-system-ip'),
                    'lastupdated': entry.get('lastupdated'),
                    'recordId': entry.get('recordId'),
                    'uuid': entry.get('uuid')
                } for entry in api_data]

                # Creating dataframe and formatting the date columns
                df = pd.DataFrame(extracted_data)
                df["lastupdated"] = pd.to_datetime(df["lastupdated"], unit="ms")
            
            else:
                logging.debug(f"The params arg: {option} is not supported!")
                return Response({
                    "status": 'Error',
                    "statusCode": 500,
                    "message": f"The params arg: {option} is not supported!"
                }, status=500)
            
            # Formatting excel data
            output = BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Sheet1')
                workbook = writer.book
                worksheet = writer.sheets['Sheet1']
                worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
                    'columns': [{'header': column_name} for column_name in df.columns],
                    'style': 'Table Style Medium 9'
                })
                # setting the width of particular columns
                worksheet.set_column('A:C', 30)
                worksheet.set_column('D:ZZ', 20)  

            data = b64encode(output.getvalue()).decode('utf-8')
            output.close()

            filename = create_filename("BulkAPI_list", "xlsx")
            # return encoded_excel

            return Response({
                "status": 'OK',
                "statusCode": 200,
                "message": "The list of Bulk API",
                "filename": filename,
                "data": [{
                    "type": "application/vnd.ms-excel",
                    "value": data
                }]
            }, status=200)
            
        except Exception as e:
            logging.error(
                "%s: An error occurred: %s", self.__class__.__name__, e
            )
            return Response({
                "status": 'Error',
                "statusCode": 500,
                "message": str(e)
            }, status=500)
        
        finally:
            logging.debug("Logging out for session: %s", session)
            auth.logout()

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["Device"]))
class GetDeviceFeatureTemplates(generics.GenericAPIView):
    """
    A view to see the device/feature templates.
    """

    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request, **kwargs):
        """
        Handles the POST request for retrieving a feature/device templates on the devices.
        
        Selects both of the options below as an input for below function and puts to excel

                --option         
                    device-template           = shows device-templates
                    feature-template          = shows feature-templates

        Input for the function
        {
            "devices": [
                ]   
            "params": [
            ],
        }
        """

        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        devices = parsed.data["devices"]
        
        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        host, port, user, password = get_credentials(request)
        auth = Authentication(host=host, port=port, user=user, password=password)
        try:
            session = auth.login()
            logging.debug("Acquired login session: %s", session)

            api_data1 = get_device_templates(session=session, host=host, port=port)
            api_data2 = get_feature_templates(session=session, host=host, port=port)

            logging.info(api_data1)
            logging.info(api_data2)

            # creating the columns to excel - api_data1
            extracted_data = [{
                'templateId': entry.get('templateId'),
                'templateName': entry.get('templateName'),
                'templateDescription': entry.get('templateDescription'),
                'templateType': entry.get('templateType'),
                'deviceType': entry.get('deviceType'),
                'lastUpdatedBy': entry.get('lastUpdatedBy'),
                'lastUpdatedOn': entry.get('lastUpdatedOn'),
                'factoryDefault': entry.get('factoryDefault'),
                'devicesAttached': entry.get('devicesAttached'),
                'attachedMastersCount': entry.get('attachedMastersCount'),
                'templateMinVersion': entry.get('templateMinVersion'),
                'configType': entry.get('configType'),
                'createdBy': entry.get('createdBy'),
                'createdOn': entry.get('createdOn'),
                'resourceGroup': entry.get('resourceGroup'),
                'templateDefinition': entry.get('templateDefinition')
            } for entry in api_data1]

            # Creating dataframe and formatting the date columns
            df1 = pd.DataFrame(extracted_data)
            df1["createdOn"] = pd.to_datetime(df1["createdOn"], unit="ms")
            df1["lastUpdatedOn"] = pd.to_datetime(df1["lastUpdatedOn"], unit="ms")
            #df["vip_time"] = pd.to_datetime(df["vip_time"], unit="ms")
            
            # creating the columns to excel - api_data2
            extracted_data = [{
                'deviceType': entry.get('deviceType'),
                'lastUpdatedBy': entry.get('lastUpdatedBy'),
                'resourceGroup': entry.get('resourceGroup'),
                'templateClass': entry.get('templateClass'),
                'configType': entry.get('configType'),
                'templateId': entry.get('templateId'),
                'factoryDefault': entry.get('factoryDefault'),
                'templateName': entry.get('templateName'),
                'devicesAttached': entry.get('devicesAttached'),
                'templateDescription': entry.get('templateDescription'),
                'draftMode': entry.get('draftMode'),
                'lastUpdatedOn': entry.get('lastUpdatedOn'),
                'templateAttached': entry.get('templateAttached')
            } for entry in api_data2]

            # Creating dataframe and formatting the date columns
            df2 = pd.DataFrame(extracted_data)
            df2["lastUpdatedOn"] = pd.to_datetime(df2["lastUpdatedOn"], unit="ms")          

            output = BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df1.to_excel(writer, index=False, sheet_name='device_templates')
                workbook = writer.book
                worksheet1 = writer.sheets['device_templates']
                worksheet1.add_table(0, 0, len(df1), len(df1.columns)-1, {
                    'columns': [{'header': column_name} for column_name in df1.columns],
                    'style': 'Table Style Medium 9'
                })
                # setting the width of particular columns
                worksheet1.set_column('A:C', 30)
                worksheet1.set_column('D:ZZ', 20)  

                # DF2 - API_DATA2

                df2.to_excel(writer, index=False, sheet_name='feature_templates')
                workbook = writer.book
                worksheet2 = writer.sheets['feature_templates']
                worksheet2.add_table(0, 0, len(df2), len(df2.columns)-1, {
                    'columns': [{'header': column_name} for column_name in df2.columns],
                    'style': 'Table Style Medium 9'
                })
                # setting the width of particular columns
                worksheet2.set_column('A:C', 30)
                worksheet2.set_column('D:ZZ', 20)  

            data = b64encode(output.getvalue()).decode('utf-8')
            output.close()
            # return encoded_excel
            
            filename = create_filename("Device_template_List", "xlsx")
            return Response({
                "status": 'OK',
                "statusCode": 200,
                "message": "The list of devices",
                "filename": filename,
                "data": [{
                    "type": "application/vnd.ms-excel",
                    "value": data
                }]
            }, status=200)
            
        except Exception as e:
            logging.error(
                "%s: An error occurred: %s", self.__class__.__name__, e
            )
            return Response({
                "status": 'Error',
                "statusCode": 500,
                "message": str(e)
            }, status=500)
        finally:
            logging.debug("Logging out for session: %s", session)
            auth.logout()


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["Device"]))
class mds(generics.GenericAPIView):
    """
    A view to see the mds.
    """

    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request, **kwargs):
        """
        Handles the POST request for retrieving a device  templates variables .
        
        Input for the function
        {
            "devices": [
                ]   
            "params": [
            ],
        }
        """

        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        devices = parsed.data["devices"]
        
        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        host, port, user, password = get_credentials(request)
        auth = Authentication(host=host, port=port, user=user, password=password)
        try:
            session = auth.login()
            logging.debug("Acquired login session: %s", session)

            # Get all edges and templates
            all_edges = get_device_list(session=session, host=host, port=port)
            templates = get_device_templates(session=session, host=host, port=port)
            all_vars = []
            # First, collect all input variables for each template that has devices attached
            template_vars_map = {}
            for template in templates:
                if template.get('devicesAttached', 0) > 0:
                    template_id = template.get('templateId')
                    print(template_id)
                    logging.info(f"Retrieving device input variables for template {template_id}")
                    input_vars = get_device_input_variables(session, host, port, template_id)
                    template_vars_map[template_id] = {
                        "templateName": template.get('templateName'),
                        "input_vars": input_vars
                    }
            for edge in all_edges:
                edge_uuid = edge.get('uuid')
                edge_hostname = edge.get('host-name')
                for template_id, tdata in template_vars_map.items():
                    template_name = tdata["templateName"]
                    input_vars = tdata["input_vars"]
                    for var in input_vars:
                        if var.get('csv-deviceId') == edge_uuid:
                            var_with_template = var.copy()
                            var_with_template = {
                                'host-name': edge_hostname,
                                'templateName': template_name,
                                **var_with_template
                            }
                            var_with_template['templateId'] = template_id
                            var_with_template['attachedTemplateName'] = template_name
                            logging.info(f"Template: {template_name}, ID: {template_id}")
                            logging.info(f"Input variables for {edge_hostname} (uuid: {edge_uuid}):")
                            all_vars.append(var_with_template)

            # Save all_vars to pandas DataFrame and Excel
            if all_vars:
                # Replace "TEMPLATE_IGNORE" with blank in all values
                cleaned_vars = []
                for entry in all_vars:
                    cleaned_entry = {k: ("" if v == "TEMPLATE_IGNORE" else v) for k, v in entry.items()}
                    cleaned_vars.append(cleaned_entry)
                df = pd.DataFrame(cleaned_vars)
                # Reorder columns: host-name, templateName, then the rest
                cols = ['host-name', 'templateName'] + [c for c in df.columns if c not in ['host-name', 'templateName']]
                df = df[cols]

                output = BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    df.to_excel(writer, index=False, sheet_name='device_template_variables')
                    workbook = writer.book
                    worksheet = writer.sheets['device_template_variables']
                    worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
                        'columns': [{'header': column_name} for column_name in df.columns],
                        'style': 'Table Style Medium 9'
                    })
                    worksheet.set_column('A:C', 30)
                    worksheet.set_column('D:ZZ', 20)

                data = b64encode(output.getvalue()).decode('utf-8')
                output.close()
                filename = create_filename("Device_template_Variables", "xlsx")
                return Response({
                    "status": 'OK',
                    "statusCode": 200,
                    "message": "Device template variables exported",
                    "filename": filename,
                    "data": [{
                        "type": "application/vnd.ms-excel",
                        "value": data
                    }]
                }, status=200)
            else:
                return Response({
                    "status": 'OK',
                    "statusCode": 200,
                    "message": "No device template variables found",
                    "data": []
                }, status=200)
        finally:
            logging.debug("Logging out for session: %s", session)
            auth.logout()




@method_decorator(name="post", decorator=swagger_auto_schema(tags=["Device"]))
class ShowTemplateAttachedDevices(generics.GenericAPIView):
    """
    A view to see the devices attached to device/feature template.
    """

    def get_serializer(self, *args, **kwargs):
        pass

    def get_serializer_class(self):
        pass

    permission_classes = []

    def post(self, request, **kwargs):
        """
        Handles the GET request for retrieving devices attached to device/feature template..
        
        Attributes:
            N/A
        """
        # TODO: Create a logic with input !
        # TODO: Discuss with Peter - output is always empty list, no matter what templateId is used
        # TODO: Create a logic which uses GetDeviceFeatureTemplates function and gets all the templateIds.
        #       These templateIds will be used in a list and list to be used in loop to get all templates and 
        #       devices attached to these templates

        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        host, port, user, password = get_credentials(request)
        auth = Authentication(host=host, port=port, user=user, password=password)
        try:
            session = auth.login()
            logging.debug("Acquired login session: %s", session)

            """ Selecting one of the options as an input for below function:

                --option         
                    templateId to include the string for template Id - obtained from GetDeviceFeatureTemplates

            """
            # other templates: cc86df57-d8dd-4e5c-9c7b-8fb968cf6fcd 31e85503-3ca9-4c09-960e-f260f0d03512 5fec6f16-05fa-4fb2-8180-1cda063afa5d
            templateId = "ec48ed15-6f1d-422e-b4d2-6744f0efedb1"

            data = show_attached_dev_to_device_templates(session=session, host=host, port=port, templateId=templateId)

            logging.debug(data)
            
            return Response({
                "status": 'OK',
                "statusCode": 200,
                "message": "Showing templates/devices:",
                "data": data
            }, status=200)
        
        except Exception as e:
            logging.error(
                "%s: An error occurred: %s", self.__class__.__name__, e
            )
            return Response({
                "status": 'Error',
                "statusCode": 500,
                "message": str(e)
            }, status=500)
        finally:
            logging.debug("Logging out for session: %s", session)
            auth.logout()

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["Tshoot"]))
class ShowDevicesTshoot(generics.GenericAPIView):
    """
    This command is running several API calls for files defined in configuration yaml file. 
    It will gather BFD, control connection, control local properties etc.
    Input is the list of hostnames with particular deviceId
    """

    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request, **kwargs):
        """
        Handles the POST request for retrieving a particular tshoot commands on edge.
        
        Input for the function
        {
            "devices":[
                {
                    "hostname":"4451x_U12_13",
                    "deviceId":"198.18.6.83"
                },
                {   "hostname":"C1100",
                    "deviceId":"198.18.6.18"
                }
            ]
            "params": [
            ],
        }
        """

        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        devices = parsed.data["devices"]

        logging.debug(
            "%s: Incoming get request: %s", self.__class__.__name__, request
        )
        logging.debug("Kwargs: %s", kwargs)
        host, port, user, password = get_credentials(request)
        auth = Authentication(host=host, port=port, user=user, password=password)
        try:
            session = auth.login()
            logging.debug("Acquired login session: %s", session)

            # Inputs and data for function

            dict_api_vEdge = [
                {   # DF1
                    "vEdge_API": "dataservice/device/bfd/sessions?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "BFD SESSION",
                    "file_name": "bfd_sessions",
                    "vEdge_keys": ["vdevice-host-name", "src-ip", "dst-ip", "color", "vdevice-name", "src-port", "system-ip", "dst-port", "site-id", "transitions", "local-color", "uptime", "detect-multiplier", "vdevice-dataKey", "proto", "lastupdated", "state", "tx-interval", "uptime-date"],
                    "cEdge_keys": "TBD",
                },
                {   # DF2
                    "vEdge_API": "dataservice/device/bfd/summary?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "BFD summary",
                    "file_name": "bfd_summary",
                    "vEdge_keys": ["vdevice-host-name", "bfd-sessions-max", "vdevice-dataKey", "bfd-sessions-flap", "vdevice-name", "bfd-sessions-up", "lastupdated", "bfd-sessions-total", "poll-interval"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 3
                    "vEdge_API": "dataservice/device/bfd/tloc?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "BFD TLOC summary list",
                    "file_name": "bfd_tloc_summary_list",
                    "vEdge_keys": ["vdevice-host-name", "sessions-flap", "if-name", "sessions-total", "vdevice-dataKey", "vdevice-name", "lastupdated", "encap", "sessions-up"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 4
                    "vEdge_API": "dataservice/device/bfd/history?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "BFD history",
                    "file_name": "bfd_history",
                    "vEdge_keys": ["vdevice-host-name", "dst-ip", "src-ip", "color", "tx-pkts", "vdevice-name", "src-port", "time-date", "system-ip", "index", "dst-port", "del", "site-id", "vdevice-dataKey", "proto", "lastupdated", "time", "state", "rx-pkts"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 5
                    "vEdge_API": "dataservice/device/control/connections?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "Control connection",
                    "file_name": "control_connection",
                    "vEdge_keys": ["vdevice-host-name", "domain-id", "instance", "vdevice-name", "behind-proxy", "system-ip", "remote-color", "site-id", "private-port", "controller-group-id", "local-color", "uptime", "peer-type", "protocol", "vdevice-dataKey", "public-ip", "public-port", "lastupdated", "state", "private-ip", "uptime-date"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 6
                    "vEdge_API": "dataservice/device/control/localproperties?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "Control local properties",
                    "file_name": "control_local_properties",
                    "vEdge_keys": ["vdevice-host-name", "retry-interval", "vdevice-name", "tls-port", "max-controllers", "system-ip", "certificate-not-valid-before", "time-since-port-hop", "site-id", "certificate-not-valid-after", "uuid", "number-active-wan-interfaces", "protocol", "board-serial", "vsmart-list-version", "certificate-status", "device-type", "port-hopped", "organization-name", "root-ca-chain-status", "domain-id", "dns-name", "sp-organization-name", "register-interval", "token", "keygen-interval", "vdevice-dataKey", "certificate-validity", "lastupdated", "number-vbond-peers"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 7
                    "vEdge_API": "dataservice/device/control/connectionshistory?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "Control connection history",
                    "file_name": "control_connection_history",
                    "vEdge_keys": ["vdevice-host-name", "instance", "vdevice-name", "remote_enum-desc", "system-ip", "remote-color", "site-id", "uuid", "peer-type", "protocol", "state", "private-ip", "local_enum-desc", "domain-id", "rep-count", "index", "private-port", "local-color", "downtime", "vdevice-dataKey", "public-ip", "downtime-date", "remote_enum", "public-port", "lastupdated", "local_enum"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 8
                    "vEdge_API": "dataservice/device/dpi/summary?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "DPI summary",
                    "file_name": "dpi_summary",
                    "vEdge_keys": ["vdevice-host-name", "flows-expired", "vdevice-dataKey", "flows-created", "vdevice-name", "current-flows", "peak-rate", "current-rate", "lastupdated", "status", "peak-flows"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 9
                    "vEdge_API": "dataservice/device/interface/stats?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "Interface statisticss",
                    "file_name": "interface_statistics",
                    "vEdge_keys": ["vdevice-host-name", "vdevice-name", "rx-packets", "rx-errors", "tx-kbps", "tx-errors", "tx-pps", "vpn-id", "dot1x-rx-pkts", "tx-drops", "ipv6-address", "dot1x-tx-pkts", "ip-address", "vdevice-dataKey", "ifname", "rx-pps", "tx-octets", "tx-packets", "af-type", "rx-octets", "rx-kbps", "lastupdated"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 12
                    "vEdge_API": "dataservice/device/omp/summary?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "OMP summary",
                    "file_name": "omp_summary",
                    "vEdge_keys": ["vdevice-host-name", "tlocs-sent", "policy-sent", "mcast-routes-sent", "packets-sent", "vdevice-name", "inform-sent", "packets-received", "routes-received", "tlocs-received", "mcast-routes-installed", "update-sent", "devicetype", "mcast-routes-received", "hello-received", "alert-sent", "update-received", "vsmart-peers", "operstate", "policy-received", "handshake-received", "handshake-sent", "alert-received", "services-sent", "inform-received", "vdevice-dataKey", "tlocs-installed", "services-installed", "ompuptime", "services-received", "lastupdated", "routes-sent", "hello-sent", "routes-installed", "adminstate"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 13
                    "vEdge_API": "dataservice/device/omp/peers?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "OMP peers",
                    "file_name": "omp_peers",
                    "vEdge_keys": ["vdevice-host-name", "domain-id", "vdevice-name", "refresh", "site-id", "type", "up-time-date", "vdevice-dataKey", "peer", "up-time", "legit", "lastupdated", "state"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 14
                    "vEdge_API": "dataservice/device/omp/routes/advertised?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "OMP advertised tlocs",
                    "file_name": "omp_advertsied_tlocs",
                    "vEdge_keys": ["vdevice-host-name", "overlay-id", "color", "vdevice-name", "prefix", "ip", "label", "encap", "site-id", "originator", "vpn-id", "path-id", "protocol", "vdevice-dataKey", "metric", "lastupdated", "to-peer"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 15
                    "vEdge_API": "dataservice/device/tunnel/bfd_statistics?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "Tunnel BFD statistics",
                    "file_name": "tunnel_bfd_statistics",
                    "vEdge_keys": ["vdevice-host-name", "dest-ip", "source-port", "bfd-echo-rx-pkts", "vdevice-name", "bfd-pmtu-tx-octets", "bfd-echo-tx-octets", "bfd-pmtu-rx-octets", "tunnel-protocol", "bfd-pmtu-tx-pkts", "dest-port", "vdevice-dataKey", "lastupdated", "source-ip", "bfd-echo-tx-pkts", "bfd-pmtu-rx-pkts", "bfd-echo-rx-octets"],
                    "cEdge_keys": "TBD",
                },
                {   # DF 16
                    "vEdge_API": "dataservice/device/tunnel/statistics?deviceId=",
                    "cEdge_API": "TBD",
                    "name": "Tunnel  statistics",
                    "file_name": "tunnel_statistics",
                    "vEdge_keys": ["vdevice-host-name", "dest-ip", "source-port", "vdevice-name", "rx_pkts", "system-ip", "tcp-mss-adjust", "remote-color", "tx_octets",  "tunnel-protocol", "local-color", "tx_pkts", "dest-port", "vdevice-dataKey", "rx_octets", "tunnel-mtu", "lastupdated", "source-ip"],
                    "cEdge_keys": "TBD",
                }
            ]
            
            # Getting the input data to proceed with calls
            device_model = "vEdge"  #TODO: in future, cEdges to be added as well, below condition to be updated
            deviceId_fromAPI = get_device_list(session=session, host=host, port=port)
            deviceId = ""
            
            for hostname in deviceId_fromAPI:
                if hostname["host-name"] == devices[0]["hostname"]:
                    deviceId = hostname["deviceId"]   # getting deviceId from hostname input

            try:
                assert devices != []
                for api in dict_api_vEdge:
                    try:
                        if device_model == "vEdge":
                            api_to_be_processed = api['vEdge_API']+deviceId
                            api_to_be_processed_header = api['vEdge_keys']
                        else: # not matched for now - to be added later
                            api_to_be_processed = api['cEdge_API']+deviceId
                            api_to_be_processed_header = api['cEdge_keys']
                        # DF1 settings
                        if api['vEdge_API'] == "dataservice/device/bfd/sessions?deviceId=":
                            df1_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df1_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'vEdge_keys': entry.get('vEdge_keys'),
                                'src-ip': entry.get('src-ip'),
                                'dst-ip': entry.get('dst-ip'),
                                'color': entry.get('color'),
                                'src-port': entry.get('src-port'),
                                'dst-port': entry.get('dst-port'),
                                'site-id': entry.get('site-id'),
                                'transitions': entry.get('transitions'),
                                'local-color': entry.get('local-color'),
                                'uptime': entry.get('uptime'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'detect-multiplier': entry.get('detect-multiplier'),
                                'proto': entry.get('proto'),
                                'lastupdated': entry.get('lastupdated'),
                                'state': entry.get('state'),
                                'tx-interval': entry.get('tx-interval'),
                                'uptime-date': entry.get('uptime-date')
                            } for entry in df1_data]
                            # Creating dataframe and formatting the date columns
                            df1 = pd.DataFrame(extracted_data)
                            df1["lastupdated"] = pd.to_datetime(df1["lastupdated"], unit="ms")
                            df1["uptime-date"] = pd.to_datetime(df1["uptime-date"], unit="ms")
                        
                        # DF2 settings
                        elif api['vEdge_API'] == "dataservice/device/bfd/summary?deviceId=":
                                df2_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                                df2_name = api['name']

                                # creating the columns to excel based on user input
                                extracted_data = [{
                                    'vdevice-host-name': entry.get('vdevice-host-name'),
                                    'bfd-sessions-max': entry.get('bfd-sessions-max'),
                                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                    'bfd-sessions-flap': entry.get('bfd-sessions-flap'),
                                    'vdevice-name': entry.get('vdevice-name'),
                                    'bfd-sessions-up': entry.get('bfd-sessions-up'),
                                    'lastupdated': entry.get('lastupdated'),
                                    'bfd-sessions-total': entry.get('bfd-sessions-total'),
                                    'poll-interval': entry.get('poll-interval')
                                } for entry in df2_data]

                                # Creating dataframe and formatting the date columns
                                df2 = pd.DataFrame(extracted_data)
                                df2["lastupdated"] = pd.to_datetime(df2["lastupdated"], unit="ms")
                        # DF3 settings
                        elif api['vEdge_API'] == "dataservice/device/bfd/tloc?deviceId=":
                                df3_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                                df3_name = api['name']

                                # creating the columns to excel based on user input
                                extracted_data = [{
                                    'vdevice-host-name': entry.get('vdevice-host-name'),
                                    'sessions-flap': entry.get('sessions-flap'),
                                    'if-name': entry.get('if-name'),
                                    'sessions-total': entry.get('sessions-total'),
                                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                    'vdevice-name': entry.get('vdevice-name'),
                                    'lastupdated': entry.get('lastupdated'),
                                    'encap': entry.get('encap'),
                                    'sessions-up': entry.get('sessions-up')
                                } for entry in df3_data]

                                # Creating dataframe and formatting the date columns
                                df3 = pd.DataFrame(extracted_data)
                                df3["lastupdated"] = pd.to_datetime(df3["lastupdated"], unit="ms")
                        # DF4 settings
                        elif api['vEdge_API'] == "dataservice/device/bfd/history?deviceId=":
                                df4_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                                df4_name = api['name']

                                extracted_data = [{
                                    'vdevice-host-name': entry.get('vdevice-host-name'),
                                    'dst-ip': entry.get('dst-ip'),
                                    'src-ip': entry.get('src-ip'),
                                    'color': entry.get('color'),
                                    'tx-pkts': entry.get('tx-pkts'),
                                    'vdevice-name': entry.get('vdevice-name'),
                                    'src-port': entry.get('src-port'),
                                    'time-date': entry.get('time-date'),
                                    'system-ip': entry.get('system-ip'),
                                    'index': entry.get('index'),
                                    'dst-port': entry.get('dst-port'),
                                    'del': entry.get('del'),
                                    'site-id': entry.get('site-id'),
                                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                    'proto': entry.get('proto'),
                                    'lastupdated': entry.get('lastupdated'),
                                    'time': entry.get('time'),
                                    'state': entry.get('state'),
                                    'rx-pkts': entry.get('rx-pkts'),
                                    'sessions-up': entry.get('sessions-up')
                                } for entry in df4_data]

                                # Creating dataframe and formatting the date columns
                                df4 = pd.DataFrame(extracted_data)
                                df4["lastupdated"] = pd.to_datetime(df4["lastupdated"], unit="ms")
                                df4["time-date"] = pd.to_datetime(df4["time-date"], unit="ms")
                                df4["time"] = pd.to_datetime(df4["time"])
                                df4['time'] = df4['time'].apply(lambda a: datetime.strftime(a,"%Y-%m-%d %H:%M:%S"))
                                df4['time'] = pd.to_datetime(df4['time'])
                                
                        # DF5 settings
                        elif api['vEdge_API'] == "dataservice/device/control/connections?deviceId=":
                                df5_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                                df5_name = api['name']

                                # creating the columns to excel based on user input
                                extracted_data = [{
                                    'vdevice-host-name': entry.get('vdevice-host-name'),
                                    'domain-id': entry.get('domain-id'),
                                    'instance': entry.get('instance'),
                                    'vdevice-name': entry.get('vdevice-name'),
                                    'behind-proxy': entry.get('behind-proxy'),
                                    'remote-color': entry.get('remote-color'),
                                    'system-ip': entry.get('system-ip'),
                                    'site-id': entry.get('site-id'),
                                    'private-port': entry.get('private-port'),
                                    'controller-group-id': entry.get('controller-group-id'),
                                    'local-color': entry.get('local-color'),
                                    'uptime': entry.get('uptime'),
                                    'peer-type': entry.get('peer-type'),
                                    'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                    'protocol': entry.get('protocol'),
                                    'public-ip': entry.get('public-ip'),
                                    'public-port': entry.get('public-port'),
                                    'lastupdated': entry.get('lastupdated'),
                                    'state': entry.get('state'),
                                    'private-ip': entry.get('private-ip'),
                                    'uptime-date': entry.get('uptime-date')
                                } for entry in df5_data]

                                # Creating dataframe and formatting the date columns
                                df5 = pd.DataFrame(extracted_data)
                                df5["lastupdated"] = pd.to_datetime(df5["lastupdated"], unit="ms")
                                df5["uptime-date"] = pd.to_datetime(df5["uptime-date"], unit="ms")
                        # DF6 settings
                        elif api['vEdge_API'] == "dataservice/device/control/localproperties?deviceId=":
                            df6_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df6_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'retry-interval': entry.get('retry-interval'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'tls-port': entry.get('tls-port'),
                                'max-controllers': entry.get('max-controllers'),
                                'system-ip': entry.get('system-ip'),
                                'certificate-not-valid-before': entry.get('certificate-not-valid-before'),
                                'time-since-port-hop': entry.get('time-since-port-hop'),
                                'site-id': entry.get('site-id'),
                                'certificate-not-valid-after': entry.get('certificate-not-valid-after'),
                                'uuid': entry.get('uuid'),
                                'number-active-wan-interfaces': entry.get('number-active-wan-interfaces'),
                                'protocol': entry.get('protocol'),
                                'board-serial': entry.get('board-serial'),
                                'vsmart-list-version': entry.get('vsmart-list-version'),
                                'certificate-status': entry.get('certificate-status'),
                                'device-type': entry.get('device-type'),
                                'port-hopped': entry.get('port-hopped'),
                                'organization-name': entry.get('organization-name'),
                                'root-ca-chain-status': entry.get('root-ca-chain-status'),
                                'domain-id': entry.get('domain-id'),
                                'dns-name': entry.get('dns-name'),
                                'sp-organization-name': entry.get('sp-organization-name'),
                                'register-interval': entry.get('register-interval'),
                                'token': entry.get('token'),
                                'keygen-interval': entry.get('keygen-interval'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'certificate-validity': entry.get('certificate-validity'),
                                'lastupdated': entry.get('lastupdated'),
                                'number-vbond-peer': entry.get('number-vbond-peer')
                            } for entry in df6_data]
                            # Creating dataframe and formatting the date columns
                            df6 = pd.DataFrame(extracted_data)
                            df6["lastupdated"] = pd.to_datetime(df6["lastupdated"], unit="ms")
                        
                        # DF7 settings
                        elif api['vEdge_API'] == "dataservice/device/control/connectionshistory?deviceId=":
                            df7_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df7_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'instance': entry.get('instance'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'remote_enum-desc': entry.get('remote_enum-desc'),
                                'system-ip': entry.get('system-ip'),
                                'remote-color': entry.get('remote-color'),
                                'site-id': entry.get('site-id'),
                                'uuid': entry.get('uuid'),
                                'peer-type': entry.get('peer-type'),
                                'protocol': entry.get('protocol'),
                                'state': entry.get('state'),
                                'private-ip': entry.get('private-ip'),
                                'local_enum-desc': entry.get('local_enum-desc'),
                                'domain-id': entry.get('domain-id'),
                                'rep-count': entry.get('rep-count'),
                                'index': entry.get('index'),
                                'private-port': entry.get('private-port'),
                                'local-color': entry.get('local-color'),
                                'downtime': entry.get('downtime'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'public-ip': entry.get('public-ip'),
                                'downtime-date': entry.get('downtime-date'),
                                'remote_enum': entry.get('remote_enum'),
                                'public-port': entry.get('public-port'),
                                'lastupdated': entry.get('lastupdated'),
                                'local_enum': entry.get('local_enum')
                            } for entry in df7_data]
                            # Creating dataframe and formatting the date columns
                            df7 = pd.DataFrame(extracted_data)
                            df7["lastupdated"] = pd.to_datetime(df7["lastupdated"], unit="ms")
                            df7["downtime"] = pd.to_datetime(df7["downtime"])
                            df7['downtime'] = df7['downtime'].apply(lambda a: datetime.strftime(a,"%Y-%m-%d %H:%M:%S"))
                            df7['downtime'] = pd.to_datetime(df7['downtime'])
                            df7["downtime-date"] = pd.to_datetime(df7["downtime-date"], unit="ms")
                            
                        # DF8 settings
                        elif api['vEdge_API'] == "dataservice/device/dpi/summary?deviceId=":
                            df8_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df8_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'flows-expired': entry.get('flows-expired'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'flows-created': entry.get('flows-created'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'current-flows': entry.get('current-flows'),
                                'peak-rate': entry.get('peak-rate'),
                                'current-rate': entry.get('current-rate'),
                                'lastupdated': entry.get('lastupdated'),
                                'status': entry.get('status'),
                                'peak-flows': entry.get('peak-flows')
                            } for entry in df8_data]
                            # Creating dataframe and formatting the date columns
                            df8 = pd.DataFrame(extracted_data)
                            df8["lastupdated"] = pd.to_datetime(df8["lastupdated"], unit="ms")
                        # DF9 settings
                        elif api['vEdge_API'] == "dataservice/device/interface/stats?deviceId=":
                            df9_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df9_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'rx-packets': entry.get('rx-packets'),
                                'rx-errors': entry.get('rx-errors'),
                                'tx-kbps': entry.get('tx-kbps'),
                                'tx-errors': entry.get('tx-errors'),
                                'tx-pps': entry.get('tx-pps'),
                                'vpn-id': entry.get('vpn-id'),
                                'dot1x-rx-pkts': entry.get('dot1x-rx-pkts'),
                                'tx-drops': entry.get('tx-drops'),
                                'ipv6-address': entry.get('ipv6-address'),
                                'dot1x-tx-pkts': entry.get('dot1x-tx-pkts'),
                                'ip-address': entry.get('ip-address'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'ifname': entry.get('ifname'),
                                'rx-pps': entry.get('rx-pps'),
                                'tx-octets': entry.get('tx-octets'),
                                'tx-packets': entry.get('tx-packets'),
                                'af-type': entry.get('af-type'),
                                'rx-octets': entry.get('rx-octets'),
                                'rx-kbps': entry.get('rx-kbps'),
                                'lastupdated': entry.get('lastupdated')
                            } for entry in df9_data]
                            # Creating dataframe and formatting the date columns
                            df9 = pd.DataFrame(extracted_data)
                            df9["lastupdated"] = pd.to_datetime(df9["lastupdated"], unit="ms")                 
                        # DF10 settings
                        elif api['vEdge_API'] == "dataservice/device/omp/summary?deviceId=":
                            df10_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df10_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'tlocs-sent': entry.get('tlocs-sent'),
                                'policy-sent': entry.get('policy-sent'),
                                'mcast-routes-sent': entry.get('mcast-routes-sent'),
                                'packets-sent': entry.get('packets-sent'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'inform-sent': entry.get('inform-sent'),
                                'packets-received': entry.get('packets-received'),
                                'routes-received': entry.get('routes-received'),
                                'tlocs-received': entry.get('tlocs-received'),
                                'mcast-routes-installed': entry.get('mcast-routes-installed'),
                                'update-sent': entry.get('update-sent'),
                                'devicetype': entry.get('devicetype'),
                                'mcast-routes-received': entry.get('mcast-routes-received'),
                                'hello-received': entry.get('hello-received'),
                                'alert-sent': entry.get('alert-sent'),
                                'update-received': entry.get('update-received'),
                                'vsmart-peers': entry.get('vsmart-peers'),
                                'operstate': entry.get('operstate'),
                                'policy-received': entry.get('policy-received'),
                                'handshake-received': entry.get('handshake-received'),
                                'handshake-sent': entry.get('handshake-sent'),
                                'alert-received': entry.get('alert-received'),
                                'services-sent': entry.get('services-sent'),
                                'inform-received': entry.get('inform-received'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'tlocs-installed': entry.get('tlocs-installed'),
                                'services-installed': entry.get('services-installed'),
                                'ompuptime': entry.get('ompuptime'),
                                'services-received': entry.get('services-received'),
                                'lastupdated': entry.get('lastupdated'),
                                'routes-sent': entry.get('routes-sent'),
                                'hello-sent': entry.get('hello-sent'),
                                'routes-installed': entry.get('routes-installed'),
                                'adminstate': entry.get('adminstate')
                            } for entry in df10_data]
                            # Creating dataframe and formatting the date columns
                            df10 = pd.DataFrame(extracted_data)
                            df10["lastupdated"] = pd.to_datetime(df10["lastupdated"], unit="ms")    
                        # DF11 settings
                        elif api['vEdge_API'] == "dataservice/device/omp/peers?deviceId=":
                            df11_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df11_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'domain-id': entry.get('domain-id'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'refresh': entry.get('refresh'),
                                'site-id': entry.get('site-id'),
                                'type': entry.get('type'),
                                'up-time-date': entry.get('up-time-date'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'peer': entry.get('peer'),
                                'up-time': entry.get('up-time'),
                                'legit': entry.get('legit'),
                                'state': entry.get('state'),
                                'lastupdated': entry.get('lastupdated')
                            } for entry in df11_data]
                            # Creating dataframe and formatting the date columns
                            df11 = pd.DataFrame(extracted_data)
                            df11["lastupdated"] = pd.to_datetime(df11["lastupdated"], unit="ms")
                            df11["up-time-date"] = pd.to_datetime(df11["up-time-date"], unit="ms")     
                        # DF12 settings
                        elif api['vEdge_API'] == "dataservice/device/omp/routes/advertised?deviceId=":
                            df12_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df12_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'overlay-id': entry.get('overlay-id'),
                                'color': entry.get('color'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'prefix': entry.get('prefix'),
                                'ip': entry.get('ip'),
                                'label': entry.get('label'),
                                'encap': entry.get('encap'),
                                'site-id': entry.get('site-id'),
                                'originator': entry.get('originator'),
                                'vpn-id': entry.get('vpn-id'),
                                'path-id': entry.get('path-id'),
                                'protocol': entry.get('protocol'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'metric': entry.get('metric'),
                                'lastupdated': entry.get('lastupdated'),
                                'to-peer': entry.get('to-peer')
                            } for entry in df12_data]
                            # Creating dataframe and formatting the date columns
                            df12 = pd.DataFrame(extracted_data)
                            df12["lastupdated"] = pd.to_datetime(df12["lastupdated"], unit="ms")  
                        # DF13 settings
                        elif api['vEdge_API'] == "dataservice/device/tunnel/bfd_statistics?deviceId=":
                            df13_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df13_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'dest-ip': entry.get('dest-ip'),
                                'source-port': entry.get('source-port'),
                                'bfd-echo-rx-pkts': entry.get('bfd-echo-rx-pkts'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'bfd-pmtu-tx-octets': entry.get('bfd-pmtu-tx-octets'),
                                'bfd-echo-tx-octets': entry.get('bfd-echo-tx-octets'),
                                'bfd-pmtu-rx-octets': entry.get('bfd-pmtu-rx-octets'),
                                'tunnel-protocol': entry.get('tunnel-protocol'),
                                'bfd-pmtu-tx-pkts': entry.get('bfd-pmtu-tx-pkts'),
                                'dest-port': entry.get('dest-port'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'lastupdated': entry.get('lastupdated'),
                                'source-ip': entry.get('source-ip'),
                                'bfd-echo-tx-pkts': entry.get('bfd-echo-tx-pkts'),
                                'bfd-pmtu-rx-pkts': entry.get('bfd-pmtu-rx-pkts'),
                                'bfd-echo-rx-octets': entry.get('bfd-echo-rx-octets')
                            } for entry in df13_data]
                            # Creating dataframe and formatting the date columns
                            df13 = pd.DataFrame(extracted_data)
                            df13["lastupdated"] = pd.to_datetime(df13["lastupdated"], unit="ms") 
                        # DF14 settings
                        elif api['vEdge_API'] == "dataservice/device/tunnel/statistics?deviceId=":
                            df14_data = get_tshoot_outputs(session=session, host=host, port=port, api=api_to_be_processed)
                            df14_name = api['name']
                            # creating the columns to excel based on user input
                            extracted_data = [{
                                'vdevice-host-name': entry.get('vdevice-host-name'),
                                'dest-ip': entry.get('dest-ip'),
                                'source-port': entry.get('source-port'),
                                'vdevice-name': entry.get('vdevice-name'),
                                'rx_pkts': entry.get('rx_pkts'),
                                'system-ip': entry.get('system-ip'),
                                'tcp-mss-adjust': entry.get('tcp-mss-adjust'),
                                'remote-color': entry.get('remote-color'),
                                'tx_octets': entry.get('tx_octets'),
                                'tunnel-protocol': entry.get('tunnel-protocol'),
                                'local-color': entry.get('local-color'),
                                'tx_pkts': entry.get('tx_pkts'),
                                'dest-port': entry.get('dest-port'),
                                'vdevice-dataKey': entry.get('vdevice-dataKey'),
                                'rx_octets': entry.get('rx_octets'),
                                'tunnel-mtu': entry.get('tunnel-mtu'),
                                'lastupdated': entry.get('lastupdated'),
                                'source-ip': entry.get('source-ip')
                            } for entry in df14_data]
                            # Creating dataframe and formatting the date columns
                            df14 = pd.DataFrame(extracted_data)
                            df14["lastupdated"] = pd.to_datetime(df14["lastupdated"], unit="ms") 
                    except Exception as e:
                        logging.error("%s: An error occurred: %s", self.__class__.__name__, e)

                    # Formatting excel data for all DFs
                output = BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:

                        # DF1 settings
                        df1.to_excel(writer, index=False, sheet_name=df1_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df1_name]
                        worksheet.add_table(0, 0, len(df1), len(df1.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df1.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF2 settings
                        df2.to_excel(writer, index=False, sheet_name=df2_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df2_name]
                        worksheet.add_table(0, 0, len(df2), len(df2.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df2.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF3 settings
                        df3.to_excel(writer, index=False, sheet_name=df3_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df3_name]
                        worksheet.add_table(0, 0, len(df3), len(df3.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df3.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF4 settings
                        df4.to_excel(writer, index=False, sheet_name=df4_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df4_name]
                        worksheet.add_table(0, 0, len(df4), len(df4.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df4.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF5 settings
                        df5.to_excel(writer, index=False, sheet_name=df5_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df5_name]
                        worksheet.add_table(0, 0, len(df5), len(df5.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df5.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF6 settings
                        df6.to_excel(writer, index=False, sheet_name=df6_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df6_name]
                        worksheet.add_table(0, 0, len(df6), len(df6.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df6.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF7 settings
                        df7.to_excel(writer, index=False, sheet_name=df7_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df7_name]
                        worksheet.add_table(0, 0, len(df7), len(df7.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df7.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF8 settings
                        df8.to_excel(writer, index=False, sheet_name=df8_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df8_name]
                        worksheet.add_table(0, 0, len(df8), len(df8.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df8.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF9 settings
                        df9.to_excel(writer, index=False, sheet_name=df9_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df9_name]
                        worksheet.add_table(0, 0, len(df9), len(df9.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df9.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF10 settings
                        df10.to_excel(writer, index=False, sheet_name=df10_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df10_name]
                        worksheet.add_table(0, 0, len(df10), len(df10.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df10.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF11 settings
                        df11.to_excel(writer, index=False, sheet_name=df11_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df11_name]
                        worksheet.add_table(0, 0, len(df11), len(df11.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df11.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF12 settings
                        df12.to_excel(writer, index=False, sheet_name=df12_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df12_name]
                        worksheet.add_table(0, 0, len(df12), len(df12.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df12.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF13 settings
                        df13.to_excel(writer, index=False, sheet_name=df13_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df13_name]
                        worksheet.add_table(0, 0, len(df13), len(df13.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df13.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                        # DF14 settings
                        df14.to_excel(writer, index=False, sheet_name=df14_name)
                        workbook = writer.book
                        worksheet = writer.sheets[df14_name]
                        worksheet.add_table(0, 0, len(df14), len(df14.columns)-1, {
                            'columns': [{'header': column_name} for column_name in df14.columns],
                            'style': 'Table Style Medium 9'
                        })
                        # setting the width of particular columns
                        worksheet.set_column('A:C', 30)
                        worksheet.set_column('D:ZZ', 20) 

                data = b64encode(output.getvalue()).decode('utf-8')
                output.close()

            except Exception as e:
                logging.error("ERROR with data provided, please check!")
                logging.error(
                "%s: An error occurred: %s", self.__class__.__name__, e
            )

            filename = create_filename("Device_Tshoot", "xlsx")
            return Response({
                "status": 'OK',
                "statusCode": 200,
                "message": "The list of devices",
                "filename": filename,
                "data": [{
                    "type": "application/vnd.ms-excel",
                    "value": data
                }]
            }, status=200)
        
        except Exception as e:
            logging.error(
                "%s: An error occurred: %s", self.__class__.__name__, e
            )
            return Response({
                "status": 'Error',
                "statusCode": 500,
                "message": str(e)
            }, status=500)
        
        finally:
            logging.debug("Logging out for session: %s", session)
            auth.logout()
