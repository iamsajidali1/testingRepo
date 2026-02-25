"""Common utility functions."""
import sys
from base64 import b64decode
import logging
from csv import DictReader
from io import StringIO
import random
import string
import pandas as pd
import numpy as np
import pytz
import datetime
import time
import ipaddress
from os import environ
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests as req
from websocket._core import create_connection
from websocket._exceptions import WebSocketConnectionClosedException
import json


API_BASE = "portal/rest"

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)

proxies = {
    "http": environ.get("http_proxy"),
    "https": environ.get("https_proxy")
}

#testing asdaasdasdaasdasdasdsdsdasdasd

def get_session(user: str, password: str, url: str) -> req.Session:
    """ create session """
    logging.debug("Obtaining session for user %s on url %s", user, url)
    ses = req.Session()
    resp = ses.post(f"{url}/{API_BASE}/login/enterpriseLogin", json=dict(
        email=user, password=password, username=user
    ), proxies=proxies)
    logging.debug("Response status: %s", resp)
    logging.debug("Response headers: %s", resp.headers)
    logging.debug("Response text: %s", resp.text)
    assert resp.status_code == 200
    return ses

def get_websocket(api, ses,edge):
    try:
        URL = api.replace('https://', '').replace('http://', '')
        PROXIES = proxies
        http_proxy_host = None
        http_proxy_port = None
        if PROXIES.get("http"):
            import re
            proxy_url = PROXIES["http"]
            # Remove protocol if present
            proxy_url = re.sub(r'^https?://', '', proxy_url)
            # Remove leading slashes
            proxy_url = proxy_url.lstrip('/')
            # Split host and port
            if ':' in proxy_url:
                host, port = proxy_url.split(':', 1)
                http_proxy_host = host
                try:
                    http_proxy_port = int(port)
                except ValueError:
                    http_proxy_port = None
            else:
                http_proxy_host = proxy_url
        ws = create_connection(
            f"wss://{URL}/ws/",
            cookie="; ".join([f"{key}={value}" for key, value in ses.cookies.items()]),
            http_proxy_host=http_proxy_host,
            http_proxy_port=http_proxy_port,
            timeout=40
        )
        result = ws.recv()
        json_result = json.loads(result)
        generatedToken = json_result["token"]

        actions = [
            {
                "action": "runDiagnostics",
                "token": generatedToken,
                "data": {"logicalId": edge["logicalId"], "test": "PATHS_DUMP", "resformat": "JSON", "parameters": {"peer": "8f283414-5558-4f89-89b1-6445284c8f49", "sub_path": False}}
            },
            {
                "action": "runDiagnostics",
                "token": generatedToken,
                "data": {"logicalId": edge["logicalId"], "test": "PATHS_DUMP", "resformat": "JSON", "parameters": {"peer": "cb0c6678-e19b-432f-bebf-9ec90f20cfeb", "sub_path": False}}
            },
            {
                "action": "runDiagnostics",
                "token": generatedToken,
                "data": {"logicalId": edge["logicalId"], "test": "PATHS_DUMP", "resformat": "JSON", "parameters": {"peer": "17a19c68-4533-4e9d-a693-b44b8e84e078", "sub_path": False}}
            }
        ]

        responses = []
        for action in actions:
            ws.send(json.dumps(action))
            responses.append(json.loads(ws.recv()))
        ws.close()
        return responses
    except Exception as e:
        logging.error(f"WebSocket connection failed: {e}")
        return None


def get_websocket(api, ses,edge):
    try:
        URL = api.replace('https://', '').replace('http://', '')
        PROXIES = proxies
        http_proxy_host = None
        http_proxy_port = None
        if PROXIES.get("http"):
            import re
            proxy_url = PROXIES["http"]
            # Remove protocol if present
            proxy_url = re.sub(r'^https?://', '', proxy_url)
            # Remove leading slashes
            proxy_url = proxy_url.lstrip('/')
            # Split host and port
            if ':' in proxy_url:
                host, port = proxy_url.split(':', 1)
                http_proxy_host = host
                try:
                    http_proxy_port = int(port)
                except ValueError:
                    http_proxy_port = None
            else:
                http_proxy_host = proxy_url
        ws = create_connection(
            f"wss://{URL}/ws/",
            cookie="; ".join([f"{key}={value}" for key, value in ses.cookies.items()]),
            http_proxy_host=http_proxy_host,
            http_proxy_port=http_proxy_port,
            timeout=40
        )
        result = ws.recv()
        json_result = json.loads(result)
        generatedToken = json_result["token"]

        actions = [
            {
                "action": "runDiagnostics",
                "token": generatedToken,
                "data": {"logicalId": edge["logicalId"], "test": "PATHS_DUMP", "resformat": "JSON", "parameters": {"peer": "8f283414-5558-4f89-89b1-6445284c8f49", "sub_path": False}}
            },
            {
                "action": "runDiagnostics",
                "token": generatedToken,
                "data": {"logicalId": edge["logicalId"], "test": "PATHS_DUMP", "resformat": "JSON", "parameters": {"peer": "cb0c6678-e19b-432f-bebf-9ec90f20cfeb", "sub_path": False}}
            },
            {
                "action": "runDiagnostics",
                "token": generatedToken,
                "data": {"logicalId": edge["logicalId"], "test": "PATHS_DUMP", "resformat": "JSON", "parameters": {"peer": "17a19c68-4533-4e9d-a693-b44b8e84e078", "sub_path": False}}
            }
        ]

        responses = []
        for action in actions:
            ws.send(json.dumps(action))
            responses.append(json.loads(ws.recv()))
        ws.close()
        return responses
    except Exception as e:
        logging.error(f"WebSocket connection failed: {e}")
        return None


def get_websocket_bgp_from_gateway(api, ses, bgp_neighbor):
    """
    Connects to the gateway websocket and retrieves BGP received routes for the given neighbor.
    """
    try:
        URL = api.replace('https://', '').replace('http://', '')
        PROXIES = proxies
        http_proxy_host = None
        http_proxy_port = None
        if PROXIES.get("http"):
            import re
            proxy_url = PROXIES["http"]
            proxy_url = re.sub(r'^https?://', '', proxy_url)
            proxy_url = proxy_url.lstrip('/')
            if ':' in proxy_url:
                host, port = proxy_url.split(':', 1)
                http_proxy_host = host
                try:
                    http_proxy_port = int(port)
                except ValueError:
                    http_proxy_port = None
            else:
                http_proxy_host = proxy_url
        ws = create_connection(
            f"wss://{URL}/ws/",
            cookie="; ".join([f"{key}={value}" for key, value in ses.cookies.items()]),
            http_proxy_host=http_proxy_host,
            http_proxy_port=http_proxy_port,
            timeout=40
        )
        result = ws.recv()
        json_result = json.loads(result)
        generatedToken = json_result["token"]

        actions = [
            {
            "action": "getGwBgpReceivedRoutes",
            "token": generatedToken,
            "data": {
                "logicalId": bgp_neighbor.get("gatewayLogicalId"),
                "enterpriseLogicalId": bgp_neighbor.get("data", {}).get("enterpriseLogicalId"),
                "neighborIp": bgp_neighbor.get("data", {}).get("neighborIp"),
                "segmentId": bgp_neighbor.get("data", {}).get("segmentId", 0)
            }
            },
            {
            "action": "getGwBgpAdvertisedRoutes",
            "token": generatedToken,
            "data": {
                "logicalId": bgp_neighbor.get("gatewayLogicalId"),
                "enterpriseLogicalId": bgp_neighbor.get("data", {}).get("enterpriseLogicalId"),
                "neighborIp": bgp_neighbor.get("data", {}).get("neighborIp"),
                "segmentId": bgp_neighbor.get("data", {}).get("segmentId", 0)
            }
            }
        ]
        responses = []
        for action in actions:
            ws.send(json.dumps(action))
            responses.append(json.loads(ws.recv()))
        ws.close()
        return responses
    except Exception as e:
        logging.error(f"WebSocket connection failed: {e}")
        return None


def logout(api, ses):
    """ logout from vco """
    resp = ses.post(f"{api}/{API_BASE}/logout", proxies=proxies)
    assert resp.status_code in (200, 301, 302), vars(resp)


def create_filename(basename: str, suffix: str):
    """ create standardized name for file """
    now = datetime.datetime.now()
    return f'{basename}_{now.strftime("%m-%d-%Y_%H-%M-%S")}.{suffix}'

def create_filename_QOE(basename: str, suffix: str, NumberofDays: str):
    """ create standardized name for file """
    now = datetime.datetime.now()
    return f'{NumberofDays}_{"days"}_{basename}_{now.strftime("%m-%d-%Y_%H-%M-%S")}.{suffix}'


def parse_base64(data: str):
    """ function to parse base64 """
    logging.debug("Parsing base64: %s", data)
    return b64decode(data).decode("utf-8")


def parse_csv(data: str, delimiter=";"):
    """function to parse csv """
    logging.debug("Parsing CSV delimited by %s: %s", delimiter, data)
    result = list(DictReader(StringIO(data), delimiter=delimiter))
    logging.debug("CSV -> dict: %s", result)
    return result


def parse_base64_csv(data: str, delimiter=";"):
    """ function to parse base64 encoded csv """
    logging.debug(
        "Parsing base64-encoded CSV delimited by %s: %s", delimiter, data
    )
    return parse_csv(parse_base64(data), delimiter)


def get_credentials(request):
    """ function which returns credentials """
    logging.debug("Parsing credentials from HTTP headers")
    user = request.META.get("HTTP_X_USERNAME")
    password = request.META.get("HTTP_X_PASSWORD")
    url = request.META.get("HTTP_X_URL")
    tenant_id = request.META.get("HTTP_X_TENANT_ID")
    logging.debug(
        "Using VCO url: %s, tenant ID: %s, user: %s, pass is non-empty: %s",
        url, tenant_id, user, bool(password)
    )
    return user, password, url, tenant_id


def parse_json(data: str):
    """ function which parses json """
    logging.debug("parsing JSON: %s", data)
    return data


def resolve_params(params: list) -> dict:
    """ function which parses all inputs """
    logging.debug("Parsing params: %s", params)
    result = {}
    type_map = dict(
        str=str, int=int, float=float, digit=int, number=float,
        string=str, integer=int,
        base64=parse_base64, csvbase64=parse_base64_csv, csv=parse_csv,
        json=parse_json
    )

    for idx, item in enumerate(params):
        logging.debug("Parsing params, item #%d: %s", idx, item)
        item_type = item.get("type", "str")
        item_type_func = type_map[item_type]
        val = item["value"]
        result[item["name"]] = {
            "type": item_type, "name": item["name"],
            "value": item_type_func(val)
        }

    logging.debug("Parsing result: %s", result)
    return result


def get_all_edges_configs(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", verify=False, json={
            "enterpriseId": int(customer_id),
            "with": ["site", "links", "configuration",
                     "cloudServices", "wan",
                     "nvsFromEdge", "certificates", "licenses"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of edges failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def get_enterprise_bgp_peer_status(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getEnterpriseBgpPeerStatus", verify=False, json={
            "enterpriseId": int(customer_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of edges failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()



def get_all_edges_wanlinks(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", verify=False, json={
            "enterpriseId": int(customer_id),
            "with": ["wanlinks"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of edges failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def get_all_edges_licenses(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", verify=False, json={
            "enterpriseId": int(customer_id),
            "with": ["site", "licenses"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of edges failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()





def get_object_groups(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getObjectGroups", verify=False, json={
            "enterpriseId": int(customer_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of object groups failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

#.....

def calculate_29_subnet(ip):
    try:
        if not ip:
            return ''
        net = ipaddress.ip_network(f"{ip}/29", strict=False)
        return str(net.network_address) + "/29"
    except Exception:
        return ''

def get_all_edges_configs_only(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", verify=False, json={
            "enterpriseId": int(customer_id),
            "with": ["site","licenses","wanLinks"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of edges failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def get_all_edges_hostname(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", verify=False, json={
            "enterpriseId": int(customer_id),
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of edges failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def create_user(api, ses, tenant_id, user):
    """ function which creates new user on vco """
    logging.debug("Creating MSP name: %s, surname: %s, email: %s, role_id: %s,"
                  "level: %s", user['First Name'], user["Last Name"],
                  user["email"], user["roleId"], user["level"])
    random_pw = ''.join(random.choice(string.ascii_letters)
                        for i in range(5))
    random_pw += ''.join(random.choice(string.ascii_uppercase)
                        for i in range(4))
    random_pw += ''.join(random.choice(string.digits)
                        for i in range(4))
    if user["level"] == 1:
        api_path = "enterpriseProxy/insertEnterpriseProxyUser"
        api_list = {
            "username": user["email"],
            "email": user["email"],
            "firstName": user["First Name"],
            "lastName": user["Last Name"],
            "password": random_pw,
            "password2": random_pw,
            "roleId": int(user["roleId"]),
            "userType": "MSP"
        }
    else:
        api_path = "enterprise/insertEnterpriseUser"
        api_list = {
            "username": user["email"],
            "email": user["email"],
            "firstName": user["First Name"],
            "lastName": user["Last Name"],
            "password": random_pw,
            "password2": random_pw,
            "roleId": int(user["roleId"]),
            "enterpriseId": int(tenant_id),
            "isActive": True,
            "isNative": True
        }
    resp = ses.post(
        f"{api}/{API_BASE}/{api_path}",
        verify=False, json=api_list, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Creating of user failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def password_reset_user(api, ses, tenant_id, user_id, level):
    """ function which password resets user account on vco """
    if level == "msp":
        api_list = {
            "id": int(user_id)
            }
    else:
        api_list = {
            "id": int(user_id),
            "enterpriseId": int(tenant_id)
            }
    resp = ses.post(f"{api}/{API_BASE}/enterpriseUser/"
                    "getEnterpriseUserPasswordResetEmail",
                    verify=False, json=api_list, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
    except AssertionError:
        logging.debug("Password reset fail with reason: %s",
                      resp.json()["error"]["message"])
    if level == "msp":
        api_list = {
                        "id": int(user_id),
                        "makeInactive": False,
                        "email": {
                            "subject": resp.json()["subject"],
                            "replyTo": resp.json()["replyTo"],
                            "to": resp.json()["to"],
                            "passwordResetURL":
                                resp.json()["passwordResetURL"],
                            "message": resp.json()["message"],
                            "isActive": int(resp.json()["isActive"]),
                            "html": None,
                            "from": resp.json()["from"],
                            "cc": None,
                            "bcc": None
                            }
                        }
    else:
        api_list = {
                        "id": int(user_id),
                        "makeInactive": False,
                        "enterpriseId": int(tenant_id),
                        "email": {
                            "subject": resp.json()["subject"],
                            "replyTo": resp.json()["replyTo"],
                            "to": resp.json()["to"],
                            "passwordResetURL":
                                resp.json()["passwordResetURL"],
                            "message": resp.json()["message"],
                            "isActive": int(resp.json()["isActive"]),
                            "html": None,
                            "from": resp.json()["from"],
                            "cc": None,
                            "bcc": None
                            }
                        }
    resp2 = ses.post(f"{api}/{API_BASE}/enterpriseUser/"
                     "sendEnterpriseUserPasswordResetEmail",
                     verify=False, json=api_list, proxies=proxies)
    try:
        assert resp2.status_code == 200, vars(resp)
    except AssertionError as exception:
        logging.debug("Password reset fail with reason: %s",
                      exception)
    return resp2.json()


def get_applications(api, ses, tenant_id):
    """ method which returns all applications"""
    resp = ses.post(
        f"{api}/{API_BASE}/configuration/getIdentifiableApplications",
        verify=False, json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting list of applications: %s",
                      error)
        return resp.json()


def get_peer_path(api, ses, tenant_id):
    """ method which returns all applications"""
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeSDWANPeerPathSeries",
        verify=False, json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting list of applications: %s",
                      error)
        return resp.json()


def get_enterprises(api, ses):
    """ method which returns all applications"""
    resp = ses.post(
        f"{api}/{API_BASE}/enterpriseProxy/getEnterpriseProxyEnterprises",
        verify=False, json={
            "with": []
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting list of applications: %s",
                      error)
        return resp.json()


def get_routable_applications(api, ses, tenant_id):
    """ method which returns routable applications """
    resp = ses.post(
        f"{api}/{API_BASE}/configuration/getRoutableApplications",
        verify=False,
        json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting list of routableapplications: %s",
                      error)
        return resp.json()


def get_enterprise_inventory(api, ses):
    """ method which returns device inventory on MSP level """
    resp = ses.post(
        f"{api}/{API_BASE}/enterpriseProxy/getEnterpriseProxyEdgeInventory",
        verify=False,
        json={
            "enterpriseProxyId": 0
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting inventory: %s",
                      error)
        return resp.json()


def get_all_profiles(api, ses, tenant_id):
    """ function which returns all edges profiles """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseConfigurations",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "with": ["modules", "edgeCount", "edges", "refs", "deviceSettings"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as exception:
        logging.debug("Issue with getting all profiles: %s",
                      exception)
        return resp.json()


def get_edge_config_stack(api, ses, customer_id, edge_id):
    """ function which returns single edge config stack"""
    resp = ses.post(
        f"{api}/{API_BASE}/edge/getEdgeConfigurationStack", verify=False,
        json={
            "enterpriseId": int(customer_id),
            "edgeId": int(edge_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting edge config stack failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def set_edge_software(api, ses, customer_id, edge_id, software_id, network_id):
    """ set software version"""
    resp = ses.post(
        f"{api}/{API_BASE}/edge/setEdgeOperatorConfiguration", verify=False,
        json={
            "enterpriseId": int(customer_id),
            "edgeId": int(edge_id),
            "configurationId": int(software_id),
            "networkId": int(network_id)
            
            
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Setting software version failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()
    


def get_enterprise_edge_list(api, ses, customer_id):
    """ function which returns all edge list with css links """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdgeList", verify=False,
        json={
            "enterpriseId": int(customer_id),
            "with": [
                "site",
                "cloudServices",
                "configuration"
            ]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting edge config stack failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def get_all_customers(api, ses):
    """ function which returns all tenants from MSP """
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getEnterpriseEdgeLinkStatus", verify=False,
        json={
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        # Check if the status code is 400 (Bad Request)
        if resp.status_code == 400:
            return "enterpriseaccessonly"
        else:
            # Log an error message for other status codes
            logging.debug("Getting edge config stack failed with reason: %s", resp.json().get("error", {}).get("message", "Unknown error"))
            print(resp)
            return resp.json()



def update_edge_config(api, ses, json_body):
    """ function which updates single edge single module stack"""
    resp = ses.post(
        f"{api}/{API_BASE}/configuration/updateConfigurationModule", verify=False,
        json=json_body, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        if "data" in resp.json()["error"]:
            logging.debug("Updating edge config stack failed with reason: %s",
                      resp.json()["error"]["data"]["error"][0]["message"])
        else:
            logging.debug("Updating edge config stack failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def insert_edge_module(api, ses, json_body):
    """ function which insert config module"""
    resp = ses.post(
        f"{api}/{API_BASE}/configuration/insertConfigurationModule", verify=False,
        json=json_body, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        if "data" in resp.json()["error"]:
            logging.debug("Updating edge config stack failed with reason: %s",
                      resp.json()["error"]["data"]["error"][0]["message"])
        else:
            logging.debug("Updating edge config stack failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def get_gateways(api, ses):
    """ function which updates single edge single module stack"""
    resp = ses.post(
        f"{api}/{API_BASE}/enterpriseProxy/getEnterpriseProxyGateways", verify=False,
        json={
            "with": ["site", "dataCenters", "enterprises", "enterpriseAssociations"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("UGEtting list of gateways resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]


def get_routes(api, ses, tenant_id):
    """ function which returns overlay routing table """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseRouteTable", verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "filter": {
                "rules": [
                {
                    "field": "ipVersion",
                    "op": "is",
                    "values": [
                        "IPv4"
                    ]
                }
            ]}
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()    
    except AssertionError:
        logging.debug("UGEtting list of gateways resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]


def get_segments(api, ses, tenant_id):
    """ function which returns segments for customer """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseNetworkSegments", verify=False,
        json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("UGEtting list of gateways resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]


def get_gateway_edge_assignment(api, ses, gw_id):
    """ function which loads edges associated to VCG"""
    resp = ses.post(
        f"{api}/{API_BASE}/gateway/getGatewayEdgeAssignments", verify=False,
        json={
            "gatewayId": gw_id
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting list of edges resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]


def get_enterprise_services(api, ses, tenant_id):
    """ function which updates single edge single module stack"""
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseServices", verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "with": ["profileCount", "edgeUsage", "configuration", "groupCount",
                     "edgeQOSUsage","gateways"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
        
    except AssertionError:
        logging.debug("Getting list of services for enterprise resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]

def get_enterprise_services_full(api, ses, tenant_id):
    """ function which updates single edge single module stack"""
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseServices", verify=False,
        json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
        
    except AssertionError:
        logging.debug("Getting list of services for enterprise resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]

def get_edge_link_series(api, ses, tenant_id, edge_id):
    """Get aggregate Edge link metrics across enterprises"""
    # report for last month, get first & last day
    timeend = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=1)
    timestart = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=timeend.day)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeLinkSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": {"end": str(timeend), "start": str(timestart)},
            "metrics": ["bytesRx", "bytesTx", "bestJitterMsRx",
                        "bestJitterMsTx", "bestLatencyMsRx",
                        "bestLatencyMsTx", "bestLossPctRx",
                        "bestLossPctTx","bpsOfBestPathRx",
                        "bpsOfBestPathTx"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def get_edge_link_serie_utilisation_metrics(api, ses, tenant_id, edge_id,Ndays):
    """Get aggregate Edge link metrics across enterprises"""
    timeend = datetime.datetime.now() - datetime.timedelta(minutes=10)
    timestart = datetime.date.today() - datetime.timedelta(days=Ndays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(timeend.hour, timeend.minute),
                              tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))

    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeLinkSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": {"end": str(timeend), "start": str(timestart)},
            "metrics": ["bytesRx", "bytesTx"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def get_aggregate_links_metrics(api, ses, tenant_id,timestart,timeend):
    """Get aggregate Edge link metrics across enterprises"""
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getAggregateEdgeLinkMetrics",
        verify=False,
        json={
            "enterprises": [int(tenant_id)],
            "interval": {"end": str(timeend), "start": str(timestart)},
            "metrics": ["bytesRx", "bytesTx","bestJitterMsRx",
                        "bestJitterMsTx", "bestLatencyMsRx",
                        "bestLatencyMsTx", "bestLossPctRx",
                        "bestLossPctTx","bpsOfBestPathRx",
                        "bpsOfBestPathTx","bestBwKbpsRx", "bestBwKbpsTx", "scoreTx", "scoreRx"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()
        

def get_aggregate_edge_metrics(api, ses, tenant_id, time):
    """Get aggregate Edge metrics across enterprises for specific time"""
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getEnterpriseEdgeStatus",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "time": str(time)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise edge metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()
        


def get_tenantid_nonmsp(api, ses):
    """ function which returns tenantID from tenant level"""
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterprise", verify=False,
        json={
            "with": ["enterpriseProxy"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()["id"]
    except AssertionError:
        logging.debug("Getting tenantId failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def get_customer_name_nonmsp(api, ses):
    """ function which returns tenantID from tenant level"""
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterprise", verify=False,
        json={
            "with": ["enterpriseProxy"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()["name"]
    except AssertionError:
        logging.debug("Getting tenantId failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def create_edge(api, ses, json_body):
    """ function which returns tenantID from tenant level"""
    resp = ses.post(
        f"{api}/{API_BASE}/edge/edgeProvision", verify=False,
        json=json_body, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        if "data" in resp.json()["error"]:
            logging.debug("Creating edge failed with reason: %s",
                      resp.json()["error"]["data"]["error"][0]["message"])
        else:
            logging.debug("Creating edge failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def update_edge_attributes(api, ses, json_body):
    """ function which returns tenantID from tenant level"""
    resp = ses.post(
        f"{api}/{API_BASE}/edge/updateEdgeAttributes", verify=False,
        json=json_body, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Updating edge failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def get_qoe_edge(api, ses, tenant_id, edge_id, NumberOfDays):
    """ method which returns metrics for all links """
    # past 24 hours time definition
    timeend = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.date.today() - datetime.timedelta(days=NumberOfDays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/linkQualityEvent/getLinkQualityEvents",
        verify=False, json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "maxSamples": 133,
             "interval": {"end": str(timeend), "start": str(timestart)}
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()

def get_application_edge(api, ses, tenant_id, edge_id, NumberOfDays):
    """ method which returns metrics for all links """
    # past 24 hours time definition
    timeend = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.date.today() - datetime.timedelta(days=NumberOfDays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeAppMetrics",
        verify=False, json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "sort": "totalBytes",
            "with": ["category"],
            "limit":20,
            "resolveApplicationNames": True,
            "interval": {"end": str(timeend), "start": str(timestart)}
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()

def get_all_gamings_flows(api, ses, tenant_id, edge_id , NumberOfDays):
    timeend = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.date.today() - datetime.timedelta(days=NumberOfDays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    all_flows = []
    url = f"{api}/{API_BASE}/metrics/getEdgeFlowVisibilityMetrics"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    json_data = {
        "edgeId": edge_id,
        "enterpriseId": int(tenant_id),
        "interval": {
                    "end": timeend,
                    "start": timestart
        },
        "sortBy": [
            {
                "attribute": "application",
                "type": "ASC"
            }
        ],
        "limit": 10000,
        "filters": {
            "and": [
                {
                    "field": "appCategory",
                    "operator": "is",
                    "value": 8
                }
            ]
        },
        "_filterSpec": True
    }
    # Initialize nextPageLink to None for the first request
    nextPageLink = None
    while True:
        if nextPageLink:
            # Modify the request to include nextPageLink if it exists
            json_data['nextPageLink'] = nextPageLink
        else:
            # Ensure nextPageLink is not included in the initial request
            json_data.pop('nextPageLink', None)
        response = ses.post(url, headers=headers, json=json_data)
        # Simple error handling
        if response.status_code != 200:
            if response.status_code == 400:
                # Reset the request to start from the beginning
                json_data.pop('nextPageLink', None)
                nextPageLink = None
                continue
            else:
                break
        data = response.json()
        time.sleep(1)  # Respectful delay between requests
        if 'data' in data:
            all_flows.extend(data['data'])
        # Check if there's a next page, otherwise exit loop
        nextPageLink = data.get('metaData', {}).get('nextPageLink')
        if not nextPageLink:
            break
    return all_flows
def get_all_ge5_flows(api, ses, tenant_id, edge_id , NumberOfDays):
    timeend = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.date.today() - datetime.timedelta(days=1)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    all_flows = []
    url = f"{api}/{API_BASE}/metrics/getEdgeFlowVisibilityMetrics"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    json_data = {
        "edgeId": edge_id,
        "enterpriseId": int(tenant_id),
        "interval": {
                    "end": timeend,
                    "start": timestart
        },
        "sortBy": [
            {
                "attribute": "application",
                "type": "ASC"
            }
        ],
        "limit": 10000,
            "filters": {
                "and": [
                {
                    "field": "linkLogicalId",
                    "operator": "is",
                    "value": "GE5"
                },
                {
                    "field": "destIp",
                    "operator": "notStartsWith",
                    "value": "10."
                }
            ]
        },
        "_filterSpec": True
    }
    # Initialize nextPageLink to None for the first request
    nextPageLink = None
    while True:
        if nextPageLink:
            # Modify the request to include nextPageLink if it exists
            json_data['nextPageLink'] = nextPageLink
        else:
            # Ensure nextPageLink is not included in the initial request
            json_data.pop('nextPageLink', None)
        response = ses.post(url, headers=headers, json=json_data)
        # Simple error handling
        if response.status_code != 200:
            if response.status_code == 400:
                # Reset the request to start from the beginning
                json_data.pop('nextPageLink', None)
                nextPageLink = None
                continue
            else:
                break
        data = response.json()
        if 'data' in data:
            # Only process if the first item is not a dict with "name": "other"
            if isinstance(data['data'], list) and data['data']:
            # If the first item is a dict with "name": "other", skip
                if isinstance(data['data'][0], dict) and data['data'][0].get("name") == "other":
                    pass  # Do not extend all_flows
                else:
                    # Extract only the required fields from each flow
                    for flow in data['data']:
                        # Only process flows where route is "Internet Via Direct Breakout"
                        if flow.get("route") == "internetViaDirectBreakout":
                            filtered_flow = {
                                "sourceIp": flow.get("sourceIp"),
                                "destIp": flow.get("destIp"),
                                "destPort": flow.get("destPort"),
                                "destDomain": flow.get("destDomain"),
                                "route": flow.get("route"),
                                "startTime":flow.get("startTime"),
                                "bytesRx": flow.get("bytesRx"),
                                "bytesTx": flow.get("bytesTx"),
                                "totalBytes": flow.get("totalBytes")
                            }
                            all_flows.append(filtered_flow)
        # Check if there's a next page, otherwise exit loop
        time.sleep(0.5)
        nextPageLink = data.get('metaData', {}).get('nextPageLink')
        if not nextPageLink:
            break
    return all_flows

def get_gamingapplication_edge(api, ses, tenant_id, edge_id, NumberOfDays):
    """ method which returns metrics for all links """
    # past 24 hours time definition
    timeend = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.date.today() - datetime.timedelta(days=NumberOfDays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeAppMetrics",
        verify=False, json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "sort": "totalBytes",
            "with": ["category"],
            "resolveApplicationNames": True,
            "interval": {"end": str(timeend), "start": str(timestart)}
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()

def get_toptalkers_edge(api, ses, tenant_id, edge_id, NumberOfDays):
    """ method which returns metrics for all toptalkers """
    # past 24 hours time definition
    timeend = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.date.today() - datetime.timedelta(days=NumberOfDays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeDeviceMetrics",
        verify=False, json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "metrics": [
                        "totalBytes",
                        "bytesRx",
                        "bytesTx",
                        "totalPackets",
                        "packetsRx",
                        "packetsTx"
                        ],
        "sort": "bytesRx",
        "limit":5,
        "sortOrder": "DESC",
        "interval": {"end": str(timeend), "start": str(timestart)}
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()

def update_last_octet(ip_address):
    """
    Updates the last octet of an IP address to 37.
    Parameters:
    ip_address (str): The original IP address.
    Returns:
    str: The modified IP address with the last octet replaced by 37.
    """
    # Split the IP address into its octets
    octets = ip_address.split('.')
    # Check if the IP address format is correct (4 octets)
    if len(octets) != 4:
        raise ValueError("Invalid IP address format. Please provide a valid IPv4 address.")
    # Replace the last octet with '37'
    octets[-1] = '37'
    # Reassemble the IP address
    modified_ip = '.'.join(octets)
    return modified_ip





def get_qoe_edge_month(api, ses, tenant_id, edge_id):
    """ method which returns metrics for all links for last month"""
    # past 24 hours time definition
    timeend = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=1)
    timestart = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=timeend.day)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/linkQualityEvent/getLinkQualityEvents",
        verify=False, json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "maxSamples": 133,
             "interval": {"end": str(timeend), "start": str(timestart)}
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()  
    
def get_previous_month_start_end():
    time_end = datetime.date.today().replace(day=1) - datetime.timedelta(days=1)
    time_start = datetime.date.today().replace(day=1) - datetime.timedelta(days=time_end.day)
    time_end = datetime.datetime.isoformat(datetime.datetime.combine(time_end, datetime.time(23, 59, 59),
                                                                     tzinfo=datetime.timezone.utc))
    time_start = datetime.datetime.isoformat(datetime.datetime.combine(time_start, datetime.time(0, 0, 0),
                                                                       tzinfo=datetime.timezone.utc))
    return time_start, time_end


def get_two_months_back_start_end():
    time_end = datetime.date.today().replace(day=1) - datetime.timedelta(days=1)
    time_end = time_end.replace(day=1) - datetime.timedelta(days=1)
    time_start = time_end.replace(day=1)
    time_end = datetime.datetime.isoformat(datetime.datetime.combine(time_end, datetime.time(23, 59, 59),
                                                                     tzinfo=datetime.timezone.utc))
    time_start = datetime.datetime.isoformat(datetime.datetime.combine(time_start, datetime.time(0, 0, 0),
                                                                       tzinfo=datetime.timezone.utc))
    return time_start, time_end

def get_three_months_back_start_end():
    time_end = datetime.date.today().replace(day=1) - datetime.timedelta(days=1)
    time_end = time_end.replace(day=1) - datetime.timedelta(days=1)
    time_end = time_end.replace(day=1) - datetime.timedelta(days=1)
    time_start = time_end.replace(day=1)
    time_end = datetime.datetime.isoformat(datetime.datetime.combine(time_end, datetime.time(23, 59, 59),
                                                                     tzinfo=datetime.timezone.utc))
    time_start = datetime.datetime.isoformat(datetime.datetime.combine(time_start, datetime.time(0, 0, 0),
                                                                       tzinfo=datetime.timezone.utc))
    return time_start, time_end

def get_four_months_back_start_end():
    time_end = datetime.date.today().replace(day=1) - datetime.timedelta(days=1)
    for _ in range(3):
        time_end = time_end.replace(day=1) - datetime.timedelta(days=1)
    time_start = time_end.replace(day=1)
    time_end = datetime.datetime.isoformat(datetime.datetime.combine(time_end, datetime.time(23, 59, 59),
                                                                     tzinfo=datetime.timezone.utc))
    time_start = datetime.datetime.isoformat(datetime.datetime.combine(time_start, datetime.time(0, 0, 0),
                                                                       tzinfo=datetime.timezone.utc))
    return time_start, time_end

def get_five_months_back_start_end():
    time_end = datetime.date.today().replace(day=1) - datetime.timedelta(days=1)
    for _ in range(4):
        time_end = time_end.replace(day=1) - datetime.timedelta(days=1)
    time_start = time_end.replace(day=1)
    time_end = datetime.datetime.isoformat(datetime.datetime.combine(time_end, datetime.time(23, 59, 59),
                                                                     tzinfo=datetime.timezone.utc))
    time_start = datetime.datetime.isoformat(datetime.datetime.combine(time_start, datetime.time(0, 0, 0),
                                                                       tzinfo=datetime.timezone.utc))
    return time_start, time_end

def get_qoe_Agregate_month(api, ses, tenant_id):
    """ method which returns metrics for all links for last month"""
    # past 24 hours time definition
    timeend = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=1)
    timestart = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=timeend.day)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getAggregateEdgeLinkMetrics",
        verify=False, json={
            "enterprises": [int(tenant_id)],
             "interval": {"end": str(timeend), "start": str(timestart)}
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()


def get_link_packet_loss(api, ses, tenant_id, NumberOfDays):
    """ method which returns metrics for all links for last month"""
    # past 24 hours time definition
    timeend = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.date.today() - datetime.timedelta(days=NumberOfDays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    print(timestart,timeend)
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getAggregateEdgeLinkMetrics",
        verify=False, json={
            "enterprises": [int(tenant_id)],
            "metrics": ["bestLossPctRx", "bestLossPctTx", "bytesTx" , "bytesRx"],
             "interval": {"end": str(timeend), "start": str(timestart)} }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()




def get_link_Agregate_month(api, ses, tenant_id):
    """ method which returns metrics for all links for last month"""
    # past 24 hours time definition
    timestart = datetime.datetime.now() - datetime.timedelta(minutes=15)
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(timestart.hour, timestart.minute),
                              tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getAggregateEdgeLinkMetrics",
        verify=False, json={
            "enterprises": [int(tenant_id)],
             "interval": {"start": str(timestart)} }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError as error:
        logging.debug("Issue with getting link metrics for: %s",
                      error)
        return resp.json()

def get_all_events_log(api, ses, tenant_id):
    timestart, timeend = get_previous_month_start_end()
    all_events = []
    url = f"{api}/{API_BASE}/event/getEnterpriseEventsList"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    json_data = {
        "enterpriseId": int(tenant_id),
        "interval": {
            "type": "lastMonth",
            "start": timestart,
            "end": timeend
        },
        "filters": {
            "and": [
                {
                    "field": "event",
                    "operator": "in",
                    "value": ["LINK_ALIVE", "LINK_DEAD"]
                }
            ]
        }
    }
    # Initialize nextPageLink to None for the first request
    nextPageLink = None
    while True:
        time.sleep(1)  # Respectful delay between request
        if nextPageLink:
            # Modify the request to include nextPageLink if it exists
            json_data['nextPageLink'] = nextPageLink
        else:
            # Ensure nextPageLink is not included in the initial request
            json_data.pop('nextPageLink', None)   
        response = ses.post(url, headers=headers, json=json_data, proxies=proxies, verify=False)
        # Simple error handling
        if response.status_code != 200:
            print(f"Error occurred: Status code {response.status_code}")
            if response.status_code == 400:
                # Reset the request to start from the beginning
                json_data.pop('nextPageLink', None)
                nextPageLink = None
                continue
            else:
                break
        data = response.json()
        print(data)
        time.sleep(1)  # Respectful delay between requests
        if 'data' in data:
            all_events.extend(data['data'])
        # Check if there's a next page, otherwise exit loop
        nextPageLink = data.get('metaData', {}).get('nextPageLink')
        if not nextPageLink:
            break
    return all_events


def get_edge_status_series(api, ses, tenant_id, edge_id):
    """Get aggregate Edge link metrics across enterprises"""
    # report for last month, get first & last day
    timeend = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=1)
    timestart = datetime.date.today().replace(
        day=1) - datetime.timedelta(days=timeend.day)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(23, 59, 59),
                                  tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeStatusSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": {"end": str(timeend), "start": str(timestart)},
            "metrics": ["tunnelCount", "tunnelCountV6", "memoryPct",
                        "flowCount", "cpuPct",
                        "handoffQueueDrops"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def get_edge_status_series_general(api, ses, tenant_id, edge_id, Ndays):
    print(edge_id)
    """Get aggregate Edge link metrics across enterprises"""
    timeend = datetime.datetime.now() - datetime.timedelta(minutes=15)
    timestart = datetime.date.today() - datetime.timedelta(days=Ndays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(timeend.hour, timeend.minute),
                              tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeStatusSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": {"end": str(timeend), "start": str(timestart)},
                "metrics": ["tunnelCount", "memoryPct", "cpuPct", "flowCount",
                            "handoffQueueDrops", "cpuCoreTemp"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def get_edge_link_daily_series(api, ses, tenant_id, edge_id):
    """Get aggregate Edge link metrics across enterprises"""
    # Set start and end to cover the previous day (00:00:00 to 23:59:59)
    previous_day = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.datetime.combine(previous_day, datetime.time(0, 0, 0), tzinfo=datetime.timezone.utc)
    timeend = datetime.datetime.combine(previous_day, datetime.time(23, 59, 59), tzinfo=datetime.timezone.utc)
    timestart_iso = datetime.datetime.isoformat(timestart)
    timeend_iso = datetime.datetime.isoformat(timeend)
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeLinkSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": {"end": str(timeend_iso), "start": str(timestart_iso)},
            "metrics": ["bytesRx", "bytesTx", "bestJitterMsRx",
                        "bestJitterMsTx", "bestLatencyMsRx",
                        "bestLatencyMsTx", "bestLossPctRx",
                        "bestLossPctTx","bpsOfBestPathRx",
                        "bpsOfBestPathTx"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


with open('ADI_ip_ranges.json') as f:
    ADI_CIDRS = json.load(f)

ADI_ip_ranges = [ipaddress.ip_network(cidr, strict=False) for cidr in ADI_CIDRS]

def is_att_dia(ip):
    try:
        ip_addr = ipaddress.ip_address(ip)
        for ip_range in ADI_ip_ranges:
            if ip_addr in ip_range:
                return 'ATT_DIA'
        return 'Other'
    except ValueError:
        return 'Invalid IP'



def calculation_circuit_daily_statistics(edge_link_series, license):
    header = [
        "internalId", "displayName", "ipAddress", "interface", "latency_min", "latency_max", "latency_avg",
        "jitter_min", "jitter_max", "jitter_avg", "loss_rx", "loss_tx",
        "utilization_80_100_time_rx (%)", "utilization_60_80_time_rx (%)", "utilization_30_60_time_rx (%)", "utilization_0_30_time_rx (%)",
        "utilization_80_100_time_tx (%)", "utilization_60_80_time_tx (%)", "utilization_30_60_time_tx (%)", "utilization_0_30_time_tx (%)",
        "max_troughput_rx", "max_troughput_tx", "ATT_ADI", "ISP", "Exceed_lic_time (%)"
    ]

    def convert_bandwidth(value):
        if value is None or pd.isnull(value):
            return None
        value = str(value)
        for unit in ["Gbps WFH", "Mbps WFH", "Gbps", "Mbps"]:
            if unit in value:
                num = float(value.replace(unit, '').strip())
                return num * 1000 if "Gbps" in unit else num
        return None

    # Extract license bandwidth value
    license_str = license[0] if isinstance(license, list) and license else license
    bandwidth_str = license_str.split('|')[1].strip() if license_str and '|' in license_str else None
    license_val = convert_bandwidth(bandwidth_str)

    results = []
    circuit_throughputs = []


    for circuit in edge_link_series:
        # Defensive: skip if not a dict (e.g., str, int, etc.)
        if not isinstance(circuit, dict):
            logging.warning(f"Skipping non-dict entry in edge_link_series: {repr(circuit)}")
            continue
        link = circuit.get('link', {}) if isinstance(circuit.get('link', {}), dict) else {}
        display_name = link.get('displayName', 'Unknown')
        ip_address = link.get('ipAddress', '')
        interface = link.get('interface', '')
        internalId = link.get('internalId', '')
        ISP = link.get('isp', '')
        # Defensive: ensure 'series' is a list
        series = circuit.get('series', [])
        if not isinstance(series, list):
            series = []
        metrics = {s['metric']: s for s in series if isinstance(s, dict) and 'metric' in s}

        def clean(data):
            return [v for v in data if v is not None]

        latency = clean(metrics.get('bestLatencyMsRx', {}).get('data', []))
        jitter = clean(metrics.get('bestJitterMsRx', {}).get('data', []))
        loss_rx = clean(metrics.get('bestLossPctRx', {}).get('data', []))
        loss_tx = clean(metrics.get('bestLossPctTx', {}).get('data', []))
        bytes_rx = metrics.get('bytesRx', {}).get('data', [])
        bytes_tx = metrics.get('bytesTx', {}).get('data', [])
        tick_interval = metrics.get('bytesRx', {}).get('tickInterval', 300000)
        bps_rx = metrics.get('bpsOfBestPathRx', {}).get('data', [])
        bps_tx = metrics.get('bpsOfBestPathTx', {}).get('data', [])

        throughput_rx = [((int(v) * 1000) * 8 / tick_interval) if v is not None else 0 for v in bytes_rx]
        throughput_tx = [((int(v) * 1000) * 8 / tick_interval) if v is not None else 0 for v in bytes_tx]
        circuit_throughputs.append({"rx": throughput_rx, "tx": throughput_tx})

        n_rx = min(len(throughput_rx), len(bps_rx))
        n_tx = min(len(throughput_tx), len(bps_tx))
        utilization_rx = []
        utilization_tx = []
        for i in range(n_rx):
            bps_rx_val = bps_rx[i] if bps_rx and i < len(bps_rx) and bps_rx[i] is not None else 0
            max_throughput_rx = throughput_rx[i]
            util_rx = (max_throughput_rx / bps_rx_val) * 100 if bps_rx_val > 0 else 0
            utilization_rx.append(util_rx)
        for i in range(n_tx):
            bps_tx_val = bps_tx[i] if bps_tx and i < len(bps_tx) and bps_tx[i] is not None else 0
            max_throughput_tx = throughput_tx[i]
            util_tx = (max_throughput_tx / bps_tx_val) * 100 if bps_tx_val > 0 else 0
            utilization_tx.append(util_tx)

        def safe_stat(arr, fn, default=None, roundto=None):
            if arr:
                val = fn(arr)
                return round(val, roundto) if roundto is not None else val
            return default

        def util_pct(util_arr, low, high):
            return round(sum(low <= u < high for u in util_arr) / (len(util_arr) or 1) * 100, 2)

        result = {
            "internalId": internalId,
            "displayName": display_name,
            "ipAddress": ip_address,
            "interface": interface,
            "latency_min": safe_stat(latency, np.min),
            "latency_max": safe_stat(latency, np.max),
            "latency_avg": safe_stat(latency, np.mean, roundto=2),
            "jitter_min": safe_stat(jitter, np.min),
            "jitter_max": safe_stat(jitter, np.max),
            "jitter_avg": safe_stat(jitter, np.mean, roundto=2),
            "loss_rx": safe_stat(loss_rx, np.mean, roundto=2),
            "loss_tx": safe_stat(loss_tx, np.mean, roundto=2),
            "utilization_80_100_time_rx (%)": util_pct(utilization_rx, 80, 101),
            "utilization_60_80_time_rx (%)": util_pct(utilization_rx, 60, 80),
            "utilization_30_60_time_rx (%)": util_pct(utilization_rx, 30, 60),
            "utilization_0_30_time_rx (%)": util_pct(utilization_rx, 0, 30),
            "utilization_80_100_time_tx (%)": util_pct(utilization_tx, 80, 101),
            "utilization_60_80_time_tx (%)": util_pct(utilization_tx, 60, 80),
            "utilization_30_60_time_tx (%)": util_pct(utilization_tx, 30, 60),
            "utilization_0_30_time_tx (%)": util_pct(utilization_tx, 0, 30),
            "max_troughput_rx": round(safe_stat(throughput_rx, max, 0, 2) / 1000000, 2) if throughput_rx else 0,
            "max_troughput_tx": round(safe_stat(throughput_tx, max, 0, 2) / 1000000, 2) if throughput_tx else 0,
            "ATT_ADI": is_att_dia(ip_address),
            "ISP": ISP
        }
        results.append(result)

    # Aggregate throughput above license
    min_len = min((min(len(c["rx"]), len(c["tx"])) for c in circuit_throughputs), default=0)
    aggregate_above_license_count = 0
    aggregate_above_license_pct = 0.0
    if min_len > 0 and license_val is not None:
        aggregate_samples = []
        for i in range(min_len):
            agg_sum = sum((c["rx"][i] if i < len(c["rx"]) else 0) + (c["tx"][i] if i < len(c["tx"]) else 0) for c in circuit_throughputs)
            agg_sum_mbps = agg_sum / 1000000
            aggregate_samples.append(agg_sum_mbps)
        aggregate_above_license_count = sum(1 for v in aggregate_samples if v > license_val)
        aggregate_above_license_pct = round((aggregate_above_license_count / min_len) * 100, 2) if min_len > 0 else 0.0

    for r in results:
        r["Exceed_lic_time (%)"] = aggregate_above_license_pct

    return pd.DataFrame(results, columns=header)



def get_edge_status_daily_series(api, ses, tenant_id, edge_id):
    """Get aggregate Edge link metrics across enterprises for previous day"""
    # Set start and end to cover the previous day (00:00:00 to 23:59:59)
    previous_day = datetime.date.today() - datetime.timedelta(days=1)
    timestart = datetime.datetime.combine(previous_day, datetime.time(0, 0, 0), tzinfo=datetime.timezone.utc)
    timeend = datetime.datetime.combine(previous_day, datetime.time(23, 59, 59), tzinfo=datetime.timezone.utc)
    timestart_iso = datetime.datetime.isoformat(timestart)
    timeend_iso = datetime.datetime.isoformat(timeend)
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeStatusSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": {"end": str(timeend_iso), "start": str(timestart_iso)},
            "metrics": ["tunnelCount", "memoryPct", "cpuPct", "flowCount",
                        "handoffQueueDrops"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()



def calculate_daily_edge_statistics(edge_status_series):
    # edge_status_series is expected to be a list of dicts
    df = pd.DataFrame(edge_status_series)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    if df.empty:
        return []
    # Extract date from StartTime
    df['date'] = pd.to_datetime(df['StartTime']).dt.date
    # Bin CPU and Memory
    cpu_bins = [0, 60, 80, 100]
    mem_bins = [0, 60, 80, 100]
    cpu_labels = ['0-60', '60-80', '80-100']
    mem_labels = ['0-60', '60-80', '80-100']
    df['cpu_bin'] = pd.cut(df['CpuPct'], bins=cpu_bins, labels=cpu_labels, right=False)
    df['mem_bin'] = pd.cut(df['MemoryPct'], bins=mem_bins, labels=mem_labels, right=False)

    # Group by EdgeUUID, date, EdgeName, Model, License
    group_cols = ['EdgeUUID', 'date', 'EdgeName', 'Model', 'License']
    # Ensure group_cols are not lists and are hashable
    for col in group_cols:
        if col not in df.columns:
            df[col] = None
        # If any cell is a list, convert to string
        df[col] = df[col].apply(lambda x: str(x) if isinstance(x, list) else x)

    grouped = df.groupby(group_cols, dropna=False)
    result_rows = []
    for keys, group in grouped:
        cpu_bin_counts = group['cpu_bin'].value_counts().reindex(cpu_labels, fill_value=0)
        mem_bin_counts = group['mem_bin'].value_counts().reindex(mem_labels, fill_value=0)
        total_cpu = cpu_bin_counts.sum()
        total_mem = mem_bin_counts.sum()
        def safe_percent(val, total):
            try:
                if total == 0:
                    return 0.0
                return round((float(val) / total) * 100, 2)
            except Exception:
                return 0.0
        def safe_int(val):
            try:
                if pd.isna(val):
                    return None
                if np.isinf(val) or np.isnan(val):
                    return None
                return int(val)
            except Exception:
                return None
        def safe_float(val):
            try:
                if pd.isna(val):
                    return None
                if np.isinf(val) or np.isnan(val):
                    return None
                return float(val)
            except Exception:
                return None
        row = {
            'Edge UUID': keys[0],
            'date': keys[1],
            'hostname': keys[2],
            'model': keys[3],
            'license': keys[4],
            'CPU 80-100% time (%)': safe_percent(cpu_bin_counts['80-100'], total_cpu),
            'CPU 60 - 80% time (%)': safe_percent(cpu_bin_counts['60-80'], total_cpu),
            'CPU 0-60% time (%)': safe_percent(cpu_bin_counts['0-60'], total_cpu),
            'Memory 80-100% time (%)': safe_percent(mem_bin_counts['80-100'], total_mem),
            'Memory 60 - 80% time (%)': safe_percent(mem_bin_counts['60-80'], total_mem),
            'Memory 0-60% time (%)': safe_percent(mem_bin_counts['0-60'], total_mem),
            'handoffQueueDrops': safe_int(group['HandoffQueueDrops'].sum()) if 'HandoffQueueDrops' in group else None,
            'tunnelCount max': safe_int(group['TunnelCount'].max()) if 'TunnelCount' in group else None,
            'tunnelCount min': safe_int(group['TunnelCount'].min()) if 'TunnelCount' in group else None,
            'tunnelCount avarage': safe_float(round(group['TunnelCount'].mean(), 2)) if 'TunnelCount' in group else None,
        }
        # Replace any remaining inf/-inf/nan in row values with None
        for k, v in row.items():
            if isinstance(v, float) and (np.isinf(v) or np.isnan(v)):
                row[k] = None
        result_rows.append(row)
    return result_rows


def get_network_overview_info(api, ses, tenant_id):
    """ function which returns segments for customer """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getNetworkOverviewInfo", verify=False,
        json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("GEtting list of gateways resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]

def get_edge_status_series_utilisation_metrics(api, ses, tenant_id, edge_id,Ndays):
    """Get aggregate Edge link metrics across enterprises"""
    timeend = datetime.datetime.now() - datetime.timedelta(minutes=10)
    timestart = datetime.date.today() - datetime.timedelta(days=Ndays)
    timeend = datetime.datetime.isoformat(
        datetime.datetime.combine(timeend, datetime.time(timeend.hour, timeend.minute),
                              tzinfo=datetime.timezone.utc))
    timestart = datetime.datetime.isoformat(
        datetime.datetime.combine(timestart, datetime.time(0, 0, 0),
                                  tzinfo=datetime.timezone.utc))
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeStatusSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": {"end": str(timeend), "start": str(timestart)},
            "metrics": ["tunnelCount", "memoryPct","cpuPct",
                        "handoffQueueDrops"]
        }, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting enterprise link metrics failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()
    
def calculate_troughput(link_s):
    for link in link_s:
        for entry in link["series"]:
            metric = entry["metric"]
            tick_interval = entry["tickInterval"]
            if metric == 'bytesRx' or metric == 'bytesTx':
                new_metric = "throughputRx" if metric == 'bytesRx' else "throughputTx"
                new_entry = {
                    "metric": new_metric,
                    "startTime": entry["startTime"],
                    "tickInterval":int(tick_interval),
                    "data": [((int(value) * 1000) * 8 / tick_interval) if value is not None else 0 for value in entry["data"]],
                    "new": (((int(entry["min"])) * 1000) * 8 / tick_interval) if entry["min"] is not None else 0,
                    "new": ((int((entry["max"])) * 1000) * 8 / tick_interval) if entry["max"] is not None else 0,
                }
                link["series"].append(new_entry)
    return link_s

def aggregate_troughput(all_links):
    aggregate_output = {"agrThroughputRx": [], "agrThroughputTx": []}
    startTime = None
    tickInterval = None
    for entry in all_links:
        for item in entry["series"]:
            metric = item['metric']
            data = item['data']         
            if metric == 'throughputRx':
                aggregate_output["agrThroughputRx"].append(data)
            elif metric == 'throughputTx':
                aggregate_output["agrThroughputTx"].append(data)            
            startTime = item["startTime"]
            tickInterval = item["tickInterval"]
    aggregate_outputRX = [sum(values) for values in zip(*aggregate_output["agrThroughputRx"])] if aggregate_output["agrThroughputRx"] else [0]
    aggregate_outputTX = [sum(values) for values in zip(*aggregate_output["agrThroughputTx"])] if aggregate_output["agrThroughputTx"] else [0]
    troughput_aggregate_RX = {
        "metric": "agrThroughputRx",
        "startTime": startTime,
        "tickInterval": tickInterval,
        "data": aggregate_outputRX,
        "min":min(aggregate_outputRX),
        "max":max(aggregate_outputRX)
    }   
    troughput_aggregate_TX = {
        "metric": "agrThroughputTx",
        "startTime": startTime,
        "tickInterval": tickInterval,
        "data": aggregate_outputTX,
        "min":min(aggregate_outputTX),
        "max":max(aggregate_outputTX)
    }    
    troughput_aggregate = [troughput_aggregate_RX, troughput_aggregate_TX]
    return troughput_aggregate

def last_month(all_days=True, business_hours=False, timezone='UTC', adjust_hours=False):
    timeend = datetime.date.today().replace(day=1) - datetime.timedelta(days=1)
    timestart = datetime.date.today().replace(day=1) - datetime.timedelta(days=timeend.day)
    if business_hours == True:
        start_hour = 8
        end_hour = 16
    else:
        start_hour = 0
        end_hour = 23
    tz = pytz.timezone(timezone)
    time_range = []
    while timestart <= timeend:
        if all_days == False and timestart.weekday() > 4: # Mon-Fri are 0-4
            timestart += datetime.timedelta(days=1)
            continue
        if adjust_hours == True:
            day_start = datetime.datetime.combine(timestart, datetime.time(start_hour, 0, 0), tzinfo=tz)
            day_end = datetime.datetime.combine(timestart, datetime.time(end_hour, 59, 59), tzinfo=tz)
        else:
            day_start = datetime.datetime.combine(timestart, datetime.time(start_hour, 0, 0), tzinfo=pytz.UTC)
            day_end = datetime.datetime.combine(timestart, datetime.time(end_hour, 59, 59), tzinfo=pytz.UTC)
        day_start = day_start.astimezone(tz)
        day_end = day_end.astimezone(tz)
        day_start = datetime.datetime.isoformat(day_start)
        day_end = datetime.datetime.isoformat(day_end)
        time_range.append((day_start, day_end))
        timestart += datetime.timedelta(days=1)
    return time_range

def sum_lists(series):
    if series is None or not any(series):
        return [0]    
    processed_lists = []
    for lst in series:
        # Convert None to 0 and ensure the list contains numeric values only
        numeric_lst = [0 if x is None else x for x in lst]
        processed_lists.append(np.array(numeric_lst))   
    if not processed_lists:
        return [0]
    try:
        # Sum the arrays element-wise
        return list(np.sum(np.array(processed_lists), axis=0))
    except Exception as e:
        print(f"Error during summation: {e}")
        return [0]
    



def get_license_name(hostname, Licenses):
    for license_info in Licenses:
        # Check if the current license info matches the hostname
        if hostname == license_info.get("name"):
            # Safely get the licenses list and check if it's not empty
            licenses = license_info.get("licenses", [])
            if licenses:
                # Return the alias of the first license if available
                first_license = licenses[0]
                return first_license.get("alias", "Unknown License")  # Provide a default alias
    # Return None or a default value if no matching hostname or no licenses
    return None

def calculate_max_trough(row):
    if row['data']:
        return round(((max(row['data']) / 1000) * 8 / row['tickInterval']), 2)
    else:
        return 0

def calculate_average(row):
    if len(row['data']) > 0:
        return round((((sum(row['data']) / len(row['data'])) / 1000) * 8 / row['tickInterval']), 2)
    else:
        return 0

def calculate_95th_percentile(row):
    data = row['data']
    if len(data) > 1:
        # Compute max value once and use it for filtering
        max_value = max(data)
        data_without_max = [i for i in data if i != max_value]
        
        # Ensure there's data left after removing max value(s)
        if data_without_max:
            percentile_value = np.percentile(data_without_max, 95)
            # Perform the calculation with the 95th percentile value
            result = round((percentile_value / 1000) * 8 / row['tickInterval'], 2)
            return result    
    # Return 0 for cases where data is empty or contains a single value
    return 0

def get_licenses(api,ses, tenant_id):
    all_lic = ses.post(f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", verify=False,
                json={
                    "enterpriseId": int(tenant_id),
                    "with": ["licenses"],
                    "fieldsNeeded": ["id","name"]
                    }, timeout=600)
    # checking response
    try:
        assert all_lic.status_code == 200, vars(all_lic)
        Licenses = all_lic.json()
    except AssertionError:
        print("Getting list of edges failed with reason: %s", all_lic.json()["error"]["message"])
    return Licenses


def get_edge_models(all_edges_response):
    name_model_dict = {}
    for edge in all_edges_response:
        name = edge.get("name")
        model = edge.get("modelNumber")
        if name and model:  
            name_model_dict[name] = model
    return name_model_dict

def assignee_hostname_and_attributes(all_edges_response, edge_statistics):
    enriched_edge_statistics = []
    # Create a dictionary for quick lookup of edge details by logicalId
    edge_details = {edge["logicalId"]: edge for edge in all_edges_response}
    for stat in edge_statistics["data"]:
        edge_logical_id = stat.get("edgeLogicalId")
        edge_info = edge_details.get(edge_logical_id, {})
        licenses = edge_info.get("licenses", [])
        bandwidth_tier = None
        if licenses:
            bandwidth_tier = licenses[0].get("bandwidthTier")  
        if bandwidth_tier:
            if "G" in bandwidth_tier:
                bandwidth_tier = int(bandwidth_tier.replace("G", "")) * 1000
            elif "M" in bandwidth_tier:
                bandwidth_tier = int(bandwidth_tier.replace("M", ""))
        enriched_stat = {
            "edgeLogicalId": edge_logical_id,
            "tunnelCount": stat.get("tunnelCount"),
            "memoryPct": stat.get("memoryPct"),
            "flowCount": stat.get("flowCount"),
            "cpuPct": stat.get("cpuPct"),
            "cpuCoreTemp": stat.get("cpuCoreTemp"),
            "handoffQueueDrops": stat.get("handoffQueueDrops"),
            "tunnelCountV6": stat.get("tunnelCountV6"),
            "edgeId": stat.get("edgeId"),
            "name": edge_info.get("name"),
            "activationTime": edge_info.get("activationTime"),
            "edgeState": edge_info.get("edgeState"),
            "haState": edge_info.get("haState"),
            "modelNumber": edge_info.get("modelNumber"),
            "softwareVersion": edge_info.get("softwareVersion"),
            "customInfo": edge_info.get("customInfo"),
            "lat": edge_info.get("site", {}).get("lat"),
            "lon": edge_info.get("site", {}).get("lon"),
            "licenseName": edge_info.get("licenses", [{}])[0].get("alias") if edge_info.get("licenses") else None,
            "licenseBW": bandwidth_tier,
        }
        enriched_edge_statistics.append(enriched_stat)
    return enriched_edge_statistics


def process_time_range(api, ses, tenant_id, edge_id, edge, day_start, day_end):
    try:
        resplink = ses.post(
            f"{api}/{API_BASE}/metrics/getEdgeLinkSeries",
            verify=False,
            json={
                "enterpriseId": int(tenant_id),
                "edgeId": int(edge_id),
                "interval": {"end": str(day_end), "start": str(day_start)},
                "metrics": ["bytesRx", "bytesTx"]
            },
            timeout=600
        )
        resplink.raise_for_status()
        TEstprint = resplink.json()
    except req.RequestException as e:
        logging.error(f"Request failed for edge {edge_id}: {e}")
        return None, None, None
    except ValueError:
        logging.error(f"Invalid JSON response for edge {edge_id}")
        return None, None, None

    if not TEstprint:
        logging.warning(f"No data returned for edge {edge_id}")
        return None, None, None

    try:
        df = pd.json_normalize(TEstprint, 'series', ['edgeId', ['link', 'displayName'], ['link', 'interface']], record_prefix='series_')
        df = df.infer_objects()
        df = df.fillna(0)
        df['series_startTime'] = pd.to_datetime(df['series_startTime'], unit='ms')
        df = df[['edgeId', 'link.displayName', 'link.interface', 'series_metric', 'series_startTime', 'series_tickInterval', 'series_min', 'series_max', 'series_data']]
        df.columns = ['edgeId', 'displayName', 'interface', 'metric', 'startTime', 'tickInterval', 'min', 'max', 'data']
        df['edgeId'] = edge

        # Check if the DataFrame is empty before proceeding
        if df.empty:
            logging.warning(f"DataFrame is empty for edge {edge_id}")
            return None, None, None

        Agregate_Bi_df = df.groupby(['edgeId', 'metric', 'startTime']).agg({
            'tickInterval': 'first',
            'data': sum_lists
        }).reset_index()

        Agregate_Total_df = df.groupby(['edgeId', 'startTime']).agg({
            'tickInterval': 'first',
            'data': sum_lists
        }).reset_index()

        df['data'] = df['data'].apply(lambda x: sorted([i for i in x if i is not None]))
        Agregate_Bi_df['data'] = Agregate_Bi_df['data'].apply(lambda x: sorted([i for i in x if i is not None]))
        Agregate_Total_df['data'] = Agregate_Total_df['data'].apply(lambda x: sorted([i for i in x if i is not None]))
        return df, Agregate_Bi_df, Agregate_Total_df
    except Exception as e:
        logging.error(f"Error processing data for edge {edge_id}: {e}")
        return None, None, None

def get_daily_link_statistics(api, ses, tenant_id, edges, time_range, num_workers=8):
    df_list = []
    df_bi_aggr_list = []
    df_total_aggr_list = []
    bandwidth =[]
    bandwidth=get_link_Bandwidth(api, ses, tenant_id,time_range)
    
    def process_and_collect(edge, day_start, day_end):
        return process_time_range(api, ses, tenant_id, edge['id'], edge['name'], day_start, day_end)
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [
            executor.submit(process_and_collect, edge, day_start, day_end)
            for edge in edges for day_start, day_end in time_range
        ]
        for future in as_completed(futures):
            try:
                df, bi_aggr, total_aggr = future.result()  # We call result() to propagate exceptions if any.
                if df is not None:
                    df_list.append(df)
                if bi_aggr is not None:
                    df_bi_aggr_list.append(bi_aggr)
                if total_aggr is not None:
                    df_total_aggr_list.append(total_aggr)
            except Exception as e:
                logging.error(f"Error in future: {e}")
    pd.set_option('display.max_columns', None)
    if not df_list:
        logging.error("No data available to generate the report for df_list")

    return df_list, df_bi_aggr_list, df_total_aggr_list, bandwidth

def get_link_Bandwidth(api, ses, tenant_id, time_ranges):
    """Method which returns metrics for all links for given time ranges"""
    results = []

    for (timestart, timeend) in time_ranges:
        resp = ses.post(
            f"{api}/{API_BASE}/monitoring/getAggregateEdgeLinkMetrics",
            verify=False, json={
                "enterprises": [int(tenant_id)],
                "metrics": ["bpsOfBestPathRx", "bpsOfBestPathTx"],
                "interval": {"end": str(timeend), "start": str(timestart)}
            }, proxies=proxies)
        try:
            assert resp.status_code == 200, vars(resp)
            data = resp.json()
            # Assuming the JSON response is a list of dictionaries
            for item in data:
                link = item.get('link', {})
                result = {
                    "starttime": timestart,
                    "edgename": link.get('edgeName'),
                    "bpsOfBestPathRx": item.get('bpsOfBestPathRx'),
                    "bpsOfBestPathTx": item.get('bpsOfBestPathTx'),
                    "name": item.get('name'),
                    "displayName": link.get('displayName')
                }
                results.append(result)
        except AssertionError as error:
            logging.debug("Issue with getting link metrics for: %s", error)
            results.append({"error": vars(resp), "starttime": timestart})
        except Exception as e:
            logging.debug("Unexpected error: %s", e)
            results.append({"error": str(e), "starttime": timestart})
    
    return results

def aggregate_links(data, all_edges_api_wanlinks):
    # Function to extract only the "links" sections from all_edges_api_wanlinks
    def extract_links(all_edges_api_wanlinks):
        extracted_links = []
        for edge in all_edges_api_wanlinks:
            if "wanLinks" in edge and "links" in edge["wanLinks"]:
                extracted_links.extend(edge["wanLinks"]["links"])
        return extracted_links

    # Extract only the "links" sections
    all_edges_api_wanlinks = extract_links(all_edges_api_wanlinks)
     
    if not isinstance(data, list) or not data:
        raise ValueError("Invalid data format")
    cleaned_entries = []  # Initialize a list to store cleaned entries
    # Loop over each entry in the data
    for entry in data:
        # Drop unnecessary fields for each entry
        fields_to_remove = [
            "edgeSerialNumber", "edgeHASerialNumber", "edgeLastContact", "edgeSystemUpSince",
            "edgeServiceUpSince", "edgeLatitude", "edgeLongitude", "linkLastActive", "linkVpnState",
            "internalId", "linkIpV6Address", "edgeState", "edgeId", "edgeLogicalId", "linkId", "name" ,"linkState" , "enterpriseLogicalId"
        ]
        # Extract and flatten the "link" field if it exists
        link_data = entry.pop("link", {})
        # Use dictionary comprehension to clean entries and process nested dictionaries in one step
        cleaned_entry = {
            key: value
            for key, value in entry.items()
            if key not in fields_to_remove  # Remove top-level keys in fields_to_remove
        }
        # Merge the flattened "link" data into the cleaned entry
        cleaned_entry.update({
            k: v for k, v in link_data.items() if k not in fields_to_remove
        })
        cleaned_entries.append(cleaned_entry)
    # Enrich cleaned_entries with mode, type, and from all_edges_api_wanlinks
    for cleaned_entry in cleaned_entries:
        link_logical_id = cleaned_entry.get("linkLogicalId")
        if link_logical_id:
            for link in all_edges_api_wanlinks:
                if link.get("internalId") == link_logical_id:
                    cleaned_entry["mode"] = link.get("mode")
                    cleaned_entry["type"] = link.get("type")
                    cleaned_entry["backupOnly"] = link.get("backupOnly")
                    cleaned_entry["hotStandby"] = link.get("hotStandby")
                    # Replace bpsOfBestPathRx and bpsOfBestPathTx if upstreamMbps and downstreamMbps exist
                    if "upstreamMbps" in link and "downstreamMbps" in link:
                        if isinstance(link.get("downstreamMbps"), int):
                            cleaned_entry["bpsOfBestPathRx"] = link.get("downstreamMbps") * 1000000
                        if isinstance(link.get("upstreamMbps"), int):
                            cleaned_entry["bpsOfBestPathTx"] = link.get("upstreamMbps") * 1000000
                    break
    return cleaned_entries  # Return all cleaned entries
