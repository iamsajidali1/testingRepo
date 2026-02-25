""" general view module """
import logging
import sys
import base64
import json
import uuid
import time
from rest_framework import generics
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from drf_yasg.utils import swagger_auto_schema
from jsonpath_ng import ext
import pandas as pd
from api import serializers
from api.docs_mds import mds_generate
from datetime import datetime
from api.docs_other import ( site_list, link_report, qoe_report,
                            inventory_report, route_report,create_edge_performance_file,bgp_from_gw_neighbor_routes,
                            css_location_report, create_tunnels_file , publicIpExportDoc, all_msim_license, all_tunnels_info, sephora_list_paths, vcg_migration, application_report, staticRoutesExportDoc ,ge5_flows_report, gaming_application_report,event_logs_parse,max_troughput_report,max_agregate_incorrect_input,def_object_group,get_link_statisctics_aggregate,get_link_packet_loss_aggregate)
from api.utils import (
    get_session, resolve_params, get_credentials,
    get_all_edges_configs, create_user, password_reset_user,
    get_applications, get_routable_applications,
    get_edge_config_stack, get_edge_link_series,
    get_qoe_edge, get_enterprise_inventory, get_tenantid_nonmsp,
    get_qoe_edge_month, get_edge_status_series, update_edge_config,
    get_enterprises, get_gateways, get_enterprise_services,get_enterprise_services_full,
    create_edge, update_edge_attributes, create_filename, create_filename_QOE,get_websocket_bgp_from_gateway,
    get_gateway_edge_assignment, get_routes, get_segments, get_edge_status_series_general,
    get_enterprise_edge_list, get_all_events_log, get_qoe_Agregate_month,get_enterprise_bgp_peer_status,
    get_edge_link_serie_utilisation_metrics,get_customer_name_nonmsp, get_edge_status_series_utilisation_metrics,
    get_network_overview_info, calculate_troughput, aggregate_troughput, last_month,calculation_circuit_daily_statistics, assignee_hostname_and_attributes, set_edge_software,
    get_daily_link_statistics, get_licenses, get_toptalkers_edge, get_aggregate_edge_metrics, get_edge_link_daily_series ,get_edge_status_daily_series, calculate_daily_edge_statistics ,get_edge_models, get_all_edges_hostname, 
    get_application_edge ,get_all_edges_licenses, get_websocket, get_all_customers,get_all_ge5_flows, insert_edge_module, update_last_octet ,get_all_edges_configs_only,get_all_edges_wanlinks,get_all_gamings_flows,get_gamingapplication_edge, get_link_Agregate_month,get_link_packet_loss,get_object_groups,aggregate_links,get_aggregate_links_metrics)

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class BillingReport(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "Billing report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        try:
            encodedfile = site_list(all_edges_api)
            filename = create_filename("billing", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"billingReport failed with message: {exception}",
                "userMessage":
                    "Billing report is not finished"
                    })
        return Response({
            "message": "billingReport finished",
            "filename":filename,
            "userMessage":
                "Billing report is finished, it will be sent via email",
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class staticRoutesExport(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api =[]
        all_edges_api = get_all_edges_configs(url, ses, tenant_id)
        all_segments = get_segments(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "staticRoutesExport report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        try:
            encodedfile = staticRoutesExportDoc(all_edges_api, all_segments)
            filename = create_filename("staticRoutesExport", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"staticRoutesExport failed with message: {exception}",
                "userMessage":
                    "staticRoutesExport is not finished"
                    })
        return Response({
            "message": "staticRoutesExport finished",
            "filename":filename,
            "userMessage":
                "staticRoutesExport is finished, it will be sent via email",
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})
@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class publicIpExport(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api =[]
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "staticRoutesExport report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        try:
            encodedfile = publicIpExportDoc(all_edges_api)
            filename = create_filename("publicIpExport", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"publicIpExport  failed with message: {exception}",
                "userMessage":
                    "publicIpExport is not finished"
                    })
        return Response({
            "message": "publicIpExport finished",
            "filename":filename,
            "userMessage":
                "publicIpExport is finished, it will be sent via email",
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})



@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class getEdgeNames(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_hostname(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "Hostnames of customer to feed drop down action ",
                'message':
                    all_edges_api["error"]["message"]
                })
        hostname = [edge['name'] for edge in all_edges_api]
        return Response({"data": hostname})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class LinkMetricReport(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        data = parsed.data
        devices = data["devices"]
        all_edges_api = get_all_edges_configs(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "Link Metric report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        if not devices:
            for edge in all_edges_api:
                data = get_edge_link_series(
                    url, ses, tenant_id, edge["id"])
                # TODO improve with /monitoring/getAggregateEdgeLinkMetrics
                edge["link_s"] = data
                edge["stat"] = get_edge_status_series(
                    url, ses, tenant_id, edge["id"])
                edge["qoe"] = get_qoe_edge_month(
                    url, ses, tenant_id, edge["id"])
                data = get_edge_config_stack(
                    url, ses, tenant_id, edge["id"])
                if data[0]["name"] == "Edge Specific Profile":
                    for module in data[0]["modules"]:
                        if module["name"] == "WAN":
                            edge["wanconfig"] = module
                else:
                    for module in data[1]["modules"]:
                        if module["name"] == "WAN":
                            edge["wanconfig"] = module
        else:
            for device in devices:
                for edge in all_edges_api:
                    if edge["name"] == device["hostname"]:
                        edge["stat"] = get_edge_status_series(
                            url, ses, tenant_id, edge["id"])
                        data = get_edge_link_series(
                            url, ses, tenant_id, edge["id"])
                        edge["link_s"] = data
                        edge["qoe"] = get_qoe_edge_month(
                            url, ses, tenant_id, edge["id"])
                        data = get_edge_config_stack(
                            url, ses, tenant_id, edge["id"])
                        if data[0]["name"] == "Edge Specific Profile":
                            for module in data[0]["modules"]:
                                if module["name"] == "WAN":
                                    edge["wanconfig"] = module
                        else:
                            for module in data[1]["modules"]:
                                if module["name"] == "WAN":
                                    edge["wanconfig"] = module
        try:
            encodedfile = link_report(all_edges_api)
            filename = create_filename("link_report", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"Link report failed with message: {exception}",
                "userMessage":
                    "Link report report is not finished"
                    })
        return Response({
            "message":
                "Link Report finished",
            "userMessage":
                "Link report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class licenses(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_customers = get_all_customers(url, ses)
        data_file = []
        customerList ={}
        if all_customers != "enterpriseaccessonly":
            for item in all_customers:
                if item["enterpriseName"] not in customerList:
                   customerList[item["enterpriseName"]] = item["enterpriseId"]
            # For every customer, we take the enterpriseId and then run the script for all edges

            for customer in customerList:
                tenant_id = customerList.get(customer)
                print("Output with MSP access")
                print( "Getting output from customer -",customer)
                # getting all edges from VCO for customer with respective license
                all_resp = get_all_edges_licenses(url, ses, tenant_id)
                for edge in all_resp:
                    if edge["licenses"] != []:
                        for license in edge["licenses"]:
                            region_raw = license["detail"]
                            license_region = region_raw[12:-14]
                            data_file.append([url, customer, edge["enterpriseId"],edge["name"],edge["logicalId"], license["alias"], license["termMonths"], license["bandwidthTier"], license_region, 
                                        license["edition"], edge["softwareVersion"], edge["factorySoftwareVersion"], edge["serialNumber"], edge["haSerialNumber"],edge["modelNumber"], edge["edgeState"],
                                        edge["activationTime"], edge["haState"], edge["site"]["streetAddress"], edge["site"]["streetAddress2"],
                                        edge["site"]["state"], edge["site"]["postalCode"], edge["site"]["country"] ])
                    else:
                        empty_list = []
                        data_file.append([url, customer, edge["enterpriseId"],edge["name"],edge["logicalId"], empty_list, empty_list, empty_list, empty_list, 
                                    empty_list, edge["softwareVersion"], edge["factorySoftwareVersion"], edge["serialNumber"], edge["haSerialNumber"], edge["modelNumber"], edge["edgeState"],
                                    edge["activationTime"], edge["haState"], edge["site"]["streetAddress"], edge["site"]["streetAddress2"],
                                    edge["site"]["state"], edge["site"]["postalCode"], edge["site"]["country"] ])
            return Response({"data": data_file})
        else:
            customer = get_customer_name_nonmsp(url, ses)
            all_resp = get_all_edges_licenses(url, ses, tenant_id)
            print("Output with non MSP access")
            for edge in all_resp:
                if edge["licenses"] != []:
                    for license in edge["licenses"]:
                        region_raw = license["detail"]
                        license_region = region_raw[12:-14]
                        data_file.append([url, customer, edge["enterpriseId"],edge["name"],edge["logicalId"], license["alias"], license["termMonths"], license["bandwidthTier"], license_region, 
                                    license["edition"], edge["softwareVersion"], edge["factorySoftwareVersion"], edge["serialNumber"], edge["haSerialNumber"],edge["modelNumber"], edge["edgeState"],
                                    edge["activationTime"], edge["haState"], edge["site"]["streetAddress"], edge["site"]["streetAddress2"],
                                    edge["site"]["state"], edge["site"]["postalCode"], edge["site"]["country"] ])
                else:
                    empty_list = []
                    data_file.append([url, customer, edge["enterpriseId"],edge["name"],edge["logicalId"], empty_list, empty_list, empty_list, empty_list, 
                                empty_list, edge["softwareVersion"], edge["factorySoftwareVersion"], edge["serialNumber"], edge["haSerialNumber"], edge["modelNumber"], edge["edgeState"],
                                edge["activationTime"], edge["haState"], edge["site"]["streetAddress"], edge["site"]["streetAddress2"],
                                edge["site"]["state"], edge["site"]["postalCode"], edge["site"]["country"] ])
            return Response({"data": data_file})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class siteInfoDetail(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs(url, ses, tenant_id)
        data_file = []
        for edge in all_edges_api:
            if edge["licenses"] != []:
                for license in edge["licenses"]:
                    profilename = edge["configuration"].get("enterprise", {}).get("name", "N/A")
                    data_file.append([
                        edge["enterpriseId"], 
                        edge["name"], 
                        edge["logicalId"], 
                        edge["id"], 
                        edge["site"]["state"], 
                        edge["site"]["postalCode"], 
                        edge["site"]["country"],
                        edge["site"]["streetAddress"], 
                        edge["site"]["streetAddress2"],
                        edge["isHub"], 
                        edge["haState"], 
                        edge["deviceFamily"], 
                        edge["modelNumber"], 
                        profilename, 
                        edge["customInfo"], 
                        edge["description"], 
                        edge["platformFirmwareVersion"], 
                        license["alias"], 
                        edge["softwareVersion"], 
                        edge["factorySoftwareVersion"], 
                        edge["serialNumber"], 
                        edge["haSerialNumber"], 
                        edge["edgeState"],
                        edge["activationTime"],    
                        edge["activationKey"], 
                        edge["activationState"]
                    ])
            else:
                empty_list = []
                profilename = edge["configuration"].get("enterprise", {}).get("name", "N/A")
                data_file.append([ 
                        edge["enterpriseId"], 
                        edge["name"], 
                        edge["logicalId"], 
                        edge["id"], 
                        edge["site"]["state"], 
                        edge["site"]["postalCode"], 
                        edge["site"]["country"], 
                        edge["site"]["streetAddress"], 
                        edge["site"]["streetAddress2"],
                        edge["isHub"], 
                        edge["haState"], 
                        edge["deviceFamily"], 
                        edge["modelNumber"], 
                        profilename, 
                        edge["customInfo"], 
                        edge["description"], 
                        edge["platformFirmwareVersion"], 
                        empty_list, 
                        edge["softwareVersion"], 
                        edge["factorySoftwareVersion"], 
                        edge["serialNumber"], 
                        edge["haSerialNumber"], 
                        edge["edgeState"],
                        edge["activationTime"],    
                        edge["activationKey"], 
                        edge["activationState"]
                                  ])
        return Response({"data": data_file})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class aggregatedLinksStatistics(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        print(params)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        data = parsed.data
        for param in params:
            if param["name"] == "timestart":
                timestart = str(param["value"])
            if param["name"] == "timeend":
                timeend = str(param["value"])  
                break
        all_edges_api = get_all_edges_wanlinks(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage": "Link Metric report failed to finish",
                'message': all_edges_api["error"]["message"]
            })
        Aggregated_Link_statistics = aggregate_links(get_aggregate_links_metrics(url, ses, tenant_id, timestart, timeend),all_edges_api)
        return Response({
            "data": Aggregated_Link_statistics,
            "timeSeries": {
                "startTime": timestart,
                "endTime": timeend
            }
        })
        
@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class aggregatedEdgeStatistics(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_licenses(url, ses, tenant_id)
        data = parsed.data
        for param in params:
            if param["name"] == "timestart":
                timestart = str(param["value"])
                break
        Aggregated_edge_statistics = assignee_hostname_and_attributes( all_edges_api, get_aggregate_edge_metrics(url, ses, tenant_id, timestart)) 
        return Response({
            "data": Aggregated_edge_statistics,
            "timeSeries": {
                "startTime": timestart,
                "endTime": None
            }
        })


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class UtilisationMetrics(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    use on Tenant level
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        Day = 1
        for param in params:
            if param["name"] == "timeframe":
                Day = int(param["value"])
                break
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        data = parsed.data
        devices = data["devices"]
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage": "Link Metric report failed to finish",
                'message': all_edges_api["error"]["message"]
            })
        if not devices:
            for edge in all_edges_api:
                edge["link_s"] = get_edge_link_serie_utilisation_metrics(url, ses, tenant_id, edge["id"], Day)
                edge["aggregate"] = aggregate_troughput(edge["link_s"])
                edge["stat"] = get_edge_status_series_utilisation_metrics(url, ses, tenant_id, edge["id"], Day)
                edge["hwmodel"] ={"hwmodel", edge["modelNumber"]}
                lat = edge.get('site', {}).get('lat', 0) 
                lon = edge.get('site', {}).get('lon', 0) 
                edge["location"] = {"latitude": lat, "longitude": lon}
            return Response({"data": [[edge['name'], edge["stat"], edge['link_s'],edge["aggregate"], edge["hwmodel"], edge["location"]] for edge in all_edges_api]})
        else:
            for device in devices:
                for edge in all_edges_api:
                    if edge["name"] == device["hostname"]:
                        edge["link_s"] = calculate_troughput(get_edge_link_serie_utilisation_metrics(url, ses, tenant_id, edge["id"], Day))
                        edge["aggregate"] = aggregate_troughput(edge["link_s"])
                        edge["stat"] = get_edge_status_series_utilisation_metrics(url, ses, tenant_id, edge["id"], Day)
                        edge["hwmodel"] = {"hwmodel": edge["modelNumber"]}
                        lat = edge.get('site', {}).get('lat', 0) 
                        lon = edge.get('site', {}).get('lon', 0) 
                        edge["location"] = {"latitude": lat, "longitude": lon}
            return Response({
                "data": [
                    [edge['name'], edge["stat"], edge['link_s'],edge["aggregate"], edge["hwmodel"], edge["location"]]
                    for edge in all_edges_api
                    if edge["name"] in [device["hostname"] for device in devices]
                ]
            })

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class GetNetworkOverviewInfo(generics.GenericAPIView):
    """
    Sample request, requires doesn't require anything:
    use on Tenant level
    {
         "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)        
        network_overview = get_network_overview_info(url, ses, tenant_id)
        return Response(network_overview)



@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class QOEReport(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        Day = 1
        for param in params:
            if param["name"] == "timeframe":
                Day = int(param["value"])
                break
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs(url, ses, tenant_id)
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "QOE Metric report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        for edge in all_edges_api:
            qoe_get = get_qoe_edge(
                url, ses, tenant_id, edge["id"], Day)
            edge["link_qoe"] = qoe_get
        try:
            encodedfile = qoe_report(all_edges_api)
            filename = create_filename_QOE("qoe_report", "xlsx", Day)
        except Exception as exception:
            return Response({
                "message":
                    f"QOE report failed with message: {exception}",
                "userMessage":
                    "QOE report report is not finished"
                    })
        return Response({
            "message":
                "QOE Report finished",
            "userMessage":
                "QOE report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class applicationInsight(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        Day = 1
        for param in params:
            if param["name"] == "timeframe":
                Day = int(param["value"])
                break
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs(url, ses, tenant_id)
        all_applications = []
        all_toptalkers =[]
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "Application insight report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        for edge in all_edges_api:
            hostname = edge["name"]
            application_get = get_application_edge(url, ses, tenant_id, edge["id"], Day)
            toptalkers_get = get_toptalkers_edge (url, ses, tenant_id, edge["id"], Day)
            # Add hostname to each application item from the current edge
            for tolker in toptalkers_get:
                tolker["edgename"] = hostname
            for app in application_get:
                app["edgename"] = hostname    
            # Update the edge with applications containing the hostname
            edge["applications"] = application_get
            edge["toptalker"] = toptalkers_get
            all_applications.extend(application_get)
            all_toptalkers.extend(toptalkers_get)
        try:
            encodedfile = application_report (all_applications, all_toptalkers)
            filename = create_filename_QOE("Applications_insight", "xlsx", Day)
        except Exception as exception:
            return Response({
                "message":
                    f"Application insight report failed with message: {exception}",
                "userMessage":
                    "Application insight report is not finished"
                    })
        return Response({
            "message":
                "Application insight report finished",
            "userMessage":
                "Application insight report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class gamingApplicationInsight(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        Day = 1
        for param in params:
            if param["name"] == "timeframe":
                Day = int(param["value"])
                break
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        all_applications = []
        all_Flows =[]
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "Application insight report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        for edge in all_edges_api:
            hostname = edge["name"]
            application_get = get_gamingapplication_edge(url, ses, tenant_id, edge["id"], Day)
            all_Flows_get = get_all_gamings_flows (url, ses, tenant_id, edge["id"], Day)
            # Add hostname to each application item from the current edge
            for flow in all_Flows_get:
                flow["edgename"] = hostname
            for app in application_get:
                app["edgename"] = hostname 
            # Update the edge with applications containing the hostname
            edge["applications"] = application_get
            edge["all_Flows"] = all_Flows_get
            all_applications.extend(application_get)
            all_Flows.extend(all_Flows_get)
        try:
            encodedfile = gaming_application_report (all_applications, all_Flows)
            filename = create_filename_QOE("Gaming_applications_insight", "xlsx", Day)
        except Exception as exception:
            return Response({
                "message":
                    f"Application insight report failed with message: {exception}",
                "userMessage":
                    "Application insight report is not finished"
                    })
        return Response({
            "message":
                "Application insight report finished",
            "userMessage":
                "Application insight report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class flowsExportGE5(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        Day = 1
        for param in params:
            if param["name"] == "timeframe":
                Day = int(param["value"])
                break
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        all_applications = []
        all_Flows =[]
        if "error" in all_edges_api:
            return Response({
                "userMessage":
                    "Application insight report failed to finish",
                'message':
                    all_edges_api["error"]["message"]
                })
        for edge in all_edges_api:
            if edge["name"] == "USBASPAWRGA0101UVHN01" or edge["name"] == "USBASPCXWOH0101UVHN01":
                print(edge["name"])
                hostname = edge["name"]
                all_Flows_get = get_all_ge5_flows (url, ses, tenant_id, edge["id"], Day)
                # Add hostname to each application item from the current edge
                for flow in all_Flows_get:
                    flow["edgename"] = hostname
                # Update the edge with applications containing the hostname
                edge["all_Flows"] = all_Flows_get
                all_Flows.extend(all_Flows_get)
        try:
            encodedfile = ge5_flows_report (all_Flows)
            filename = create_filename_QOE("Extract_GE5_flows", "xlsx", Day)
        except Exception as exception:
            return Response({
                "message":
                    f"Get Flows report failed with message: {exception}",
                "userMessage":
                    "Get Flows report is not finished"
                    })
        return Response({
            "message":
                "Get Flows report finished",
            "userMessage":
                "Get Flows report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})





@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class linkStatistics(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_links= get_link_Agregate_month(url, ses, tenant_id)
        dataframe = get_link_statisctics_aggregate(all_links)
        try:
            filename = create_filename("All_Links_Statistics", "xlsx")
            encodedfile = get_link_statisctics_aggregate(all_links)
        except Exception as exception:
            return Response({
                "message":
                    f"Current Links Metric report failed with message: {exception}",
                "userMessage":
                    "Current Links Metric report report is not finished"
                    })
        return Response({
            "message":
                "Current Links Metric report finished",
            "userMessage":
                "Current Links Metric report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class edgeMetricsInfo(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        Day = 1
        for param in params:
            if param["name"] == "timeframe":
                Day = int(param["value"])
                break
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        edge_metrics = []
        for edge in all_edges_api:
            # Call the API to get metrics for this edge
            system_info_data = get_edge_status_series_general(url, ses, tenant_id, edge["id"], Day)
            if system_info_data and "series" in system_info_data and system_info_data["series"]:
                for entry in system_info_data["series"]:
                    edge_metrics.append({
                    "EdgeName": edge.get("name"),
                    "Model": edge.get("modelNumber"),
                    "EdgeId": edge.get("id"),
                    "SoftwareVersion": edge.get("softwareVersion"),
                    "CustomInfo": edge.get("customInfo"),
                    "StartTime": entry.get('startTime'),
                    "EndTime": entry.get('endTime'),
                    "TunnelCount": entry.get('tunnelCount'),
                    "MemoryPct": entry.get('memoryPct'),
                    "CpuPct": entry.get('cpuPct'),
                    "FlowCount": entry.get('flowCount'),
                    "HandoffQueueDrops": entry.get('handoffQueueDrops'),
                    "CpuCoreTemp": entry.get('cpuCoreTemp')
                    })
            else:
                logging.debug(f"No series data found for edge: {edge.get('name')} (ID: {edge.get('id')})")
        all_edge_metrics = edge_metrics

        try:
            filename = create_filename_QOE("Edge_performance_statistics", "xlsx", Day)
            encodedfile = create_edge_performance_file(all_edge_metrics)
        except Exception as exception:
            return Response({
                "message":
                    f"Edge performance report failed with message: {exception}",
                "userMessage":
                    "Edge performance report is not finished"
                    })
        return Response({
            "message":
                "Edge performance report finished",
            "userMessage":
                "Edge performance report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})
        
@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class dailyEdgeStatistics(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name ":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)

        calculated_edge_statistics = []
        for edge in all_edges_api:
            try:
                edge_metrics = []
                # Assign license alias if available
                license_alias = None
                if edge.get("licenses") and isinstance(edge["licenses"], list) and len(edge["licenses"]) > 0:
                    license_alias = edge["licenses"][0].get("alias")
                else:
                    license_alias = []
                # Call the API to get metrics for this edge
                system_info_data = get_edge_status_daily_series(url, ses, tenant_id, edge["id"])
                if system_info_data and "series" in system_info_data and system_info_data["series"]:
                    for entry in system_info_data["series"]:
                        edge_metrics.append({
                            "EdgeUUID": edge.get("logicalId"),
                            "EdgeId": edge.get("id"),
                            "EdgeName": edge.get("name"),
                            "License": license_alias,
                            "Model": edge.get("modelNumber"),
                            "SoftwareVersion": edge.get("softwareVersion"),
                            "CustomInfo": edge.get("customInfo"),
                            "StartTime": entry.get('startTime'),
                            "EndTime": entry.get('endTime'),
                            "TunnelCount": entry.get('tunnelCount'),
                            "MemoryPct": entry.get('memoryPct'),
                            "CpuPct": entry.get('cpuPct'),
                            "FlowCount": entry.get('flowCount'),
                            "HandoffQueueDrops": entry.get('handoffQueueDrops')
                        })
                else:
                    logging.debug(f"No series data found for edge: {edge.get('name')} (ID: {edge.get('id')})")
                single_calculated_edge_statistics = calculate_daily_edge_statistics(edge_metrics)
                calculated_edge_statistics.append(single_calculated_edge_statistics)
            except Exception as e:
                logging.error(f"Error processing edge {edge.get('name')} (ID: {edge.get('id')}): {e}")
                continue
        #print(calculated_edge_statistics)
        time.sleep(1)  # Small delay to avoid overwhelming the API
        try:
            return Response(calculated_edge_statistics)
        except Exception as exc:
            logging.error(f"Error returning calculated_edge_statistics: {exc}")
            return Response({
                "message": f"Failed to return calculated edge statistics: {exc}",
                "userMessage": "Failed to return calculated edge statistics"
            })
        
@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class dailyCircuitStatistics(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name ":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        import math
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        circuit_metrics = []
        for edge in all_edges_api:
            # Assign license alias if available
            license_alias = None
            if edge.get("licenses") and isinstance(edge["licenses"], list) and len(edge["licenses"]) > 0:
                license_alias = edge["licenses"][0].get("alias")
            else:
                license_alias = []
            # Call the API to get metrics for this edge
            circuit_info_data = calculation_circuit_daily_statistics(get_edge_link_daily_series(url, ses, tenant_id, edge["id"]), [license_alias])
            # Fix: check for None and emptiness explicitly to avoid ValueError from pandas DataFrame
            if circuit_info_data is not None:
                # If circuit_info_data is a DataFrame, check if empty
                is_empty = False
                try:
                    is_empty = circuit_info_data.empty
                except AttributeError:
                    is_empty = False
                if not is_empty and len(circuit_info_data) > 0:
                    # If circuit_info_data is a DataFrame, add edge info to each row
                    if hasattr(circuit_info_data, 'to_dict'):
                        df = circuit_info_data.copy()
                        df['EdgeUUID'] = edge.get('logicalId')
                        df['EdgeId'] = edge.get('id')
                        df['EdgeName'] = edge.get('name')
                        df['Model'] = edge.get('modelNumber')
                        # Convert DataFrame rows to dicts and append
                        circuit_metrics.extend(df.to_dict('records'))
                    else:
                        for entry in circuit_info_data:
                            entry_dict = dict(entry) if not isinstance(entry, dict) else entry
                            entry_dict['EdgeUUID'] = edge.get('logicalId')
                            entry_dict['EdgeId'] = edge.get('id')
                            entry_dict['EdgeName'] = edge.get('name')
                            entry_dict['Model'] = edge.get('modelNumber')
                            circuit_metrics.append(entry_dict)
                else:
                    logging.debug(f"No series data found for edge: {edge.get('name')} (ID: {edge.get('id')})")
            else:
                logging.debug(f"No circuit_info_data returned for edge: {edge.get('name')} (ID: {edge.get('id')})")

        # Replace NaN, inf, -inf with None for JSON serialization compliance
        def clean_json(obj):
            if isinstance(obj, dict):
                return {k: clean_json(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_json(v) for v in obj]
            elif isinstance(obj, float):
                if math.isnan(obj) or math.isinf(obj):
                    return None
                return obj
            else:
                return obj

        cleaned_metrics = clean_json(circuit_metrics)
        #print(cleaned_metrics)
        time.sleep(1)
        try:
            return Response(cleaned_metrics)
        except Exception as exc:
            logging.error(f"Error returning cleaned_metrics: {exc}")
            return Response({
                "message": f"Failed to return  cleaned metrics statistics: {exc}",
                "userMessage": "Failed to return  cleaned metrics statistics"
            })
        



@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class tunnelsExport(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        all_segments = get_segments(url, ses, tenant_id)
        enterprise_service = get_enterprise_services_full(url, ses, tenant_id)
        # Initialize empty DataFrames for each customer run
        df_nsd_all = []
        df_css_all = []
        if "error" in all_edges_api:
            return Response({
            "userMessage":
                "Application insight report failed to finish",
            'message':
                all_edges_api["error"]["message"]
            })
        for edge in all_edges_api:
            config = get_edge_config_stack(url, ses, tenant_id, edge["id"])
            df_nsd, df_css = all_tunnels_info(config, edge["name"], all_segments, enterprise_service)
            # Assuming df_nsd and df_css are lists of dicts or convertible to such
            if hasattr(df_nsd, "to_dict"):
                df_nsd_all.extend(df_nsd.to_dict('records'))
            else:
                df_nsd_all.extend(df_nsd)
            if hasattr(df_css, "to_dict"):
                df_css_all.extend(df_css.to_dict('records'))
            else:
                df_css_all.extend(df_css)
        try:
            encodedfile = create_tunnels_file(df_nsd_all, df_css_all)
            filename = create_filename("All_tunnels", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"Tunnels config export  failed with message: {exception}",
                "userMessage":
                    "Tunnels config export  is not finished"
                    })
        return Response({
            "message":
                "Tunnels config export  finished",
            "userMessage":
                "Tunnels config export is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})
        
@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class packetLoss(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data["params"]
        Day = 1
        for param in params:
            if param["name"] == "timeframe":
                Day = int(param["value"])
                break
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_links= get_link_packet_loss(url, ses, tenant_id,Day)
        dataframe = get_link_packet_loss_aggregate(all_links)
        try:
            filename = create_filename_QOE("All_Links_Packet_Loss", "xlsx", Day)
            encodedfile = get_link_packet_loss_aggregate(all_links)
        except Exception as exception:
            return Response({
                "message":
                    f"Current Links Metric report failed with message: {exception}",
                "userMessage":
                    "Current Links Metric report report is not finished"
                    })
        return Response({
            "message":
                "Current Links Metric report finished",
            "userMessage":
                "Current Links Metric report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class linksDownParser(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        links = get_qoe_Agregate_month(url, ses, tenant_id)
        Events_Report_get = event_logs_parse(get_all_events_log(url, ses, tenant_id),links)
        try:
            encodedfile = Events_Report_get
            filename = create_filename("Previous_Month_Links_Downtime_Report", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"Link down report failed with message: {exception}",
                "userMessage":
                    "Link down report report is not finished"
                    })
        return Response({
            "message":
                "Link down report finished",
            "userMessage":
                "Link down report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class Sephora_list_paths(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_edges_api = get_all_edges_configs_only(url, ses, tenant_id)
        df = []
        for edge in all_edges_api:
            if edge["edgeState"] == "CONNECTED":
                if edge["name"] in [
                    "s9978",
                    "USSEUIWDDIL01PVCE01_SHA",
                    "Lab 983 - India - Temporary",
                    "USSEUILBJCA01PVCE01_SHA",
                    "USSEUISFOCA11PVCE01_EHA",
                    "s969"
                ]:
                    # Get the websocket results for this edge
                    results = get_websocket(url, ses, edge)

                    # List of peer names to match with results
                    peers = ["USSEUIQASVA02PVCE01_SHA", "Azure_Cluster", "USSEUISJCCA04PVCE01_SHA"]
                    for result, peer in zip(results, peers):
                        output_html = result["data"]["results"]["output"].replace('\\"', '"').replace('\\n', '')
                        try:
                            data = json.loads(output_html)
                            paths = data.get("PATHS_DUMP", {}).get("result", [])
                            for path in paths:
                                new_row = {
                                    'Edge': edge["name"],
                                    'Peer': peer,
                                    'WAN Link': path.get('link', ''),
                                    'Local IP': path.get('localPublicIP', ''),
                                    'Remote IP': path.get('peerPublicIP', ''),
                                    'State': path.get('state', ''),
                                    'VPN': path.get('vpnState', ''),
                                    'Bandwidth (tx/rx)': f"{path.get('bandwidthKbpsTx', '')} / {path.get('bandwidthKbpsRx', '')}",
                                    'Latency (tx/rx)': f"{path.get('avgLatencyTx', '')} / {path.get('avgLatencyRx', '')}",
                                    'Jitter (tx/rx)': f"{path.get('jitterTx', '')} / {path.get('jitterRx', '')}",
                                    'Loss (tx/rx)': f"{path.get('lossTx', '')} / {path.get('lossRx', '')}",
                                    'Bytes (tx/rx)': f"{path.get('bytesTx', '')} / {path.get('bytesRx', '')}",
                                    'Uptime': path.get('pathUpMs', ''),
                                    'Mode': path.get('tunneltype', '')
                                }
                                df.append(new_row)
                        except Exception as e:
                            logging.debug(f"Failed to parse output_html as JSON: {e}")
        encodedfile=sephora_list_paths(df)
            
        try:
            filename = create_filename("List_paths", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"List path collection has been completed with : {exception}",
                "userMessage":
                    "List path collection report is not finished"
                    })
        return Response({
            "message":
                "List path collection finished",
            "userMessage":
                "List path collection report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class bgpFromGateway(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        all_neighbors=get_enterprise_bgp_peer_status(url, ses, tenant_id)
        #)
        # Filter only the most recent event per dataKey (neighbor IP)        
        #print(all_neighbors)
        neighbors = all_neighbors
        latest_neighbors = {}
        for entry in neighbors:
            key = entry.get("dataKey")
            ts = entry.get("timestamp")
            # If not present or this timestamp is newer, update
            if key not in latest_neighbors or ts > latest_neighbors[key]["timestamp"]:
                latest_neighbors[key] = entry
        # Convert to list of most recent events
        most_recent_events = list(latest_neighbors.values())
        # Prepare lists to collect routes for all neighbors
        received_routes = []
        advertised_routes = []
        for neighbor in most_recent_events:
            print(neighbor)
            results = get_websocket_bgp_from_gateway(url, ses, neighbor)
            neighbor_ip = neighbor.get("dataKey", "")
            gateway_name = neighbor.get("gatewayName", "")
            # Iterate over results to find received and advertised routes
            #print(results)
            for item in results:
                action = item.get("action", "")
                data = item.get("data", {})
                routes = data.get("result", [])
                if action == "getGwBgpReceivedRoutes":
                    for route in routes:
                        route_copy = route.copy()
                        route_copy["neighbor_ip"] = neighbor_ip
                        route_copy["gatewayName"] = gateway_name
                        received_routes.append(route_copy)
                elif action == "getGwBgpAdvertisedRoutes":
                    for route in routes:
                        route_copy = route.copy()
                        route_copy["neighbor_ip"] = neighbor_ip
                        route_copy["gatewayName"] = gateway_name
                        advertised_routes.append(route_copy)

        encodedfile = bgp_from_gw_neighbor_routes(most_recent_events,received_routes, advertised_routes )
            
        try:
            filename = create_filename("BGP_fromGateway", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"List path collection has been completed with : {exception}",
                "userMessage":
                    "List path collection report is not finished"
                    })
        return Response({
            "message":
                "List path collection finished",
            "userMessage":
                "List path collection report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class objectgroups(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        groups = get_object_groups(url, ses, tenant_id)
        generate_objectgroups = def_object_group(groups)
        try:
            encodedfile = generate_objectgroups
            filename = create_filename("Object_groups", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"Link down report failed with message: {exception}",
                "userMessage":
                    "Link down report report is not finished"
                    })
        return Response({
            "message":
                "Link down report finished",
            "userMessage":
                "Link down report is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class troughputMax(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        # Re-initialize lists at the start of each run
        #aggregated_df_list = []
        #aggregated_df_bi_aggr_list = []
        #aggregated_df_total_aggr_list = []

        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        params = parsed.data
        data = parsed.data
        devices = data["devices"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        license = get_licenses(url, ses, tenant_id)
        all_edges_api = get_all_edges_configs(url, ses, tenant_id)
        time_range = last_month(all_days=False, business_hours=False, timezone='UTC', adjust_hours=False)
        all_models = get_edge_models(all_edges_api)
        generatexls = False

        if "error" in all_edges_api:
            return Response({
                "userMessage": "QOE Metric report failed to finish",
                'message': all_edges_api["error"]["message"]
            })

        try:
            if not devices:
                if len(all_edges_api) < 400:
                    generatexls = True
                    aggregated_df_list, aggregated_df_bi_aggr_list, aggregated_df_total_aggr_list,bandwidth = get_daily_link_statistics(
                        url, ses, tenant_id, all_edges_api, time_range)
                else:
                    filename = create_filename("Incorrect_Input", "xlsx")
                    encodedfile = max_agregate_incorrect_input()
                    return Response({
                        "message": "Max Agr troughput report didn't start due to user issue",
                        "userMessage": "Max Agr troughput report didn't start due to user issue",
                        "filename": filename,
                        "data": [{
                            "type": "application/vnd.ms-excel",
                            "value": encodedfile
                        }]
                    })
            else:
                if len(devices) < 400:
                    generatexls = True
                    selected_edges = [edge for edge in all_edges_api if edge["name"] in [device["hostname"] for device in devices]]
                    aggregated_df_list, aggregated_df_bi_aggr_list, aggregated_df_total_aggr_list,bandwidth = get_daily_link_statistics(
                        url, ses, tenant_id, selected_edges, time_range)
                else:
                    filename = create_filename("Incorrect_Input", "xlsx")
                    encodedfile = max_agregate_incorrect_input()
                    return Response({
                        "message": "Max Agr troughput report didn't start due to user issue",
                        "userMessage": "Max Agr troughput report didn't start due to user issue",
                        "filename": filename,
                        "data": [{
                            "type": "application/vnd.ms-excel",
                            "value": encodedfile
                        }]
                    })

            if generatexls:
                try:
                    generate_excel = max_troughput_report(aggregated_df_list, aggregated_df_bi_aggr_list, aggregated_df_total_aggr_list, license, all_models,bandwidth)
                    encodedfile = generate_excel
                    filename = create_filename("Max Agr troughput", "xlsx")
                except ValueError as e:
                    return Response({
                        "message": f"Max Agr troughput report failed with message: {e}",
                        "userMessage": "Max Agr troughput report is not finished"
                    })

            return Response({
                "message": "Max Agr troughput report finished",
                "userMessage": "Max Agr troughput report is finished, it will be sent via email",
                "filename": filename,
                "data": [{
                    "type": "application/vnd.ms-excel",
                    "value": encodedfile
                }]
            })
        except Exception as e:
            return Response({
                "message": f"An error occurred: {e}",
                "userMessage": "Max Agr troughput report is not finished due to an unexpected error"
            })

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class DeviceCount(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        user, password, url, _tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        ent_inventory = get_enterprise_inventory(url, ses)
        if "error" in ent_inventory:
            return Response({
                "userMessage":
                    "QOE Metric report failed to finish",
                'message':
                    ent_inventory["error"]["message"]
                })
        try:
            encodedfile = inventory_report(ent_inventory)
        except Exception as exception:
            return Response({
                "message":
                    f"QOE report failed with message: {exception}",
                "userMessage":
                    "QOE report report is not finished"
                    })
        return Response({
            "message":
                "QOE Report finished",
            "userMessage":
                "QOE report is finished, it will be sent via email",
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class UserAdd(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [ "type": "json", "name": "user_list",
            "value": [{name: user1, email: email1, surname: temp,
            level: "msp or tenant"},
            {name: user1, email: email1, password: temp,
            level: "msp or tenant"}]
        ],
        "devices": [
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post function """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        params = resolve_params(data["params"])
        list_of_dict = params.get("user_list", {}).get("value", "")
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        response_lst = []
        for sngl_usr in list_of_dict:
            prov_user_resp = create_user(url, ses, tenant_id, sngl_usr)
            if "error" in prov_user_resp:
                response_lst.append({
                    'userMessage':
                        f"User with email: {sngl_usr['email']} was not "
                        "provisioned", 'message':
                        prov_user_resp["error"]["message"]
                        })
            else:
                password_reset_user(url, ses, tenant_id, prov_user_resp["id"],
                                    sngl_usr["level"])
                response_lst.append({
                    'userMessage':
                        f"User with email: {sngl_usr['email']} was "
                        "provisioned", 'message':
                        f"userID: {prov_user_resp['id']}"
                        })
        return Response(response_lst)


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class Mds(generics.GenericAPIView):
    """ old MDS method """
    serializer_class = serializers.MdsSerializer
    permission_classes = []
    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        try:
            if data["vco_url"].startswith("http"):
                url = data["vco_url"]
            else:
                url = "https://" + data["vco_url"]
            ses = get_session(data["vco_username"], data["vco_password"], url=url)
            tenant_id = get_tenantid_nonmsp(url, ses)
            profiles = []
            all_edges_list = get_all_edges_configs(url, ses, tenant_id)
            for edge in all_edges_list:
                data = get_edge_config_stack(
                    url, ses, tenant_id, edge["id"])
                if data[0]["name"] == "Edge Specific Profile":
                    edge["configstack"] = data[0]
                    edge["profilestack"] = data[1]
                    add_profile = True
                    for profile in profiles:
                        if profile["id"] == data[1]["id"]:
                            add_profile = False
                    if add_profile:
                        profiles.append(data[1])
                else:
                    edge["configstack"] = data[1]
                    edge["profilestack"] = data[0]
                    add_profile = True
                    for profile in profiles:
                        if profile["id"] == data[0]["id"]:
                            add_profile = False
                    if add_profile:
                        profiles.append(data[0])
            content = mds_generate(
                all_edges_list,
                get_applications(url, ses, tenant_id),
                get_routable_applications(url, ses, tenant_id),
                profiles)

            file_content=base64.b64decode(content)
            resp = HttpResponse(
                content=file_content,
                content_type=(
                    'application/vnd.openxmlformats-officedocument'
                    '.spreadsheetml.sheet'
                )
            )
            resp['Content-Disposition'] = 'inline; filename=mds.xlsx'
            return resp

        except Exception as exc:
            print(f"ERROR Exception: {exc}")
            return HttpResponse(exc)


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class MdsGenerate(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        devices = data["devices"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        try:
            profiles = []
            all_edges_list = get_all_edges_configs(url, ses, tenant_id)
            if not devices:
                for edge in all_edges_list:
                    data = get_edge_config_stack(
                        url, ses, tenant_id, edge["id"])
                    if data[0]["name"] == "Edge Specific Profile":
                        edge["configstack"] = data[0]
                        edge["profilestack"] = data[1]
                        add_profile = True
                        for profile in profiles:
                            if profile["id"] == data[1]["id"]:
                                add_profile = False
                        if add_profile:
                            profiles.append(data[1])
                    else:
                        edge["configstack"] = data[1]
                        edge["profilestack"] = data[0]
                        add_profile = True
                        for profile in profiles:
                            if profile["id"] == data[0]["id"]:
                                add_profile = False
                        if add_profile:
                            profiles.append(data[0])
            else:
                for device in devices:
                    for edge in all_edges_list:
                        if edge["name"] == device["hostname"]:
                            data = get_edge_config_stack(
                                url, ses, tenant_id, edge["id"])
                            if data[0]["name"] == "Edge Specific Profile":
                                edge["configstack"] = data[0]
                                edge["profilestack"] = data[1]
                                add_profile = True
                                for profile in profiles:
                                    if profile["id"] == data[1]["id"]:
                                        add_profile = False
                                if add_profile:
                                    profiles.append(data[1])
                            else:
                                edge["configstack"] = data[1]
                                edge["profilestack"] = data[0]
                                add_profile = True
                                for profile in profiles:
                                    if profile["id"] == data[0]["id"]:
                                        add_profile = False
                                if add_profile:
                                    profiles.append(data[0])
            encodedfile = mds_generate(
                all_edges_list,
                get_applications(url, ses, tenant_id),
                get_routable_applications(url, ses, tenant_id),
                get_object_groups(url, ses, tenant_id),
                profiles, get_segments(url, ses, tenant_id))
            filename = create_filename("mds", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"MDS failed to generate with message: {exception}",
                "userMessage":
                    "MDS report is not finished"
                    })
        return Response({
            "message":
                "MDS finished",
            "userMessage":
                "MDS is finished, it will be sent via email",
                "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class LMAC(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        devices = data["devices"]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        completed=0
        try:
            all_edges_list = get_all_edges_configs(url, ses, tenant_id)
            for edge in all_edges_list:
                completed += 1
                includedhostnames = [
                    "Edge_Demo01",
                    "Edge_Demo02",
                    "Edge_Demo03",
                    "Edge_Demo04",
                    "Edge_Demo05",
                    "Edge_Demo06",
                    "Edge_Demo07",
                    "Edge_Demo08",
                    "Edge_Demo09",
                    "Edge_Demo10",
                    "Edge_Demo11",
                    "Edge_Demo12",
                    "Edge_Demo13",
                    "Edge_Demo14",
                    "Edge_Demo15",
                    "Edge_Demo16",
                    "Edge_Demo17",
                    "Edge_Demo18",
                    "Edge_Demo19",
                    "Edge_Demo20",
                    "Edge_Demo21",
                    "Edge_Demo22",
                    "Edge_Demo23",
                    "Edge_Demo24",
                    "Edge_Demo25",
                    "Edge_Demo26",
                    "Edge_Demo27",
                    "Edge_Demo28",
                    "Edge_Demo29",
                    "Edge_Demo30",
                    "Edge_Demo31",
                    "Edge_Demo32",
                    "Edge_Demo33",
                    "Edge_Demo34",
                    "Edge_Demo35"
                ]
                if edge["name"] not in includedhostnames:
                    print(f'skipping {edge["name"]} of {completed}/{len(all_edges_list)}')
                    continue
                else:
                    print(f'doing {edge["name"]} of {completed}/{len(all_edges_list)}')
                update = True
                json_list = json.loads(json.dumps(
                    get_edge_config_stack(
                        url, ses, tenant_id, edge["id"]), ensure_ascii=True).encode("utf8"))
                #new BP_policy:
                new_BP = [
                        {
                                "name": "MS Virtual Global Bypass",
                                "match": {
                                    "sip": "any",
                                    "sport_high": -1,
                                    "sport_low": -1,
                                    "ssm": "255.255.255.255",
                                    "svlan": -1,
                                    "sInterface": "",
                                    "os_version": -1,
                                    "s_rule_type": "prefix",
                                    "sip_prenat_enabled": 0,
                                    "dip": "any",
                                    "dport_high": -1,
                                    "dport_low": -1,
                                    "dAddressGroup": "2c4b0886-1987-491a-8b02-2b73d28e54c8",
                                    "dPortGroup": "4cd75ac4-6369-499f-92ca-1a5147e5cd51",
                                    "dsm": "255.255.255.255",
                                    "dvlan": -1,
                                    "dInterface": "",
                                    "hostname": "",
                                    "proto": -1,
                                    "d_rule_type": "prefix",
                                    "dip_prenat_enabled": 0,
                                    "appid": -1,
                                    "classid": -1,
                                    "dscp": -1,
                                    "ipVersion": "IPv4"
                                },
                                "action": {
                                    "QoS": {
                                        "txScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "normal"
                                        },
                                        "rxScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "normal"
                                        },
                                        "type": "transactional"
                                    },
                                    "sla": {
                                        "latencyMs": "0",
                                        "lossPct": "0.0",
                                        "jitterMs": "0"
                                    },
                                    "edge2CloudRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "direct",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2DataCenterRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2EdgeRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "routeType": "edge2Any",
                                    "natIpVersion": None,
                                    "nat": {
                                        "destIp": "no",
                                        "sourceIp": "no"
                                    },
                                    "allowConditionalBh": False,
                                    "userDisableConditionalBh": False
                                },
                                "ruleLogicalId": None
                            },
                            {
                                "name": "MS Virtual West EU Bypass",
                                "match": {
                                    "sip": "any",
                                    "sport_high": -1,
                                    "sport_low": -1,
                                    "ssm": "255.255.255.255",
                                    "svlan": -1,
                                    "sInterface": "",
                                    "os_version": -1,
                                    "s_rule_type": "prefix",
                                    "sip_prenat_enabled": 0,
                                    "dip": "any",
                                    "dport_high": -1,
                                    "dport_low": -1,
                                    "dAddressGroup": "8ed87d83-5d8c-418b-8ea6-e2dad283d6b2",
                                    "dPortGroup": "4cd75ac4-6369-499f-92ca-1a5147e5cd51",
                                    "dsm": "255.255.255.255",
                                    "dvlan": -1,
                                    "dInterface": "",
                                    "hostname": "",
                                    "proto": -1,
                                    "d_rule_type": "prefix",
                                    "dip_prenat_enabled": 0,
                                    "appid": -1,
                                    "classid": -1,
                                    "dscp": -1,
                                    "ipVersion": "IPv4"
                                },
                                "action": {
                                    "QoS": {
                                        "txScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "high"
                                        },
                                        "rxScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "high"
                                        },
                                        "type": "transactional"
                                    },
                                    "sla": {
                                        "latencyMs": "0",
                                        "lossPct": "0.0",
                                        "jitterMs": "0"
                                    },
                                    "edge2CloudRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "direct",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2DataCenterRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2EdgeRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "routeType": "edge2Any",
                                    "natIpVersion": None,
                                    "nat": {
                                        "destIp": "no",
                                        "sourceIp": "no"
                                    },
                                    "allowConditionalBh": False,
                                    "userDisableConditionalBh": False
                                },
                                "ruleLogicalId": None
                            },
                            {
                                "name": "MS Chat",
                                "match": {
                                    "sip": "any",
                                    "sport_high": -1,
                                    "sport_low": -1,
                                    "ssm": "255.255.255.255",
                                    "svlan": -1,
                                    "sInterface": "",
                                    "os_version": -1,
                                    "s_rule_type": "prefix",
                                    "sip_prenat_enabled": 0,
                                    "dip": "any",
                                    "dport_high": -1,
                                    "dport_low": -1,
                                    "dAddressGroup": "0225f711-65f1-4e5d-b5e4-ff1540ab7101",
                                    "dPortGroup": "3f6419f6-0de6-4040-8a04-b6426429f8db",
                                    "dsm": "255.255.255.255",
                                    "dvlan": -1,
                                    "dInterface": "",
                                    "hostname": "",
                                    "proto": -1,
                                    "d_rule_type": "prefix",
                                    "dip_prenat_enabled": 0,
                                    "appid": -1,
                                    "classid": -1,
                                    "dscp": -1,
                                    "ipVersion": "IPv4"
                                },
                                "action": {
                                    "QoS": {
                                        "txScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "normal"
                                        },
                                        "rxScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "normal"
                                        },
                                        "type": "transactional"
                                    },
                                    "sla": {
                                        "latencyMs": "0",
                                        "lossPct": "0.0",
                                        "jitterMs": "0"
                                    },
                                    "edge2CloudRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "direct",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2DataCenterRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2EdgeRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "routeType": "edge2Any",
                                    "natIpVersion": None,
                                    "nat": {
                                        "destIp": "no",
                                        "sourceIp": "no"
                                    },
                                    "allowConditionalBh": False,
                                    "userDisableConditionalBh": False
                                },
                                "ruleLogicalId": None
                            },
                            {
                                "name": "MS Screensharing",
                                "match": {
                                    "sip": "any",
                                    "sport_high": -1,
                                    "sport_low": -1,
                                    "ssm": "255.255.255.255",
                                    "svlan": -1,
                                    "sInterface": "",
                                    "os_version": -1,
                                    "s_rule_type": "prefix",
                                    "sip_prenat_enabled": 0,
                                    "dip": "any",
                                    "dport_high": -1,
                                    "dport_low": -1,
                                    "dAddressGroup": "0225f711-65f1-4e5d-b5e4-ff1540ab7101",
                                    "dPortGroup": "2038adea-ff62-4bb8-a47c-7f3d2fabd2ab",
                                    "dsm": "255.255.255.255",
                                    "dvlan": -1,
                                    "dInterface": "",
                                    "hostname": "",
                                    "proto": -1,
                                    "d_rule_type": "prefix",
                                    "dip_prenat_enabled": 0,
                                    "appid": -1,
                                    "classid": -1,
                                    "dscp": -1,
                                    "ipVersion": "IPv4"
                                },
                                "action": {
                                    "QoS": {
                                        "txScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "normal"
                                        },
                                        "rxScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "normal"
                                        },
                                        "type": "realtime"
                                    },
                                    "sla": {
                                        "latencyMs": "0",
                                        "lossPct": "0.0",
                                        "jitterMs": "0"
                                    },
                                    "edge2CloudRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "direct",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2DataCenterRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2EdgeRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "routeType": "edge2Any",
                                    "natIpVersion": None,
                                    "nat": {
                                        "destIp": "no",
                                        "sourceIp": "no"
                                    },
                                    "allowConditionalBh": False,
                                    "userDisableConditionalBh": False
                                },
                                "ruleLogicalId": None
                            },
                            {
                                "name": "MS Video",
                                "match": {
                                    "sip": "any",
                                    "sport_high": -1,
                                    "sport_low": -1,
                                    "ssm": "255.255.255.255",
                                    "svlan": -1,
                                    "sInterface": "",
                                    "os_version": -1,
                                    "s_rule_type": "prefix",
                                    "sip_prenat_enabled": 0,
                                    "dip": "any",
                                    "dport_high": -1,
                                    "dport_low": -1,
                                    "dAddressGroup": "0225f711-65f1-4e5d-b5e4-ff1540ab7101",
                                    "dPortGroup": "1b9b6d2b-3885-4164-82cc-f6b94f5eee07",
                                    "dsm": "255.255.255.255",
                                    "dvlan": -1,
                                    "dInterface": "",
                                    "hostname": "",
                                    "proto": -1,
                                    "d_rule_type": "prefix",
                                    "dip_prenat_enabled": 0,
                                    "appid": -1,
                                    "classid": -1,
                                    "dscp": -1,
                                    "ipVersion": "IPv4"
                                },
                                "action": {
                                    "QoS": {
                                        "txScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "low"
                                        },
                                        "rxScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "low"
                                        },
                                        "type": "realtime"
                                    },
                                    "sla": {
                                        "latencyMs": "0",
                                        "lossPct": "0.0",
                                        "jitterMs": "0"
                                    },
                                    "edge2CloudRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "direct",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2DataCenterRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2EdgeRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": None,
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "routeType": "edge2Any",
                                    "natIpVersion": None,
                                    "nat": {
                                        "destIp": "no",
                                        "sourceIp": "no"
                                    },
                                    "allowConditionalBh": False,
                                    "userDisableConditionalBh": False
                                },
                                "ruleLogicalId": None
                            },
                            {
                                "name": "MS Audio",
                                "match": {
                                    "sip": "any",
                                    "sport_high": -1,
                                    "sport_low": -1,
                                    "ssm": "255.255.255.255",
                                    "svlan": -1,
                                    "sInterface": "",
                                    "os_version": -1,
                                    "s_rule_type": "prefix",
                                    "sip_prenat_enabled": 0,
                                    "dip": "any",
                                    "dport_high": -1,
                                    "dport_low": -1,
                                    "dAddressGroup": "0225f711-65f1-4e5d-b5e4-ff1540ab7101",
                                    "dPortGroup": "1ee27d98-5807-47d7-afb1-276ccfcb58aa",
                                    "dsm": "255.255.255.255",
                                    "dvlan": -1,
                                    "dInterface": "",
                                    "hostname": "",
                                    "proto": -1,
                                    "d_rule_type": "prefix",
                                    "dip_prenat_enabled": 0,
                                    "appid": -1,
                                    "classid": -1,
                                    "dscp": -1,
                                    "ipVersion": "IPv4"
                                },
                                "action": {
                                    "QoS": {
                                        "txScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "high"
                                        },
                                        "rxScheduler": {
                                            "bandwidth": -1,
                                            "bandwidthCapPct": -1,
                                            "queueLen": -1,
                                            "burst": -1,
                                            "latency": -1,
                                            "priority": "high"
                                        },
                                        "type": "realtime"
                                    },
                                    "sla": {
                                        "latencyMs": "0",
                                        "lossPct": "0.0",
                                        "jitterMs": "0"
                                    },
                                    "edge2CloudRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "direct",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": "CS0",
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2DataCenterRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": "CS0",
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "edge2EdgeRouteAction": {
                                        "interface": "auto",
                                        "subinterfaceId": -1,
                                        "linkInternalLogicalId": "auto",
                                        "linkPolicy": "available",
                                        "routeCfg": {},
                                        "routePolicy": "auto",
                                        "serviceGroup": "PUBLIC_WIRED",
                                        "vlanId": -1,
                                        "wanlink": "auto",
                                        "linkCosLogicalId": None,
                                        "linkOuterDscpTag": "CS0",
                                        "linkInnerDscpTag": None,
                                        "icmpLogicalId": None,
                                        "wanLinkName": ""
                                    },
                                    "routeType": "edge2Any",
                                    "natIpVersion": None,
                                    "nat": {
                                        "destIp": "no",
                                        "sourceIp": "no"
                                    },
                                    "allowConditionalBh": False,
                                    "userDisableConditionalBh": False
                                },
                                "ruleLogicalId": None
                            }
                        ]
    
                json_data = {}
                json_data[0] = json_list[0]
                json_data[1] = json_list[1]
                modulepath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="QOS")]')
                mresult = modulepath.find(json_data)
                module = {}
                optionstemp = []
                for match in mresult:
                    module = match.value
                for segment in module["data"]["segments"]:
                    if segment["segment"]["name"] == "Global Segment":
                        existingRules = segment["rules"] #existing edge override BP rules
                        PushBP = new_BP + existingRules # mergnutie existing a new BP rules
                        segment["rules"] = PushBP    # updatnutie "rules" BP v segmente matchujucom meno segmentu
                        print(f'New Global Bypass policy has been added before existing rules')
                modulepath.update(json_data, module)
                if update:
                    if "refs" in module:
                        json_body = {
                            "id": module["id"],
                            "enterpriseId": int(tenant_id),
                            "_update": { "data": module["data"],
                                        "name": "deviceSettings",
                                        "refs": module["refs"]
                            }
                        }
                    else:
                        json_body = {
                            "id": module["id"],
                            "enterpriseId": int(tenant_id),
                            "_update": { "data": module["data"],
                                        "name": "deviceSettings"
                            }
                        }
                    time.sleep(1)
                    print(f'updating edge:{edge["name"]}')
                    result = update_edge_config(url, ses, json_body)
                    print(f'{result}')
        except Exception as exception:
            return Response({
                "message":
                    f"Configuration update failed to generate with message: {exception}",
                "userMessage":
                    "Configuration update is not finished"
                    })
        # Collect update results for each edge
        update_results = []
        try:
            # Collect included hostnames dynamically from above
            for edge in all_edges_list:
                if edge["name"] in includedhostnames:
                    # After updating edge config, collect result
                    update_results.append(
                        f'updating edge: {edge["name"]}\nNew Global Bypass policy has been added before existing rules'
                    )
        except Exception as exception:
            return Response({
            "message":
                f"Configuration update failed to generate with message: {exception}",
            "userMessage":
                "Configuration update is not finished"
                })
        finally:
            pass

        return Response({
            "message": "Configuration update finished",
            "userMessage": "Configuration update is finished, it will be sent via email",
            "data": update_results
        })



@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class VcoGetSpecificConfig(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        user, password, url, _tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        try:
            enterprises = get_enterprises(url, ses)
            for enterprise in enterprises:
                all_edges_list = get_all_edges_configs(url, ses, enterprise["id"])
                for edge in all_edges_list:
                    #print(edge)
                    jspath = ext.parse('$.configuration.enterprise.modules[?(@.name=="firewall")].edgeSpecificData.services.ssh')
                    jspath_result = jspath.find(edge)
                    for match in jspath_result:
                        #print(match.value)
                        print(f'{enterprise["name"]};{edge["name"]};{match.value["enabled"]};{match.value["allowSelectedIp"]}')
        except Exception as exception:
            return Response({
                "message":
                    f"Failed to get VCO report: {exception}",
                "userMessage":
                    "VCO report not finished"
                    })
        return Response({
                "message":
                    "VCO report finished",
                "userMessage":
                    "VCO report is finished, it will be sent via email",
                    "data": [{
                        "type":
                            "application/vnd.ms-excel",
                        "value":
                            ""
                            }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class VCOGetRoutingTable(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        try:
            encodedfile = route_report(get_routes(url, ses, tenant_id),
                                       get_segments(url, ses, tenant_id))
            filename = create_filename("routes", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"Failed to get VCO report: {exception}",
                "userMessage":
                    "VCO report not finished"
                    })
        return Response({
                "message":
                    "VCO report finished",
                "userMessage":
                    "VCO report is finished, it will be sent via email",
                    "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class VCOGetCSSList(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": [],
        "devices": []
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        try:
            encodedfile = css_location_report(get_enterprise_edge_list(url, ses, tenant_id),
                                              get_segments(url, ses, tenant_id))
            filename = create_filename("css_location", "xlsx")
        except Exception as exception:
            return Response({
                "message":
                    f"Failed to get VCO report: {exception}",
                "userMessage":
                    "VCO report not finished"
                    })
        return Response({
                "message":
                    "VCO report finished",
                "userMessage":
                    "VCO report is finished, it will be sent via email",
                    "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class VCOGatewayMigration(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        user, password, url, _tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        tunnel_list = []
        vcg_list = []
        super_list = []
        try:
            gateways = get_gateways(url, ses)
            write_profiles = ""
            gwmigset = {"syd1":"syd2","jpn1":"hnd1","usca3":"sjc1","atl2":"atl3","cdg2":"cdg3","den2":"den3","ustx1":"dfw1","ire1":"dub1",
                      "fra1":"fra3","fra2":"fra3","usvi2":"iad1","lax2":"lax3","lhr3":"lhr5","gva2":"mxp1","nyc3":"nyc4","usil1":"ord1",
                      "sea2":"sea3","sin1":"sin2","yul1":"yyz1","yvr1":"yvr2"}
            print('Enterprise name;NSD name;enabled;PrimaryGW name;Secondary GW name;new GW name;profiles used;status;planned decommision date;vco;remote service;remote service IP addresses;nsd networks')
            en_services = {}
            customers = []
            for gateway in gateways:
                enterprise_associations = []
                if gateway["serviceState"] == "QUIESCED" or gateway["name"] == "vcg15-sao1":
                    associatedEdges = get_gateway_edge_assignment(url, ses, gateway["id"])
                    for edge in associatedEdges:
                        if edge["enterpriseName"] not in customers:
                                customers.append(edge["enterpriseName"])
                                vcg_list.append({
                                    "vcg":gateway["name"],
                                    "customer": edge["enterpriseName"]
                                })
                    newGW = gateway["name"].split("-")
                    if newGW[1] in gwmigset:
                        newGWinfo = gwmigset[newGW[1]]
                    else:
                        newGWinfo = "no suggestion"
                    newGWname = ""
                    for gw in gateways:
                        splitgwname = gw["name"].split("-")
                        if splitgwname[1] == newGWinfo:
                            newGWname=gw["name"]
                    for nvs in gateway["dataCenters"]:
                        for enterprise in gateway["enterprises"]:
                            if nvs["enterpriseId"] == enterprise["id"]:
                                if enterprise["id"] not in en_services:
                                    en_services[nvs["enterpriseId"]] = get_enterprise_services(url, ses, enterprise["id"])
                                for service in en_services[nvs["enterpriseId"]]:
                                    serviceIP=""
                                    if nvs["logicalId"] == service["logicalId"]:
                                        #return Response(service)
                                        if "isServiceEnabled" in service["data"]:
                                            servicestate=service["data"]["isServiceEnabled"]
                                        else:
                                            servicestate="ERROR"
                                        if "primary" in service["data"] and "gatewayPublicIp" in service["data"]["primary"]:    
                                            if gateway["ipAddress"] == service["data"]["primary"]["gatewayPublicIp"]:
                                                primaryGWname = gateway["name"]
                                                primaryGWIP = gateway["ipAddress"]
                                                secondaryGWname= ""
                                                secondaryGWIP = ""
                                                if servicestate != "ERROR":
                                                    serviceIP = service["data"]["primary"]["dataCenterPublicIp"]
                                                    if "secondary" in service["data"]:
                                                        serviceIP = serviceIP + "," +service["data"]["secondary"]["dataCenterPublicIp"]
                                            else:
                                                secondaryGWname = gateway["name"]
                                                secondaryGWIP = gateway["ipAddress"]
                                                primaryGWname= ""
                                                primaryGWIP = ""
                                                if servicestate != "ERROR":
                                                    serviceIP = service["data"]["primary"]["dataCenterPublicIp"]
                                                    if "secondary" in service["data"]:
                                                        serviceIP = serviceIP + "," +service["data"]["secondary"]["dataCenterPublicIp"]
                                        networks = ""
                                        if "subnets" in service["data"]:
                                            for network in service["data"]["subnets"]:
                                                networks = f'{networks}{network["cidrIp"]}/{network["cidrPrefix"]}, '
                                        for profile in service["configuration"]:
                                            write_profiles+= profile["name"] + ","
                                        if write_profiles=="":
                                            write_profiles = "NOT USED"
                                        print(f'{enterprise["name"]};{service["name"]};{servicestate};{primaryGWname}-{primaryGWIP};{secondaryGWname}-{secondaryGWIP};{newGWname};{write_profiles};;;{url};;{serviceIP};{networks}')
                                        tunnel_list.append({
                                            "enterprise": enterprise["name"],
                                            "nsd_name": service["name"],
                                            "enabled": servicestate,
                                            "primary_vcg_name": primaryGWname + "-" + primaryGWIP,
                                            "secondary_vcg_name": secondaryGWname + "-" + secondaryGWIP,
                                            "new_vcg_name":"",
                                            "profiles": write_profiles,
                                            "status":"",
                                            "decomm":"",
                                            "vco": url,
                                            "service": "",
                                            "service_IP": serviceIP,
                                            "nsd": networks
                                            })
                                        write_profiles = ""
                    for entass in gateway["enterpriseAssociations"]:
                        if entass["gatewayType"] != "DATACENTER":
                            super_list.append({
                                "vcg":gateway["name"],
                                "customer": entass["name"]
                                })
                            enterprise_associations.append(entass["name"])
                    logging.debug(f'{gateway["name"]} - customer list - {customers}')
                    logging.debug(f'{gateway["name"]} - super list - {enterprise_associations}')
            encodedfile = vcg_migration(tunnel_list, vcg_list, super_list)
            filename = create_filename("vcg_migration", "xlsx")
            #return Response(gateways)
        except Exception as exception:
            return Response({
                "message":
                    f"Failed to get VCO report: {exception}",
                "userMessage":
                    "VCO report not finished"
                    })
        return Response({
                "message":
                    "VCO report finished",
                "userMessage":
                    "VCO report is finished, it will be sent via email",
                    "filename":filename,
                "data": [{
                    "type":
                        "application/vnd.ms-excel",
                    "value":
                        encodedfile
                        }]})

class msimLicense(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []`
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        # List of all VCO URLs to loop through
        VCO_URLS = [
            "https://vco160-usca1.velocloud.net/",
            "https://vco109-usca1.velocloud.net/",
            "https://vco206-fra1.velocloud.net/",
            "https://vco128-usvi1.velocloud.net/",
            "https://vco7-sin1.velocloud.net/",
            "https://vco8-fra1.velocloud.net/",
            "https://vco21-usvi1.velocloud.net/",
            "https://vco22-fra1.velocloud.net/",
            "https://vco129-usvi1.velocloud.net/",
        ]

        # params = parsed.data.get("params", [])  # Removed unused variable
        data_file = []
        user = parsed.data.get("user") if "user" in parsed.data else None
        password = parsed.data.get("password") if "password" in parsed.data else None

        # If user/password not in parsed.data, fallback to get_credentials
        if not user or not password:
            user, password, _, _ = get_credentials(request)

        try:
            for vco_url in VCO_URLS:
                ses = get_session(user, password, url=vco_url)
                all_customers = get_all_customers(vco_url, ses)
                customerList = {}
                if all_customers != "enterpriseaccessonly":
                    for item in all_customers:
                        if item["enterpriseName"] not in customerList:
                            customerList[item["enterpriseName"]] = item["enterpriseId"]
                    for customer in customerList:
                        tenant_id = customerList.get(customer)
                        all_resp = get_all_edges_licenses(vco_url, ses, tenant_id)
                        for edge in all_resp:
                            if edge.get("licenses"):
                                for license in edge["licenses"]:
                                    region_raw = license.get("detail", "")
                                    license_region = region_raw[12:-14] if len(region_raw) > 26 else ""
                                    data_file.append([
                                        vco_url, customer, edge.get("enterpriseId"), edge.get("name"),
                                        license.get("alias"), license.get("termMonths"), license.get("bandwidthTier"), license_region,
                                        license.get("edition"), edge.get("softwareVersion"), edge.get("factorySoftwareVersion"),
                                        edge.get("serialNumber"), edge.get("haSerialNumber"), edge.get("modelNumber"), edge.get("edgeState"),
                                        edge.get("activationTime"), edge.get("haState"),
                                        edge.get("site", {}).get("streetAddress"), edge.get("site", {}).get("streetAddress2"),
                                        edge.get("site", {}).get("state"), edge.get("site", {}).get("postalCode"),
                                        edge.get("site", {}).get("country"), edge.get("site", {}).get("lat"), edge.get("site", {}).get("lon")
                                    ])
                            else:
                                empty_list = ""
                                data_file.append([
                                    vco_url, customer, edge.get("enterpriseId"), edge.get("name"),
                                    empty_list, empty_list, empty_list, empty_list,
                                    empty_list, edge.get("softwareVersion"), edge.get("factorySoftwareVersion"),
                                    edge.get("serialNumber"), edge.get("haSerialNumber"), edge.get("modelNumber"), edge.get("edgeState"),
                                    edge.get("activationTime"), edge.get("haState"),
                                    edge.get("site", {}).get("streetAddress"), edge.get("site", {}).get("streetAddress2"),
                                    edge.get("site", {}).get("state"), edge.get("site", {}).get("postalCode"),
                                    edge.get("site", {}).get("country"), edge.get("site", {}).get("lat"), edge.get("site", {}).get("lon")
                                ])
        except Exception as exception:
            return Response({
                "message": f"Failed to generate MSIM license report: {exception}",
                "userMessage": "MSIM license report generation failed"
            })

        # Generate the Excel file and filename before returning the response
        try:
            encodedfile = all_msim_license(data_file)
            filename = create_filename(f"all_vco_licenses_{datetime.now().strftime('%Y%m%d')}", "xlsx")
        except Exception as exception:
            return Response({
                "message": f"Failed to generate Excel file: {exception}",
                "userMessage": "MSIM license report generation failed"
            })

        return Response({
            "message": "All VCO licenses report finished",
            "userMessage": "All VCO licenses report is finished, it will be sent via email",
            "filename": filename,
            "data": [{
                "type": "application/vnd.ms-excel",
                "value": encodedfile
            }]
        })


@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class EdgeProvision(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        user, password, url, _tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        edges_array_nv = []
        for param in data["params"]:
            if param["type"] == "json" and param["name"] == "edge_list":
                edges_array_nv = param["value"]
            elif param["type"] == "base64" and param["name"] == "edge_list":
                strinput = base64.b64decode(param["value"]).decode("utf-8")
                strinput = strinput.replace('\t', '')
                strinput = strinput.replace('\n', '')
                try:
                    edges_array_nv = json.loads(strinput)
                except ValueError as exception:
                    return Response({
                        "message":
                            f"Failed to create edge appliances JSON incorrect: {exception}",
                        "userMessage":
                            "Edge creation failed"
                            })
        # Ensure loopbackInterfaces is present in each edge data
        for edge_data in edges_array_nv:
            if "loopbackInterfaces" not in edge_data:
                edge_data["loopbackInterfaces"] = {}
            if "bgp" not in edge_data:
                edge_data["bgp"] = {}
        edges_array = serializers.SingleEdgeProvisioning(data=edges_array_nv, many=True)
        edges_array.is_valid(raise_exception=True)
        response_lst = []
        for newedge in edges_array.data:
            edge = create_edge(url, ses, newedge["site"])
            if "error" in edge:
                if "data" in edge["error"]:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was not "
                            "provisioned", 'message':
                            edge["error"]["data"]["error"][0]["message"]
                            })
                else:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was not "
                            "provisioned", 'message':
                            edge["error"]["message"]
                            })
                continue
            #update descriptionpr
            descriptionbody = {
                "id":int(edge["id"]),
                "_update":{
                    "description": newedge["description"]
                },
                "enterpriseId":int(newedge["site"]["enterpriseId"])
            }
            result = update_edge_attributes(url, ses, descriptionbody)
            if "error" in result:
                if "data" in result["error"]:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was NOT "
                            "fully provisioned", 'message':
                            result["error"]["data"]["error"][0]["message"]
                            })
                else:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was NOT "
                            "fully provisioned", 'message':
                            result["error"]["message"]
                            })
                continue
            #update interfaces
            json_list = json.loads(json.dumps(get_edge_config_stack(url, ses, int(newedge["site"]["enterpriseId"]), edge["id"]), ensure_ascii=True).encode("utf8"))
            json_data = {}
            json_data[0] = json_list[0]
            json_data[1] = json_list[1]
            #jspath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")].data.routedInterfaces')
            modulepath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")]')
            mresult = modulepath.find(json_data)
            origdata = {}
            for match in mresult:
                origdata = match.value
            newRoutedInterfaces = []
            if "loopbackInterfaces" in newedge:
                origdata["data"]["loopbackInterfaces"] = newedge["loopbackInterfaces"]
            else:
                print("loopback not defined")
            for interface in origdata["data"]["routedInterfaces"]:
                update = False
                for newIface in newedge["routedInterfaces"]:
                    if interface["name"] == newIface["name"]:
                        update = True
                        newRoutedInterfaces.append(newIface)
                    else:
                        continue
                if not update:
                    newRoutedInterfaces.append(interface)
            origdata["data"]["routedInterfaces"] = newRoutedInterfaces
            if origdata["data"]["lan"]["networks"][0]["cidrIp"] is None:
                origdata["data"]["lan"]["networks"][0]["cidrIp"] = "169.254.123.1"
                origdata["data"]["lan"]["networks"][0]["advertise"] = False
                origdata["data"]["lan"]["networks"][0]["override"] = True
            modulepath.update(json_data, origdata)
            if "refs" in origdata:
                json_body = {
                    "id": origdata["id"],
                    "enterpriseId": int(newedge["site"]["enterpriseId"]),
                    "_update": { "data": origdata["data"],
                                "name": "deviceSettings",
                                "refs": origdata["refs"]
                    }
                }
            else:
                json_body = {
                    "id": origdata["id"],
                    "enterpriseId": int(newedge["site"]["enterpriseId"]),
                    "_update": { "data": origdata["data"],
                                "name": "deviceSettings"
                    }
                }
            print(f'updating edge:{edge["id"]}')
            result = update_edge_config(url, ses, json_body)
            if "error" in result:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was NOT "
                        "fully provisioned - Interfaces", 'message':
                        result["error"]["data"]["error"][0]["message"]
                        })
                continue
            wanmodule = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="WAN")]')
            wanr = wanmodule.find(json_data)
            wandata = {}
            for match in wanr:
                wandata = match.value
            wan_json_body = {
                "id": wandata["id"],
                "enterpriseId": int(newedge["site"]["enterpriseId"]),
                "_update": { "data": {
                "links": newedge["links"]},
                            "name": "WAN",
                            "refs": None,
                            "description": None
                            }
            }
            print(f'updating wan edge module edge:{edge["id"]}')
            result = update_edge_config(url, ses, wan_json_body)
            if "error" in result:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was NOT "
                        "fully provisioned - WAN", 'message':
                        result["error"]["data"]["error"][0]["message"]
                        })
                continue
            else:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was "
                        "provisioned", 'message': 
                            f"{newedge['site']['name']} activation key: {edge['activationKey']}"
                        })
        return Response(response_lst)

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class AAEdgeProvision(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        user, password, url, _tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        edges_array_nv = []
        for param in data["params"]:
            if param["type"] == "json" and param["name"] == "edge_list":
                edges_array_nv = param["value"]
            elif param["type"] == "base64" and param["name"] == "edge_list":
                strinput = base64.b64decode(param["value"]).decode("utf-8")
                strinput = strinput.replace('\t', '')
                strinput = strinput.replace('\n', '')
                try:
                    edges_array_nv = json.loads(strinput)
                except ValueError as exception:
                    return Response({
                        "message":
                            f"Failed to create edge appliances JSON incorrect: {exception}",
                        "userMessage":
                            "Edge creation failed"
                            })
        # Ensure loopbackInterfaces is present in each edge data
        for edge_data in edges_array_nv:
            if "loopbackInterfaces" not in edge_data:
                edge_data["loopbackInterfaces"] = {}
            if "bgp" not in edge_data:
                edge_data["bgp"] = {}
        edges_array = serializers.SingleEdgeProvisioning(data=edges_array_nv, many=True)
        edges_array.is_valid(raise_exception=True)
        response_lst = []
        for newedge in edges_array.data:
            edge = create_edge(url, ses, newedge["site"])
            if "error" in edge:
                if "data" in edge["error"]:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was not "
                            "provisioned", 'message':
                            edge["error"]["data"]["error"][0]["message"]
                            })
                else:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was not "
                            "provisioned", 'message':
                            edge["error"]["message"]
                            })
                continue
            #update descriptionpr
            descriptionbody = {
                "id":int(edge["id"]),
                "_update":{
                    "description": newedge["description"]
                },
                "enterpriseId":int(newedge["site"]["enterpriseId"])
            }
            result = update_edge_attributes(url, ses, descriptionbody)
            if "error" in result:
                if "data" in result["error"]:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was NOT "
                            "fully provisioned", 'message':
                            result["error"]["data"]["error"][0]["message"]
                            })
                else:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was NOT "
                            "fully provisioned", 'message':
                            result["error"]["message"]
                            })
                continue
            #update interfaces
            json_list = json.loads(json.dumps(get_edge_config_stack(url, ses, int(newedge["site"]["enterpriseId"]), edge["id"]), ensure_ascii=True).encode("utf8"))
            json_data = {}
            json_data[0] = json_list[0]
            json_data[1] = json_list[1]
            #jspath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")].data.routedInterfaces')
            modulepath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")]')
            mresult = modulepath.find(json_data)
            origdata = {}
            for match in mresult:
                origdata = match.value
            newRoutedInterfaces = []
            if "loopbackInterfaces" in newedge:
                origdata["data"]["loopbackInterfaces"] = newedge["loopbackInterfaces"]
            else:
                print("loopback not defined")
            for interface in origdata["data"]["routedInterfaces"]:
                update = False
                for newIface in newedge["routedInterfaces"]:
                    if interface["name"] == newIface["name"]:
                        update = True
                        newRoutedInterfaces.append(newIface)
                        # If GE1 is present in newedge["routedInterfaces"], add GE1 as well
                        if not update:
                            newRoutedInterfaces.append(interface)
                    # After the for interface loop, add GE1 if present in newedge["routedInterfaces"]
                    ge1_iface = next((iface for iface in newedge["routedInterfaces"] if iface.get("name") == "GE1"), None)
                    if ge1_iface and ge1_iface not in newRoutedInterfaces:
                        newRoutedInterfaces.append(ge1_iface)
                    else:
                        continue
                if not update:
                    newRoutedInterfaces.append(interface)
            origdata["data"]["routedInterfaces"] = newRoutedInterfaces
            if origdata["data"]["lan"]["networks"][0]["cidrIp"] is None:
                origdata["data"]["lan"]["networks"][0]["cidrIp"] = "198.51.100.1"
                origdata["data"]["lan"]["networks"][0]["cidrPrefix"] = 32
                origdata["data"]["lan"]["networks"][0]["advertise"] = False
                origdata["data"]["lan"]["networks"][0]["override"] = True
                origdata["data"]["lan"]["networks"][0]["netmask"] = "255.255.255.255"
            # Update bgp in Global Segment with newedge["bgp"]
            # Only update BGP if newedge has bgp, asNumber, and neighbors
            #print(origdata)
            if (
                "bgp" in newedge
                and isinstance(newedge["bgp"], dict)
                and newedge["bgp"].get("asNumber")
                and newedge["bgp"].get("neighbors")
            ):
                # Find the Global Segment in origdata["data"]["segments"]
                for segment in origdata["data"]["segments"]:
                    if segment.get("segment", {}).get("name") == "Global Segment":
                        # Prepare BGP config
                        neighbors = []
                        if newedge.get("bgp", {}).get("neighbors"):
                            for neighbor_data in newedge["bgp"]["neighbors"]:
                                md5_password = neighbor_data.get("md5Password", "")
                                # Only enable MD5 if md5_password is not empty, not "FALSE", and not "False"
                                enable_md5 = bool(md5_password) and str(md5_password).upper() != "FALSE"
                                neighbor = {
                                    "neighborAS": str(neighbor_data.get("remoteAs", "")),
                                    "uplink": True,
                                    "neighborTag": "UPLINK",
                                    "defaultRouteFilterIds": ["sameAsOutbound"],
                                    "neighborIp": neighbor_data.get("neighborIp", ""),
                                    "maxHop": "1",
                                    "inboundFilter": {
                                        "ids": []
                                    },
                                    "outboundFilter": {
                                        "ids": []
                                    }
                                }
                                # Only include enableMd5 and md5Password if enable_md5 is True
                                if enable_md5:
                                    neighbor["enableMd5"] = True
                                    neighbor["md5Password"] = md5_password
                                neighbors.append(neighbor)
                        # Generate UUID for filter id
                        filter_id = str(uuid.uuid4())
                        # Get ASN and routerId from input
                        asn = str(newedge.get("bgp", {}).get("asNumber", ""))
                        # Try to get loopback IP for routerId
                        loopback = ""
                        if newedge.get("loopbackInterfaces"):
                            # Try to get first loopback IP
                            for lb in newedge["loopbackInterfaces"].values():
                                if lb.get("cidrIp"):
                                    loopback = lb["cidrIp"]
                                    break
                        # Compose BGP config
                        bgp_config = {
                            "aggregation": [],
                            "defaultRoute": {
                                "enabled": False,
                                "advertise": "CONDITIONAL",
                                "defaultRouteFilterIds": ["sameAsOutbound"]
                            },
                            "enabled": True,
                            "ASN": asn,
                            "networks": [],
                            "neighbors": [],
                            "filters": [
                                {
                                    "id": filter_id,
                                    "name": "DENY_ALL",
                                    "rules": [
                                        {
                                            "match": {
                                                "type": "PREFIX",
                                                "value": "0.0.0.0/0",
                                                "exactMatch": False
                                            },
                                            "action": {
                                                "type": "DENY",
                                                "values": [],
                                                "communityAdditive": False
                                            }
                                        }
                                    ]
                                }
                            ],
                            "routerId": loopback,
                            "overlayPrefix": False,
                            "disableASPathCarryOver": False,
                            "uplinkCommunity": "400:40999",
                            "connectedRoutes": True,
                            "propagateUplink": False,
                            "ospf": {
                                "enabled": True,
                                "metric": 20
                            },
                            "asn": None,
                            "override": True,
                            "isEdge": False,
                            "keepalive": "3",
                            "holdtime": "9",
                            "enableGracefulRestart": False,
                            "v6Detail": {
                                "connectedRoutes": True,
                                "ospf": {
                                    "enabled": False,
                                    "metric": 20
                                },
                                "overlayPrefix": True,
                                "propagateUplink": False,
                                "disableASPathCarryOver": False,
                                "defaultRoute": {
                                    "enabled": False,
                                    "advertise": "CONDITIONAL",
                                    "defaultRouteFilterIds": ["sameAsOutbound"]
                                },
                                "neighbors": [],
                                "networks": []
                            }
                        }
                        # Add neighbors if present
                        if neighbors:
                            for neighbor in neighbors:
                                neighbor["inboundFilter"]["ids"] = [filter_id]
                                neighbor["outboundFilter"]["ids"] = [filter_id]
                                bgp_config["neighbors"].append(neighbor)
                        segment["bgp"] = bgp_config
                        print(segment["bgp"])
            modulepath.update(json_data, origdata)
            if "refs" in origdata:
                json_body = {
                    "id": origdata["id"],
                    "enterpriseId": int(newedge["site"]["enterpriseId"]),
                    "_update": { "data": origdata["data"],
                                "name": "deviceSettings",
                                "refs": origdata["refs"]
                    }
                }
            else:
                json_body = {
                    "id": origdata["id"],
                    "enterpriseId": int(newedge["site"]["enterpriseId"]),
                    "_update": { "data": origdata["data"],
                                "name": "deviceSettings"
                    }
                }
            print(f'updating edge:{edge["id"]}')
            result = update_edge_config(url, ses, json_body)
            if "error" in result:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was NOT "
                        "fully provisioned - Interfaces", 'message':
                        result["error"]["data"]["error"][0]["message"]
                        })
                continue
            wanmodule = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="WAN")]')
            wanr = wanmodule.find(json_data)
            wandata = {}
            for match in wanr:
                wandata = match.value
            wan_json_body = {
                "id": wandata["id"],
                "enterpriseId": int(newedge["site"]["enterpriseId"]),
                "_update": { "data": {
                "links": newedge["links"]},
                            "name": "WAN",
                            "refs": None,
                            "description": None
                            }
            }
            print(f'updating wan edge module edge:{edge["id"]}')
            result = update_edge_config(url, ses, wan_json_body)
            if "error" in result:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was NOT "
                        "fully provisioned - WAN", 'message':
                        result["error"]["data"]["error"][0]["message"]
                        })
                continue
            else:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was "
                        "provisioned", 'message': 
                            f"{newedge['site']['name']} activation key: {edge['activationKey']}"
                        })            
                
            
            result = set_edge_software(url, ses, int(newedge["site"]["enterpriseId"]), edge["id"], 43649, 1 )  #10232 is software version ID
            if "error" in result:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was NOT "
                        "fully provisioned - WAN", 'message':
                        result["error"]["data"]["error"][0]["message"]
                        })
                continue
            else:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was "
                        "provisioned", 'message': 
                            f"{newedge['site']['name']} activation key: {edge['activationKey']}"
                        })
        return Response(response_lst)



@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class EdgeProvisionCitizens(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        current_all_edges_list = get_all_edges_configs_only(url, ses, tenant_id)
        edges_array_nv = []
        for param in data["params"]:
            if param["type"] == "json" and param["name"] == "edge_list":
                edges_array_nv = param["value"]
            elif param["type"] == "base64" and param["name"] == "edge_list":
                strinput = base64.b64decode(param["value"]).decode("utf-8")
                strinput = strinput.replace('\t', '')
                strinput = strinput.replace('\n', '')
                try:
                    edges_array_nv = json.loads(strinput)
                except ValueError as exception:
                    return Response({
                        "message":
                            f"Failed to create edge appliances JSON incorrect: {exception}",
                        "userMessage":
                            "Edge creation failed"
                            })
        # Ensure loopbackInterfaces is present in each edge data
        for edge_data in edges_array_nv:
            if "loopbackInterfaces" not in edge_data:
                edge_data["loopbackInterfaces"] = {}
            if "bgp" not in edge_data:
                edge_data["bgp"] = {}
        
        edges_array = serializers.SingleEdgeProvisioning(data=edges_array_nv, many=True)
        edges_array.is_valid(raise_exception=True)
        response_lst = []
        for newedge in edges_array.data:
            edge = create_edge(url, ses, newedge["site"])
            if "error" in edge:
                if "data" in edge["error"]:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was not "
                            "provisioned", 'message':
                            edge["error"]["data"]["error"][0]["message"]
                            })
                else:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was not "
                            "provisioned", 'message':
                            edge["error"]["message"]
                            })
                continue
            #update description
            descriptionbody = {
                "id":int(edge["id"]),
                "_update":{
                    "description": newedge["description"]
                },
                "enterpriseId":int(newedge["site"]["enterpriseId"])
            }
            result = update_edge_attributes(url, ses, descriptionbody)
            if "error" in result:
                if "data" in result["error"]:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was NOT "
                            "fully provisioned", 'message':
                            result["error"]["data"]["error"][0]["message"]
                            })
                else:
                    response_lst.append({
                        'userMessage':
                            f"Edge with hostname: {newedge['site']['name']} was NOT "
                            "fully provisioned", 'message':
                            result["error"]["message"]
                            })
                continue
            #get config from old device:
            for old_edge in current_all_edges_list:
                if old_edge["name"] == newedge["old_edge"]:
                    old_edge_id = old_edge["id"]
                    print(old_edge_id)
                    break
            old_edge_json_list = json.loads(json.dumps(get_edge_config_stack(url, ses, int(newedge["site"]["enterpriseId"]), int(old_edge_id)), ensure_ascii=True).encode("utf8"))  
            old_edge_json_data = {}
            old_edge_json_data[0] = old_edge_json_list[0]
            old_edge_json_data[1] = old_edge_json_list[1]            
            old_edge_modulepath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")].data.routedInterfaces')
            old_edge_mresult = old_edge_modulepath.find(old_edge_json_data)
            old_edge_origdata = {}
            for old_edge_match in old_edge_mresult:
                old_edge_origdata = old_edge_match.value 
            old_edge_LAN_interface = [
                old_edge_interface for old_edge_interface in old_edge_origdata if old_edge_interface.get("name") == newedge["old_interface"]
            ]
            
            #update interfaces
            json_list = json.loads(json.dumps(get_edge_config_stack(url, ses, int(newedge["site"]["enterpriseId"]), edge["id"]), ensure_ascii=True).encode("utf8"))
            json_data = {}
            json_data[0] = json_list[0]
            json_data[1] = json_list[1]
            #jspath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")].data.routedInterfaces')
            modulepath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")]')
            mresult = modulepath.find(json_data)
            origdata = {}
            for match in mresult:
                origdata = match.value
            newRoutedInterfaces = []
            if "loopbackInterfaces" in newedge:
                origdata["data"]["loopbackInterfaces"] = newedge["loopbackInterfaces"]
            else:
                print("loopback not defined")
            for interface in origdata["data"]["routedInterfaces"]:
                update = False
                subinterfaces_desc = {}
                if interface["name"] == newedge["new_interface"]:
                    if "subinterfaces" in interface:
                        for sub in interface["subinterfaces"]:
                            sub_id = sub.get('subinterfaceId')
                            desc = sub.get('description', '')
                            subinterfaces_desc[sub_id] = desc
                for newIface in newedge["routedInterfaces"]:
                    if interface["name"] == newIface["name"]:
                        update = True
                        newRoutedInterfaces.append(newIface)
                    else:
                        continue
                if not update:
                    newRoutedInterfaces.append(interface)
                # Remove subinterface with id 1080 and move its addressing/segmentId to GE3
                for oldIface in old_edge_LAN_interface:
                    # Move fields from subinterfaceId 1080 to main interface oldIface["name"]
                    if "subinterfaces" in oldIface:
                        for sub in oldIface.get("subinterfaces", []):
                            sub_id = sub.get("subinterfaceId")
                            if sub_id in subinterfaces_desc:
                                sub["description"] = subinterfaces_desc[sub_id]
                        subinterfaces = oldIface["subinterfaces"]
                        sub1080 = None
                        for sub in subinterfaces:
                            if sub.get("subinterfaceId") == 1080:
                                sub1080 = sub
                                break
                        if sub1080:
                            fields_to_move = [
                                "addressing",
                                "segmentId",
                                "advertise",
                                "override",
                                "natDirect",
                                "rpf",
                                "trusted"
                            ]
                            for field in fields_to_move:
                                if field in sub1080:
                                    oldIface[field] = sub1080[field]
                            if "dhcpServer" in sub1080:
                                oldIface["dhcpServer"] = sub1080["dhcpServer"]
                                sub1080["description"] = "LAN interface - Native VLAN used for ABW - VLAN1080 DIA Segment DNS-proxy, NO NAT & Trusted source - Reverse Path not enabled & DHCP server"
                            if "description" in sub1080:
                                oldIface["description"] = sub1080["description"]
                            oldIface["subinterfaces"] = [
                                s for s in subinterfaces if s.get("subinterfaceId") != 1080
                            ]
                        for sub in subinterfaces:
                            if sub.get("subinterfaceId") == 1050:
                                sub["segmentId"] = 2
                        for sub in oldIface.get("subinterfaces", []):
                            sub_id = sub.get("subinterfaceId")
                            if sub_id in subinterfaces_desc:
                                sub["description"] = subinterfaces_desc[sub_id]
                    # --- Custom logic for configurationId 43133 ---
                    if (
                        interface["name"] == oldIface["name"]
                        and newedge["site"].get("configurationId") in ["43133", "44806"]
                    ):
                        # Move subinterface 1020 fields to main interface
                        if "subinterfaces" in oldIface:
                            sub1020 = None
                            for sub in oldIface["subinterfaces"]:
                                if sub.get("subinterfaceId") == 1020:
                                    sub1020 = sub
                                    break
                            if sub1020:
                                fields_to_move_1020 = [
                                    "addressing",
                                    "segmentId",
                                    "advertise",
                                    "override",
                                    "natDirect",
                                    "rpf",
                                    "trusted"
                                ]
                                for field in fields_to_move_1020:
                                    if field in sub1020:
                                        oldIface[field] = sub1020[field]
                                if "dhcpServer" in sub1020:
                                    oldIface["dhcpServer"] = sub1020["dhcpServer"]
                                if "description" in sub1020:
                                    oldIface["description"] = sub1020["description"]
                                # Remove subinterface 1020
                                oldIface["subinterfaces"] = [
                                    s for s in oldIface["subinterfaces"] if s.get("subinterfaceId") != 1020
                                ]
                        # Don't copy subinterface 1010, but create new VLAN interface in LAN networks
                        # Find subinterface 1010 and copy cidrIp, netmask, cidrPrefix
                        vlan1010_data = None
                        if "subinterfaces" in oldIface:
                            for sub in oldIface["subinterfaces"]:
                                if sub.get("subinterfaceId") == 1010:
                                    vlan1010_data = sub
                                    break
                        # Remove subinterface 1010 from oldIface["subinterfaces"]
                        if "subinterfaces" in oldIface and vlan1010_data:
                            oldIface["subinterfaces"] = [
                                s for s in oldIface["subinterfaces"] if s.get("subinterfaceId") != 1010
                            ]
                        # Update any existing vlanId 1010 in lan networks with values from vlan1010_data
                        for net in origdata["data"]["lan"]["networks"]:
                            if net.get("vlanId") == 1010 and vlan1010_data:
                                net["cidrIp"] = vlan1010_data.get("addressing", {}).get("cidrIp", net.get("cidrIp", ""))
                                # Only update cidrPrefix and netmask if vlan1010_data has those fields
                                if "addressing" in vlan1010_data:
                                    if "cidrPrefix" in vlan1010_data["addressing"]:
                                        net["cidrPrefix"] = vlan1010_data["addressing"]["cidrPrefix"]
                                    if "netmask" in vlan1010_data["addressing"]:
                                        net["netmask"] = vlan1010_data["addressing"]["netmask"]
                                if "dhcpServer" in vlan1010_data:
                                    net["dhcp"] = {
                                        "options": [],
                                        "dhcpRelay": {
                                            "enabled": True,
                                            "servers": [
                                                "10.122.14.25",
                                                "10.121.14.31",
                                                "10.121.14.94",
                                                "10.122.14.94"
                                            ],
                                            "sourceFromSecondaryIp": False
                                        },
                                        "enabled": True,
                                        "leaseTimeSeconds": 86400,
                                        "override": True
                                    }
                        # Create new VLAN 1010 interface if vlan1010_data exists
                    if interface["name"] == oldIface["name"]:
                        update = True
                        newRoutedInterfaces = [
                            oldIface if iface["name"] == oldIface["name"] else iface
                            for iface in newRoutedInterfaces
                        ]
                    else:
                        continue
            origdata["data"]["routedInterfaces"] = newRoutedInterfaces
            if origdata["data"]["lan"]["networks"][0]["cidrIp"] is None:
                origdata["data"]["lan"]["networks"][0]["cidrIp"] = "198.51.100.1"
                origdata["data"]["lan"]["networks"][0]["advertise"] = False
                origdata["data"]["lan"]["networks"][0]["override"] = True
            # Set managementTraffic sourceInterface 
            origdata["data"]["lan"]["managementTraffic"] = {
                "sourceInterface": "LO1"
            }
            modulepath.update(json_data, origdata)
            print(origdata)
            if "refs" in origdata:
                json_body = {
                    "id": origdata["id"],
                    "enterpriseId": int(newedge["site"]["enterpriseId"]),
                    "_update": { "data": origdata["data"],
                                "name": "deviceSettings",
                                "refs": origdata["refs"]
                    }
                }
            else:
                json_body = {
                    "id": origdata["id"],
                    "enterpriseId": int(newedge["site"]["enterpriseId"]),
                    "_update": { "data": origdata["data"],
                                "name": "deviceSettings"
                    }
                }
            print(f'updating edge:{edge["id"]}')
            result = update_edge_config(url, ses, json_body)
            if "error" in result:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was NOT "
                        "fully provisioned - Interfaces", 'message':
                        result["error"]["data"]["error"][0]["message"]
                        })
                continue
            wanmodule = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="WAN")]')
            wanr = wanmodule.find(json_data)
            wandata = {}
            for match in wanr:
                wandata = match.value
            wan_json_body = {
                "id": wandata["id"],
                "enterpriseId": int(newedge["site"]["enterpriseId"]),
                "_update": { "data": {
                "links": newedge["links"]},
                            "name": "WAN",
                            "refs": None,
                            "description": None
                            }
            }
            print(f'updating wan edge module edge:{edge["id"]}')
            result = update_edge_config(url, ses, wan_json_body)
            result = set_edge_software(url, ses, int(newedge["site"]["enterpriseId"]), edge["id"], 45229, 1 )  #45229 is software version ID
            if "error" in result:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was NOT "
                        "fully provisioned - WAN", 'message':
                        result["error"]["data"]["error"][0]["message"]
                        })
                continue
            else:
                response_lst.append({
                    'userMessage':
                        f"Edge with hostname: {newedge['site']['name']} was "
                        "provisioned", 'message': 
                            f"{newedge['site']['name']} activation key: {edge['activationKey']}"
                        })
        return Response(response_lst)

@method_decorator(name="post", decorator=swagger_auto_schema(tags=["v1"]))
class AdidasLMAC(generics.GenericAPIView):
    """
    Sample request, requires a single parameter with name "csv":
    {
        "params": []
        ],
        "devices": [ (Optional){hostname1}, {hostname2}
        ]
    }
    """
    permission_classes = []
    serializer_class = serializers.RAGenericInput

    def post(self, request):
        """ post method """
        parsed = self.get_serializer(data=request.data)
        parsed.is_valid(raise_exception=True)
        data = parsed.data
        devices = [device["hostname"] for device in data.get("devices", [])]
        user, password, url, tenant_id = get_credentials(request)
        ses = get_session(user, password, url=url)
        completed=0
        try:
            all_edges_list = get_all_edges_configs(url, ses, tenant_id)
            for edge in all_edges_list:
                completed += 1
                includedhostnames = devices
                if edge["name"] not in includedhostnames:
                    print(f'skipping {edge["name"]} of {completed}/{len(all_edges_list)}')
                    continue
                else:
                    print(f'doing {edge["name"]} of {completed}/{len(all_edges_list)}')
                update = True
                json_list = json.loads(json.dumps(
                    get_edge_config_stack(
                        url, ses, tenant_id, edge["id"]), ensure_ascii=True).encode("utf8"))
                #new BP_policy:
                json_data = {}
                json_data[0] = json_list[0]
                json_data[1] = json_list[1]
                
                # First, extract CSS logicalId from deviceSettings
                modulepath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="deviceSettings")]')
                mresult = modulepath.find(json_data)
                module = {}
                for match in mresult:
                    module = match.value
                configurationId = module.get("configurationId") if module else None
                # Find Global Segment and extract CSS provider logicalId
                logicalId = None
                for segment in module["data"]["segments"]:
                    if segment["segment"]["name"] == "Global Segment":
                        css_provider = segment.get("css", {}).get("provider", {})
                        logicalId = css_provider.get("logicalId")
                        break
                
                print(f"CSS logicalId: {logicalId}")
                if not logicalId:
                    update = False
                    print(f"Edge {edge['name']} didn't find CSS provider")
                
                # Now parse QOS module
                modulepath = ext.parse('$[?(@.name=="Edge Specific Profile")].modules[?(@.name=="QOS")]')
                mresult = modulepath.find(json_data)
                module = {}
                insertModule = False
                for match in mresult:
                    module = match.value
                
                
                # Define new bypass policy
                new_BP = [
                                    {
                                        "name": "Omnihub",
                                        "match": {
                                            "sip": "any",
                                            "sport_high": -1,
                                            "sport_low": -1,
                                            "ssm": "255.255.255.255",
                                            "svlan": -1,
                                            "sInterface": "",
                                            "os_version": -1,
                                            "s_rule_type": "prefix",
                                            "sip_prenat_enabled": 0,
                                            "dip": "any",
                                            "dport_high": -1,
                                            "dport_low": -1,
                                            "dAddressGroup": "bb56cd23-9c96-417b-bddb-27b539911ec0",
                                            "dsm": "255.255.255.255",
                                            "dvlan": -1,
                                            "dInterface": "",
                                            "hostname": "",
                                            "proto": -1,
                                            "d_rule_type": "prefix",
                                            "dip_prenat_enabled": 0,
                                            "appid": -1,
                                            "classid": -1,
                                            "dscp": -1,
                                            "ipVersion": "IPv4"
                                        },
                                        "action": {
                                            "QoS": {
                                                "txScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "rxScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "type": "transactional"
                                            },
                                            "sla": {
                                                "latencyMs": "0",
                                                "lossPct": "0.0",
                                                "jitterMs": "0"
                                            },
                                            "edgeToEdgeEncryption": True,
                                            "edge2CloudRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {
                                                    "logicalId": logicalId,
                                                    "type": "cloudSecurityService",
                                                    "bypassGateway": False
                                                },
                                                "routePolicy": "backhaul",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": "CS0",
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2DataCenterRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": "CS0",
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2EdgeRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": "CS0",
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "routeType": "edge2Cloud",
                                            "natIpVersion": None,
                                            "nat": {
                                                "destIp": "no",
                                                "sourceIp": "no"
                                            },
                                            "allowConditionalBh": False,
                                            "userDisableConditionalBh": False
                                        }
                                    },
                                    {
                                        "name": "Meraki_Direct",
                                        "match": {
                                            "sip": "any",
                                            "sport_high": -1,
                                            "sport_low": -1,
                                            "ssm": "255.255.255.255",
                                            "svlan": -1,
                                            "sInterface": "",
                                            "os_version": -1,
                                            "s_rule_type": "prefix",
                                            "sip_prenat_enabled": 0,
                                            "dip": "any",
                                            "dport_high": -1,
                                            "dport_low": -1,
                                            "dAddressGroup": "bd316ecb-6f9c-49bd-8e2e-5b0a86b001e5",
                                            "dsm": "255.255.255.255",
                                            "dvlan": -1,
                                            "dInterface": "",
                                            "hostname": "",
                                            "proto": -1,
                                            "d_rule_type": "prefix",
                                            "dip_prenat_enabled": 0,
                                            "appid": -1,
                                            "classid": -1,
                                            "dscp": -1,
                                            "ipVersion": "IPv4"
                                        },
                                        "action": {
                                            "QoS": {
                                                "txScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "rxScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "type": "transactional"
                                            },
                                            "sla": {
                                                "latencyMs": "0",
                                                "lossPct": "0.0",
                                                "jitterMs": "0"
                                            },
                                            "edge2CloudRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "direct",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2DataCenterRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2EdgeRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "routeType": "edge2Cloud",
                                            "natIpVersion": None,
                                            "nat": {
                                                "destIp": "no",
                                                "sourceIp": "no"
                                            },
                                            "allowConditionalBh": False,
                                            "userDisableConditionalBh": False,
                                            "edgeToEdgeEncryption": True
                                        }
                                    },
                                    {
                                        "name": "YouTube_Direct",
                                        "match": {
                                            "sip": "any",
                                            "sport_high": -1,
                                            "sport_low": -1,
                                            "ssm": "255.255.255.255",
                                            "svlan": -1,
                                            "sInterface": "",
                                            "os_version": -1,
                                            "s_rule_type": "prefix",
                                            "sip_prenat_enabled": 0,
                                            "dip": "any",
                                            "dport_high": -1,
                                            "dport_low": -1,
                                            "dsm": "255.255.255.255",
                                            "dvlan": -1,
                                            "dInterface": "",
                                            "hostname": "",
                                            "proto": -1,
                                            "d_rule_type": "prefix",
                                            "dip_prenat_enabled": 0,
                                            "appid": 240,
                                            "classid": 12,
                                            "dscp": -1,
                                            "ipVersion": "IPv4"
                                        },
                                        "action": {
                                            "QoS": {
                                                "txScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "low"
                                                },
                                                "rxScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "low"
                                                },
                                                "type": "transactional"
                                            },
                                            "sla": {
                                                "latencyMs": "0",
                                                "lossPct": "0.0",
                                                "jitterMs": "0"
                                            },
                                            "edge2CloudRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "direct",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2DataCenterRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2EdgeRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "routeType": "edge2Cloud",
                                            "natIpVersion": None,
                                            "nat": {
                                                "destIp": "no",
                                                "sourceIp": "no"
                                            },
                                            "allowConditionalBh": False,
                                            "userDisableConditionalBh": False,
                                            "edgeToEdgeEncryption": True
                                        }
                                    },
                                    {
                                        "name": "TikTok_Direct",
                                        "match": {
                                            "sip": "any",
                                            "sport_high": -1,
                                            "sport_low": -1,
                                            "ssm": "255.255.255.255",
                                            "svlan": -1,
                                            "sInterface": "",
                                            "os_version": -1,
                                            "s_rule_type": "prefix",
                                            "sip_prenat_enabled": 0,
                                            "dip": "any",
                                            "dport_high": -1,
                                            "dport_low": -1,
                                            "dsm": "255.255.255.255",
                                            "dvlan": -1,
                                            "dInterface": "",
                                            "hostname": "",
                                            "proto": -1,
                                            "d_rule_type": "prefix",
                                            "dip_prenat_enabled": 0,
                                            "appid": 3497,
                                            "classid": 16,
                                            "dscp": -1,
                                            "ipVersion": "IPv4"
                                        },
                                        "action": {
                                            "QoS": {
                                                "txScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "low"
                                                },
                                                "rxScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "low"
                                                },
                                                "type": "transactional"
                                            },
                                            "sla": {
                                                "latencyMs": "0",
                                                "lossPct": "0.0",
                                                "jitterMs": "0"
                                            },
                                            "edge2CloudRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "direct",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2DataCenterRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2EdgeRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "routeType": "edge2Cloud",
                                            "natIpVersion": None,
                                            "nat": {
                                                "destIp": "no",
                                                "sourceIp": "no"
                                            },
                                            "allowConditionalBh": False,
                                            "userDisableConditionalBh": False,
                                            "edgeToEdgeEncryption": True
                                        }
                                    },
                                    {
                                        "name": "Netflix_Direct",
                                        "match": {
                                            "sip": "any",
                                            "sport_high": -1,
                                            "sport_low": -1,
                                            "ssm": "255.255.255.255",
                                            "svlan": -1,
                                            "sInterface": "",
                                            "os_version": -1,
                                            "s_rule_type": "prefix",
                                            "sip_prenat_enabled": 0,
                                            "dip": "any",
                                            "dport_high": -1,
                                            "dport_low": -1,
                                            "dsm": "255.255.255.255",
                                            "dvlan": -1,
                                            "dInterface": "",
                                            "hostname": "",
                                            "proto": -1,
                                            "d_rule_type": "prefix",
                                            "dip_prenat_enabled": 0,
                                            "appid": 734,
                                            "classid": 12,
                                            "dscp": -1,
                                            "ipVersion": "IPv4"
                                        },
                                        "action": {
                                            "QoS": {
                                                "txScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "low"
                                                },
                                                "rxScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "low"
                                                },
                                                "type": "transactional"
                                            },
                                            "sla": {
                                                "latencyMs": "0",
                                                "lossPct": "0.0",
                                                "jitterMs": "0"
                                            },
                                            "edge2CloudRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "direct",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2DataCenterRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2EdgeRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "preferred",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "PUBLIC_WIRED",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "routeType": "edge2Cloud",
                                            "natIpVersion": None,
                                            "nat": {
                                                "destIp": "no",
                                                "sourceIp": "no"
                                            },
                                            "allowConditionalBh": False,
                                            "userDisableConditionalBh": False,
                                            "edgeToEdgeEncryption": True
                                        }
                                    },
                                    {
                                        "name": "Office365_Direct",
                                        "match": {
                                            "sip": "any",
                                            "sport_high": -1,
                                            "sport_low": -1,
                                            "ssm": "255.255.255.255",
                                            "svlan": -1,
                                            "sInterface": "",
                                            "os_version": -1,
                                            "s_rule_type": "prefix",
                                            "dip": "any",
                                            "dport_high": -1,
                                            "dport_low": -1,
                                            "dAddressGroup": "87da1d28-adcd-48ad-b0ca-23b1916be74e",
                                            "dsm": "255.255.255.255",
                                            "dvlan": -1,
                                            "dInterface": "",
                                            "hostname": "",
                                            "proto": -1,
                                            "d_rule_type": "prefix",
                                            "appid": -1,
                                            "classid": -1,
                                            "dscp": -1,
                                            "ipVersion": "IPv4"
                                        },
                                        "action": {
                                            "QoS": {
                                                "txScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "rxScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "type": "transactional"
                                            },
                                            "sla": {
                                                "latencyMs": "0",
                                                "lossPct": "0.0",
                                                "jitterMs": "0"
                                            },
                                            "edge2CloudRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "auto",
                                                "routeCfg": {},
                                                "routePolicy": "direct",
                                                "serviceGroup": "ALL",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2DataCenterRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "auto",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "ALL",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2EdgeRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "auto",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "ALL",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": None,
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "routeType": "edge2Cloud",
                                            "natIpVersion": None,
                                            "nat": {
                                                "destIp": "no",
                                                "sourceIp": "no"
                                            },
                                            "allowConditionalBh": False,
                                            "userDisableConditionalBh": False,
                                            "edgeToEdgeEncryption": True
                                        }
                                    },
                                    {
                                        "name": "INET_Offload",
                                        "match": {
                                            "sip": "any",
                                            "sport_high": -1,
                                            "sport_low": -1,
                                            "ssm": "255.255.255.255",
                                            "svlan": -1,
                                            "sInterface": "",
                                            "os_version": -1,
                                            "s_rule_type": "prefix",
                                            "dip": "any",
                                            "dport_high": -1,
                                            "dport_low": -1,
                                            "dsm": "255.255.255.255",
                                            "dvlan": -1,
                                            "dInterface": "",
                                            "hostname": "",
                                            "proto": -1,
                                            "d_rule_type": "prefix",
                                            "dip_prenat_enabled": 0,
                                            "appid": -1,
                                            "classid": -1,
                                            "dscp": -1,
                                            "ipVersion": "IPv4"
                                        },
                                        "action": {
                                            "QoS": {
                                                "txScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "rxScheduler": {
                                                    "bandwidth": -1,
                                                    "bandwidthCapPct": -1,
                                                    "queueLen": -1,
                                                    "burst": -1,
                                                    "latency": -1,
                                                    "priority": "normal"
                                                },
                                                "type": "transactional"
                                            },
                                            "sla": {
                                                "latencyMs": "0",
                                                "lossPct": "0.0",
                                                "jitterMs": "0"
                                            },
                                            "edgeToEdgeEncryption": True,
                                            "edge2CloudRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "auto",
                                                "routeCfg": {
                                                    "logicalId": logicalId,
                                                    "type": "cloudSecurityService",
                                                    "bypassGateway": False
                                                },
                                                "routePolicy": "backhaul",
                                                "serviceGroup": "ALL",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": "CS0",
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2DataCenterRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "auto",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "ALL",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": "CS0",
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "edge2EdgeRouteAction": {
                                                "interface": "auto",
                                                "subinterfaceId": -1,
                                                "linkInternalLogicalId": "auto",
                                                "linkPolicy": "auto",
                                                "routeCfg": {},
                                                "routePolicy": "auto",
                                                "serviceGroup": "ALL",
                                                "vlanId": -1,
                                                "wanlink": "auto",
                                                "linkCosLogicalId": None,
                                                "linkOuterDscpTag": "CS0",
                                                "linkInnerDscpTag": None,
                                                "icmpLogicalId": None,
                                                "wanLinkName": ""
                                            },
                                            "routeType": "edge2Cloud",
                                            "natIpVersion": None,
                                            "nat": {
                                                "destIp": "no",
                                                "sourceIp": "no"
                                            },
                                            "allowConditionalBh": False,
                                            "userDisableConditionalBh": False
                                        }
                                    }
                                ]
                
                if not module:
                    insertModule = True
                    print("insert of module", insertModule)
                    update = False
                    if insertModule:
                        json_body = {
                            "configurationId": int(configurationId),
                            "enterpriseId": int(tenant_id),
                            "name": "QOS",
                            "data": {
                                "segments": [
                                    {
                                        "segment": {
                                            "segmentId": 0,
                                            "name": "Global Segment",
                                            "type": "REGULAR"
                                        },
                                        "rules": new_BP
                                    }
                                ]
                            }
                        }
                        time.sleep(0.5)
                        print(f'inserting module for edge: {edge["name"]}')
                        result = insert_edge_module(url, ses, json_body)
                        print(f'{result}')
                else:
                    for segment in module["data"]["segments"]:
                        if segment["segment"]["name"] == "Global Segment":
                            segment["rules"] = new_BP
                    modulepath.update(json_data, module)
                    if update:
                        if "refs" in module:
                            json_body = {
                                "id": module["id"],
                                "enterpriseId": int(tenant_id),
                                "_update": { "data": module["data"],
                                            "name": "QOS",
                                            "refs": module["refs"]
                                }
                            }
                        else:
                            json_body = {
                                "id": module["id"],
                                "enterpriseId": int(tenant_id),
                                "_update": { "data": module["data"],
                                            "name": "QOS"
                                }
                            }
                        time.sleep(1)
                        print(f'updating edge:{edge["name"]}')
                        result = update_edge_config(url, ses, json_body)
                        print(f'{result}')
            # Collect update results for each edge
            update_results = []
            # Collect included hostnames dynamically from above
            for edge in all_edges_list:
                if edge["name"] in includedhostnames:
                    # After updating edge config, collect result
                    update_results.append(
                        f'updating edge: {edge["name"]}\nNew policy has been added. '
                    )
        except Exception as exception:
            return Response({
                "message": f"Configuration update failed to generate with message: {exception}",
                "userMessage": "Configuration update is not finished"
            })

        return Response({
            "message": "Configuration update finished",
            "userMessage": "Configuration update is finished, it will be sent via email",
            "data": update_results
        })


