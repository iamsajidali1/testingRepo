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
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import datetime
import time
import ipaddress
from os import environ
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests as req
from websocket._core import create_connection
from websocket._exceptions import WebSocketConnectionClosedException
import json
import ssl
from copy import deepcopy
from urllib.parse import urlparse


API_BASE = "portal/rest"
EDGE_SPECIFIC_PROFILE = "Edge Specific Profile"
EDGE_LIST_FAILURE = "Getting list of edges failed (status_code=%s)"


TRUSTED_API_DOMAIN_SUFFIXES = (".velocloud.net",)


def _get_allowed_api_hosts() -> set:
    """Return trusted upstream API hosts from server-side configuration."""
    raw_hosts = environ.get("API_BASE_ALLOWED_HOSTS", "")
    allowed = {host.strip().lower() for host in raw_hosts.split(",") if host.strip()}

    # Backward-compatible fallback: trust API_BASE_URL host if explicit allowlist is not set.
    if not allowed:
        configured_base = environ.get("API_BASE_URL", "").strip()
        if configured_base and "://" not in configured_base:
            configured_base = f"https://{configured_base}"
        if configured_base:
            parsed_configured = urlparse(configured_base)
            if parsed_configured.hostname:
                allowed.add(parsed_configured.hostname.lower())

    return allowed


def _is_trusted_api_host(hostname: str) -> bool:
    """Check if hostname is trusted via allowlist or known VeloCloud domain."""
    hostname = hostname.lower()
    allowed = _get_allowed_api_hosts()
    if allowed and hostname in allowed:
        return True
    return any(hostname.endswith(suffix) for suffix in TRUSTED_API_DOMAIN_SUFFIXES)

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)


def _sanitize_for_log(value):
    """Prevent log injection by stripping CR/LF from untrusted values."""
    return str(value).replace("\r", "").replace("\n", "")


def _validate_api_base_url(url: str | None) -> str:
    """Return a trusted API base URL from server-side configuration or request."""
    # First priority: use provided URL if it's valid
    if url:
        url_to_validate = url.strip()
    else:
        # Fallback: try environment variable
        url_to_validate = environ.get("API_BASE_URL", "").strip()

    if not url_to_validate:
        raise ValueError("Missing required API_BASE_URL")

    # Normalize - add https if missing
    if "://" not in url_to_validate:
        url_to_validate = f"https://{url_to_validate}"

    # Parse and validate
    parsed = urlparse(url_to_validate)
    if parsed.scheme != "https":
        raise ValueError("API base URL must use HTTPS")
    if not parsed.hostname:
        raise ValueError("Invalid API base URL format")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Invalid API base URL format")

    hostname = parsed.hostname.lower()
    if not _is_trusted_api_host(hostname):
        raise ValueError(
            f"Untrusted API base URL host: {_sanitize_for_log(hostname)} "
            "(add it to API_BASE_ALLOWED_HOSTS)"
        )

    normalized_url = f"{parsed.scheme}://{parsed.netloc}"
    logging.debug("API URL validated for upstream API [redacted]")

    return normalized_url


proxies = {
    "http": environ.get("http_proxy"),
    "https": environ.get("https_proxy")
}


def get_session(user: str, password: str, url: str) -> req.Session:
    """ create session """
    logging.debug("Obtaining session with upstream API")
    validated_url = _validate_api_base_url(url)
    logging.debug("Opening upstream API session for configured base URL [redacted]")
    ses = req.Session()
    resp = ses.post(f"{validated_url}/{API_BASE}/login/enterpriseLogin", json={
        "email": user, "password": password, "username": user
    }, proxies=proxies)
    logging.debug("Login response status_code=%s", resp.status_code)
    logging.debug("Login response received from upstream API")
    assert resp.status_code == 200
    return ses

def get_websocket(api, ses, edge):
    try:
        URL = urlparse(api).netloc
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
    except Exception:
        logging.exception("WebSocket connection failed")
        return []


def get_websocket_bgp_from_gateway(api, ses, bgp_neighbor):
    """
    Connects to the gateway websocket and retrieves BGP received routes for the given neighbor.
    """
    try:
        URL = urlparse(api).netloc
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

        logging.debug("WebSocket URL configured [redacted]")
        logging.debug(f"Proxy config - Host: {http_proxy_host}, Port: {http_proxy_port}")
        logging.debug(f"Cookie count: {len(ses.cookies)}")
        
        ws = create_connection(
            f"wss://{URL}/ws/",
            cookie="; ".join([f"{key}={value}" for key, value in ses.cookies.items()]),
            http_proxy_host=http_proxy_host,
            http_proxy_port=http_proxy_port,
            timeout=40
        )
        
        logging.debug("WebSocket connection established")
        result = ws.recv()
        json_result = json.loads(result)
        generatedToken = json_result["token"]
        logging.debug("Token received from gateway")

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
        for i, action in enumerate(actions):
            logging.debug(f"Sending action {i+1}: {action['action']}")
            ws.send(json.dumps(action))
            responses.append(json.loads(ws.recv()))
        
        ws.close()
        logging.debug("WebSocket connection closed successfully")
        return responses
        
    except Exception:
        logging.exception("WebSocket connection failed")
        return []

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


def _sanitize_for_log(value):
    """Prevent log injection by stripping CR/LF from untrusted values."""
    return str(value).replace("\r", "").replace("\n", "")


def _sanitize_for_log(value):
    """Prevent log injection by stripping CR/LF from untrusted values."""
    return str(value).replace("\r", "").replace("\n", "")


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
    requested_url = request.META.get("HTTP_X_URL")
    tenant_id = request.META.get("HTTP_X_TENANT_ID")

    validated_url = _validate_api_base_url(requested_url)

    log_tenant_id = _sanitize_for_log(tenant_id)
    log_user = _sanitize_for_log(user)
    log_requested_url = _sanitize_for_log(requested_url) if requested_url else ""

    logging.debug(
        "Using VCO credentials context, tenant ID: %s, user: %s, pass is non-empty: %s, requested_url_header_present: %s",
        log_tenant_id, log_user, bool(password), bool(log_requested_url)
    )
    return user, password, validated_url, tenant_id


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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug(EDGE_LIST_FAILURE,
                      resp.status_code)
        return resp.json()


def get_enterprise_bgp_peer_status(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getEnterpriseBgpPeerStatus", json={
            "enterpriseId": int(customer_id)
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Getting BGP peer status failed (status_code=%s)",
                      resp.status_code)
        return resp.json()



def get_all_edges_wanlinks(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", json={
            "enterpriseId": int(customer_id),
            "with": ["wanlinks"]
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Getting list of edges wanlinks failed (status_code=%s)",
                      resp.status_code)
        return resp.json()

def get_all_edges_sites_licenses_wan(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", json={
            "enterpriseId": int(customer_id),
            "with": ["wanlinks","site", "licenses","configuration"]
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Getting list of edges failed due to upstream API error response")
        return resp.json()

def get_all_edges_recentlinks(api, ses, customer_id):
    """ function which provides all edges in single API call """
    validated_api = _validate_api_base_url(api)
    resp = ses.post(
        f"{validated_api}/{API_BASE}/enterprise/getEnterpriseEdges", json={
            "enterpriseId": int(customer_id),
            "with": ["site","recentLinks"]
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Getting list of edges recentLinks failed (status_code=%s)",
                      resp.status_code)
        return resp.json()




def get_all_edges_licenses(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", json={
            "enterpriseId": int(customer_id),
            "with": ["site", "licenses"]
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug(EDGE_LIST_FAILURE,
                      resp.status_code)
        return resp.json()





def get_object_groups(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getObjectGroups", verify=False, json={
            "enterpriseId": int(customer_id)
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Getting list of object groups failed (status_code=%s)",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug(
            EDGE_LIST_FAILURE,
            resp.status_code
        )
        return resp.json()

def get_all_edges_hostname(api, ses, customer_id):
    """ function which provides all edges in single API call """
    resp = ses.post(
        f"{api}/{API_BASE}/enterprise/getEnterpriseEdges", verify=False, json={
            "enterpriseId": int(customer_id),
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug(
            EDGE_LIST_FAILURE,
            resp.status_code
        )
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
    if user["level"] == "msp":
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code != 200:
        logging.debug("Password reset fail with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()
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
    if resp2.status_code != 200:
        logging.debug("Password reset fail with reason: %s",
                      resp2.status_code)
    return resp2.json()


def get_applications(api, ses, tenant_id):
    """ method which returns all applications"""
    resp = ses.post(
        f"{api}/{API_BASE}/configuration/getIdentifiableApplications",
        verify=False, json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting list of applications: %s",
                      resp.status_code)
        return resp.json()


def get_peer_path(api, ses, tenant_id):
    """ method which returns all applications"""
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeSDWANPeerPathSeries",
        verify=False, json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting list of applications: %s",
                      resp.status_code)
        return resp.json()


def get_enterprises(api, ses):
    """ method which returns all applications"""
    resp = ses.post(
        f"{api}/{API_BASE}/enterpriseProxy/getEnterpriseProxyEnterprises",
        verify=False, json={
            "with": []
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting list of applications: %s",
                      resp.status_code)
        return resp.json()


def get_routable_applications(api, ses, tenant_id):
    """ method which returns routable applications """
    resp = ses.post(
        f"{api}/{API_BASE}/configuration/getRoutableApplications",
        verify=False,
        json={
            "enterpriseId": int(tenant_id)
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting list of routableapplications: %s",
                      resp.status_code)
        return resp.json()


def get_enterprise_inventory(api, ses):
    """ method which returns device inventory on MSP level """
    resp = ses.post(
        f"{api}/{API_BASE}/enterpriseProxy/getEnterpriseProxyEdgeInventory",
        verify=False,
        json={
            "enterpriseProxyId": 0
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting inventory: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting all profiles: %s",
                      resp.status_code)
        return resp.json()


def get_edge_config_stack(api, ses, customer_id, edge_id):
    """ function which returns single edge config stack"""
    resp = ses.post(
        f"{api}/{API_BASE}/edge/getEdgeConfigurationStack", verify=False,
        json={
            "enterpriseId": int(customer_id),
            "edgeId": int(edge_id)
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Getting edge config stack failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def get_all_customers(api, ses):
    """ function which returns all tenants from MSP """
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getEnterpriseEdgeLinkStatus", verify=False,
        json={
        }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()    
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
        
    else:
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
    if resp.status_code == 200:
        return resp.json()
        
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()["id"]
    else:
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
    if resp.status_code == 200:
        return resp.json()["name"]
    else:
        logging.debug("Getting tenantId failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()

def create_edge(api, ses, json_body):
    """ function which returns tenantID from tenant level"""
    resp = ses.post(
        f"{api}/{API_BASE}/edge/edgeProvision", verify=False,
        json=json_body, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        if "data" in resp.json()["error"]:
            logging.debug("Creating edge failed with reason: %s",
                      resp.json()["error"]["data"]["error"][0]["message"])
        else:
            logging.debug("Creating edge failed with reason: %s",
                      resp.json()["error"]["message"])
        return resp.json()


def get_param_value(params, *names):
    for param in params:
        for name in names:
            if name in param:
                return param[name]
            if param.get("name") == name:
                return param.get("value")
    return None


def normalize_rma_model(model):
    if not model:
        return None
    model = str(model).strip()
    if model.lower().startswith("edge"):
        return model
    return f"edge{model.upper()}"


def get_latest_operator_config(edges):
    latest_operator = None
    latest_name = ""
    for edge in edges:
        operator = edge.get("configuration", {}).get("operator", {})
        operator_id = operator.get("id")
        operator_name = operator.get("name")
        if operator_id and operator_name and operator_name > latest_name:
            latest_name = operator_name
            latest_operator = {
                "id": operator_id,
                "name": operator_name
            }
    return latest_operator


def _rma_site_payload(site):
    return {
        "contactName": site.get("contactName") or "",
        "contactEmail": site.get("contactEmail") or "",
        "streetAddress": site.get("streetAddress") or "",
        "streetAddress2": site.get("streetAddress2") or "",
        "state": site.get("state") or "",
        "postalCode": site.get("postalCode") or "",
        "country": site.get("country") or "",
        "lat": site.get("lat"),
        "lon": site.get("lon"),
        "shippingSameAsLocation": site.get("shippingSameAsLocation", 1),
    }


def build_rma_edge_payload(source_edge, tenant_id, rma_model):
    site = source_edge.get("site") or {}
    licenses = source_edge.get("licenses") or [{}]
    license_info = licenses[0]
    configuration = source_edge.get("configuration", {}).get("enterprise", {})
    configuration_id = configuration.get("id")

    payload = {
        "name": f"{source_edge.get('name')}_RMA",
        "customInfo": source_edge.get("customInfo") or "",
        "description": source_edge.get("description") or "",
        "configurationId": str(configuration_id) if configuration_id is not None else None,
        "site": _rma_site_payload(site),
        "haEnabled": bool(source_edge.get("ha")),
        "endpointPkiMode": source_edge.get("endpointPkiMode") or "CERTIFICATE_REQUIRED",
        "edgeLicenseId": license_info.get("licenseId") or license_info.get("id"),
        "modelNumber": rma_model,
        "enterpriseId": source_edge.get("enterpriseId") or int(tenant_id),
        "analyticsMode": source_edge.get("analyticsMode") or "SDWAN_ONLY",
    }

    return {
        key: value
        for key, value in payload.items()
        if value is not None and key not in ("serialNumber", "haSerialNumber")
    }


def _stack_module(stack, config_name, module_name):
    for config in stack or []:
        if config.get("name") == config_name:
            for module in config.get("modules", []):
                if module.get("name") == module_name:
                    return module
    return None


def _ensure_rma_vlan1_network(device_data, source_device_data):
    lan = device_data.setdefault("lan", {})
    networks = lan.setdefault("networks", [])
    vlan1 = next((network for network in networks if network.get("vlanId") == 1), None)
    if vlan1 is None:
        source_networks = source_device_data.get("lan", {}).get("networks", [])
        source_vlan1 = next(
            (network for network in source_networks if network.get("vlanId") == 1),
            None
        )
        vlan1 = deepcopy(source_vlan1) if source_vlan1 else {
            "vlanId": 1,
            "name": "Corporate",
            "segmentId": 0,
            "disabled": False,
            "pingResponse": True,
            "cidrPrefix": 32,
            "netmask": "255.255.255.255",
            "dhcp": {"enabled": False, "options": [], "dhcpRelay": {"enabled": False, "servers": []}}
        }
        networks.insert(0, vlan1)

    if vlan1.get("cidrIp") is None:
        vlan1["cidrIp"] = "198.51.100.1"
        vlan1["advertise"] = False
        vlan1["override"] = True
    return vlan1


def _strip_unsupported_nfv_entries(value):
    """Remove source-edge NFV/NVS objects that are not supported by the target model."""
    if isinstance(value, dict):
        cleaned = {}
        for key, item in value.items():
            key_str = str(key)
            key_lower = key_str.lower()
            if "nvs" in key_lower or "networkfunction" in key_lower or "nfv" in key_lower:
                continue
            cleaned[key_str] = _strip_unsupported_nfv_entries(item)
        return cleaned
    if isinstance(value, list):
        return [_strip_unsupported_nfv_entries(item) for item in value]
    return value


def _update_rma_module(api, ses, tenant_id, module_name, module_id, module_data, refs=None):
    payload = {
        "id": module_id,
        "enterpriseId": int(tenant_id),
        "_update": {"data": module_data, "name": module_name}
    }
    if refs is not None:
        payload["_update"]["refs"] = refs
    safe_module_name = _sanitize_for_log(module_name)
    safe_module_id = _sanitize_for_log(module_id)
    logging.info("[RMA] Updating %s module id=%s", safe_module_name, safe_module_id)
    result = update_edge_config(api, ses, payload)
    if isinstance(result, dict) and "error" in result:
        logging.error("RMA: %s module id=%s update failed", safe_module_name, safe_module_id)
    else:
        logging.info("RMA: %s module id=%s update accepted", safe_module_name, safe_module_id)
    return result


def _profile_rma_interfaces(stack):
    result = {"routedInterfaces": {}, "interfaces": {}, "lanInterfaces": {}}
    for config in stack or []:
        if config.get("name") != EDGE_SPECIFIC_PROFILE:
            _index_profile_rma_interfaces(config.get("modules", []), result)
    return result


def _index_profile_rma_interfaces(modules, result):
    for module in modules:
        if module.get("name") != "deviceSettings":
            continue
        data = module.get("data", {}) or {}
        for interface_type, by_name in result.items():
            for interface in _rma_interface_list(data, interface_type):
                if interface.get("name"):
                    by_name[interface["name"]] = interface


def _rma_interface_list(data, interface_type):
    if interface_type == "lanInterfaces":
        return (data.get("lan", {}) or {}).get("interfaces", []) or []
    return data.get(interface_type, []) or []


def _rma_interface_disabled(source, migrated, profile):
    if source is not None and source.get("override") is True:
        return False
    return migrated.get("disabled") is True or bool(profile and profile.get("disabled") is True)


def _migrate_rma_interfaces(source_data, profile_interfaces, target_profile, target_edge, interface_type):
    source_interfaces = _rma_interface_list(source_data, interface_type)
    source_by_name = {item["name"]: item for item in source_interfaces if item.get("name")}
    profile_by_name = profile_interfaces[interface_type]
    targets = {
        item["name"]: deepcopy(item)
        for item in _rma_interface_list(target_profile, interface_type) + _rma_interface_list(target_edge, interface_type)
        if item.get("name")
    }
    for name, item in profile_by_name.items():
        targets.setdefault(name, deepcopy(item))
    for name, item in source_by_name.items():
        targets.setdefault(name, deepcopy(item))
    migrated = []
    for name, target in targets.items():
        source = source_by_name.get(name)
        interface = deepcopy(source or target)
        if _rma_interface_disabled(source, interface, profile_by_name.get(name)):
            interface["override"] = True
            interface["disabled"] = True
        migrated.append(interface)
    skipped = [item["name"] for item in source_interfaces if item.get("name") and item["name"] not in targets]
    return migrated, skipped


def _rma_base_device_data(new_device, profile_device, source_data):
    data = deepcopy(new_device.get("data", {}) or {})
    profile_data = deepcopy(profile_device.get("data", {}) or {})
    if "lan" not in data and profile_data.get("lan"):
        data["lan"] = deepcopy(profile_data["lan"])
    for key in ("loopbackInterfaces", "staticRoutes", "serviceRoutes"):
        if key in source_data and source_data.get(key) is not None:
            data[key] = deepcopy(source_data[key])
    source_lan = source_data.get("lan") or {}
    if isinstance(source_lan.get("networks"), list):
        _append_missing_rma_networks(data.setdefault("lan", {}).setdefault("networks", []), source_lan["networks"])
    return data


def _append_missing_rma_networks(networks, source_networks):
    for network in source_networks:
        if network.get("vlanId") is not None and not any(
            existing.get("vlanId") == network["vlanId"] for existing in networks
        ):
            networks.append(deepcopy(network))


def _copy_rma_wan_items(items, allowed_interfaces, kind, old_ids):
    copied = []
    for item in items:
        if not _rma_wan_interface_supported(item, allowed_interfaces, kind):
            continue
        value = deepcopy(item)
        for old_id in (value.get("logicalId"), value.get("internalId")):
            if old_id:
                old_ids[old_id] = {
                    "type": kind,
                    "name": value.get("name"),
                    "interfaces": tuple(value.get("interfaces", [])) if kind == "link" else (),
                }
        value["logicalId"] = None
        value["internalId"] = None
        copied.append(value)
    return copied


def _rma_wan_interface_supported(item, allowed_interfaces, kind):
    if kind == "network":
        return item.get("interface") in allowed_interfaces
    return set(item.get("interfaces", [])).issubset(allowed_interfaces)


def _prepare_rma_wan(old_wan, new_wan, migrated_interfaces):
    source = old_wan.get("data", {})
    data = deepcopy(new_wan.get("data", {}))
    allowed = {item.get("name") for item in migrated_interfaces}
    old_ids = {}
    data["networks"] = _copy_rma_wan_items(source.get("networks", []), allowed, "network", old_ids)
    data["links"] = _copy_rma_wan_items(source.get("links", []), allowed, "link", old_ids)
    return data, old_ids


def _assign_rma_wan_ids(refreshed_stack, old_ids):
    wan = _stack_module(refreshed_stack, EDGE_SPECIFIC_PROFILE, "WAN") or {}
    data = wan.get("data", {})
    new_ids = {
        (item.get("name"), tuple(item.get("interfaces", []))): item.get("internalId")
        for item in data.get("networks", []) + data.get("links", [])
    }
    for metadata in old_ids.values():
        metadata["newLogicalId"] = new_ids.get((metadata["name"], metadata["interfaces"]))
    return [old_id for old_id, metadata in old_ids.items() if not metadata.get("newLogicalId")]


def _refresh_rma_wan_ids(api, ses, tenant_id, new_edge_id, old_ids):
    missing = list(old_ids)
    # VCO assigns internal IDs asynchronously; dependent references must wait.
    for attempt in range(5):
        logging.info("RMA: refreshing replacement WAN configuration (%d/5) to obtain %d internal ID(s)",
                     attempt + 1, len(missing))
        refreshed = get_edge_config_stack(api, ses, tenant_id, new_edge_id)
        if isinstance(refreshed, dict) and "error" in refreshed:
            return {"error": "Failed to refresh new edge configuration after WAN update",
                    "details": refreshed, "wanLogicalIdMap": old_ids}
        missing = _assign_rma_wan_ids(refreshed, old_ids)
        if not missing:
            logging.info("RMA: replacement WAN internal IDs are ready")
            return None
        if attempt < 4:
            logging.info("RMA: waiting for WAN internal IDs: %s", ", ".join(missing))
            time.sleep(1)
    logging.error("RMA: not pushing LAN/segments/QOS because replacement WAN internal IDs are missing: %s",
                  ", ".join(missing))
    return {"error": "New WAN links did not receive internal IDs in time",
            "missingOldLogicalIds": missing, "wanLogicalIdMap": old_ids}


def _replace_rma_wan_ids(value, old_ids, reset_rules=False):
    if isinstance(value, list):
        for item in value:
            _replace_rma_wan_ids(item, old_ids, reset_rules)
    elif isinstance(value, dict):
        for key, item in value.items():
            if reset_rules and key == "ruleLogicalId":
                value[key] = None
            elif key == "linkInternalLogicalId" and item in old_ids:
                value[key] = old_ids[item]["newLogicalId"]
            else:
                _replace_rma_wan_ids(item, old_ids, reset_rules)


def _rma_final_device_data(device_data, source, lan_interfaces, old_ids):
    data = deepcopy(device_data)
    if source.get("lan"):
        logging.info("RMA: preparing source LAN configuration for replacement edge")
        data["lan"] = deepcopy(source["lan"])
        data["lan"]["interfaces"] = lan_interfaces
    if source.get("segments"):
        logging.info("RMA: preparing %d source segment(s) with regenerated WAN logical IDs", len(source["segments"]))
        data["segments"] = deepcopy(source["segments"])
        _replace_rma_wan_ids(data["segments"], old_ids)
        for segment in data["segments"]:
            for neighbor in segment.get("bgp", {}).get("neighbors", []) or []:
                neighbor["id"] = None
    return data


def _migrate_rma_firewall(api, ses, tenant_id, old_stack, new_stack):
    source = _stack_module(old_stack, EDGE_SPECIFIC_PROFILE, "firewall")
    target = _stack_module(new_stack, EDGE_SPECIFIC_PROFILE, "firewall")
    if not source or not target:
        return None
    result = _update_rma_module(api, ses, tenant_id, "firewall", target["id"],
                                deepcopy(source.get("data", {}) or {}),
                                _strip_unsupported_nfv_entries(target.get("refs")))
    if isinstance(result, dict) and "error" in result:
        return {"error": "Failed to update firewall", "details": result}
    return None


def _migrate_rma_qos(api, ses, tenant_id, old_stack, new_stack, new_device, old_ids):
    source = _stack_module(old_stack, EDGE_SPECIFIC_PROFILE, "QOS")
    target = _stack_module(new_stack, EDGE_SPECIFIC_PROFILE, "QOS")
    if not source:
        logging.info("RMA: source edge has no QOS module; skipping QOS migration")
        return None
    logging.info("RMA: preparing QOS rules with regenerated WAN logical IDs")
    data = deepcopy(source.get("data", {}) or {})
    _replace_rma_wan_ids(data, old_ids, reset_rules=True)
    if target:
        result = _update_rma_module(api, ses, tenant_id, "QOS", target["id"], data,
                                    _strip_unsupported_nfv_entries(target.get("refs")))
    else:
        configuration_id = new_device.get("configurationId")
        if configuration_id is None:
            return {"error": "Failed to find replacement configuration ID for QOS module"}
        logging.info("RMA: inserting missing QOS module into configuration id=%s",
                     _sanitize_for_log(configuration_id))
        result = insert_edge_module(api, ses, {
            "configurationId": int(configuration_id), "enterpriseId": int(tenant_id),
            "name": "QOS", "data": data,
        })
    if isinstance(result, dict) and "error" in result:
        return {"error": "Failed to configure QOS", "details": result}
    return None


def _read_rma_stacks(api, ses, tenant_id, old_edge_id, new_edge_id):
    old_stack = get_edge_config_stack(api, ses, tenant_id, old_edge_id)
    new_stack = get_edge_config_stack(api, ses, tenant_id, new_edge_id)
    if isinstance(old_stack, dict) and "error" in old_stack:
        return old_stack, new_stack, {"error": "Failed to read source edge configuration stack", "details": old_stack}
    if isinstance(new_stack, dict) and "error" in new_stack:
        return old_stack, new_stack, {"error": "Failed to read new edge configuration stack", "details": new_stack}
    return old_stack, new_stack, None


def _rma_profile_device(stack):
    return next(
        (module for config in stack or [] if config.get("name") != EDGE_SPECIFIC_PROFILE
         for module in config.get("modules", []) if module.get("name") == "deviceSettings"), None
    )


def migrate_rma_interfaces_and_wan(api, ses, tenant_id, old_edge_id, new_edge_id):
    logging.info("RMA: reading source edge=%s and replacement edge=%s configuration stacks",
                 _sanitize_for_log(old_edge_id), _sanitize_for_log(new_edge_id))
    old_stack, new_stack, error = _read_rma_stacks(api, ses, tenant_id, old_edge_id, new_edge_id)
    if error:
        return error
    old_device = _stack_module(old_stack, EDGE_SPECIFIC_PROFILE, "deviceSettings")
    new_device = _stack_module(new_stack, EDGE_SPECIFIC_PROFILE, "deviceSettings")
    old_wan = _stack_module(old_stack, EDGE_SPECIFIC_PROFILE, "WAN")
    new_wan = _stack_module(new_stack, EDGE_SPECIFIC_PROFILE, "WAN")
    target_profile_device = _rma_profile_device(new_stack)
    if not all((old_device, new_device, old_wan, new_wan, target_profile_device)):
        return {"error": "Required deviceSettings or WAN module was not found"}

    source_data = deepcopy(old_device.get("data", {}) or {})
    profile_data = target_profile_device.get("data", {}) or {}
    edge_data = new_device.get("data", {}) or {}
    profiles = _profile_rma_interfaces(old_stack)
    migrated, skipped = _migrate_rma_interfaces(source_data, profiles, profile_data, edge_data, "routedInterfaces")
    switched, skipped_switched = _migrate_rma_interfaces(source_data, profiles, profile_data, edge_data, "interfaces")
    lan, _ = _migrate_rma_interfaces(source_data, profiles, profile_data, edge_data, "lanInterfaces")
    device_data = _rma_base_device_data(new_device, target_profile_device, source_data)
    device_data["routedInterfaces"] = migrated
    device_data["interfaces"] = switched
    device_data.setdefault("lan", {})["interfaces"] = lan
    _ensure_rma_vlan1_network(device_data, source_data)
    device_data = _strip_unsupported_nfv_entries(device_data)
    device_refs = _strip_unsupported_nfv_entries(new_device.get("refs")) if new_device.get("refs") else None
    result = _update_rma_module(api, ses, tenant_id, "deviceSettings", new_device["id"], device_data, device_refs)
    if isinstance(result, dict) and "error" in result:
        return {"error": "Failed to update deviceSettings", "details": result}

    wan_data, old_ids = _prepare_rma_wan(old_wan, new_wan, migrated)
    result = _update_rma_module(api, ses, tenant_id, "WAN", new_wan["id"], wan_data, new_wan.get("refs"))
    if isinstance(result, dict) and "error" in result:
        return {"error": "Failed to update WAN", "details": result}
    error = _migrate_rma_firewall(api, ses, tenant_id, old_stack, new_stack)
    if error:
        return error
    error = _refresh_rma_wan_ids(api, ses, tenant_id, new_edge_id, old_ids)
    if error:
        return error

    final_data = _rma_final_device_data(device_data, source_data, lan, old_ids)
    result = _update_rma_module(api, ses, tenant_id, "deviceSettings", new_device["id"], final_data, device_refs)
    if isinstance(result, dict) and "error" in result:
        return {"error": "Failed to update LAN and segments", "details": result}
    error = _migrate_rma_qos(api, ses, tenant_id, old_stack, new_stack, new_device, old_ids)
    if error:
        return error
    return {"deviceSettings": "updated", "WAN": "updated",
            "skippedInterfaces": skipped, "skippedSwitchedInterfaces": skipped_switched,
            "wanLogicalIdMap": old_ids}


def update_edge_attributes(api, ses, json_body):
    """ function which returns tenantID from tenant level"""
    resp = ses.post(
        f"{api}/{API_BASE}/edge/updateEdgeAttributes", verify=False,
        json=json_body, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
        return resp.json()

def get_link_packet_loss_prev_month(api, ses, tenant_id):
    """ method which returns metrics for all links for previous month """
    timestart, timeend = get_previous_month_start_end()
    resp = ses.post(
        f"{api}/{API_BASE}/monitoring/getAggregateEdgeLinkMetrics",
        verify=False, json={
            "enterprises": [int(tenant_id)],
            "metrics": ["bestLossPctRx", "bestLossPctTx", "bytesTx" , "bytesRx", "bestJitterMsRx","bestJitterMsTx","bestLatencyMsRx","bestLatencyMsTx"],
             "interval": {"end": str(timeend), "start": str(timestart)} }, proxies=proxies)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Issue with getting link metrics for: %s",
                      resp.status_code)
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    if resp.status_code == 200:
        return resp.json()
    else:
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
    tz = ZoneInfo(timezone)
    time_range = []
    while timestart <= timeend:
        if all_days == False and timestart.weekday() > 4: # Mon-Fri are 0-4
            timestart += datetime.timedelta(days=1)
            continue
        if adjust_hours == True:
            day_start = datetime.datetime.combine(timestart, datetime.time(start_hour, 0, 0), tzinfo=tz)
            day_end = datetime.datetime.combine(timestart, datetime.time(end_hour, 59, 59), tzinfo=tz)
        else:
            day_start = datetime.datetime.combine(timestart, datetime.time(start_hour, 0, 0), tzinfo=datetime.timezone.utc)
            day_end = datetime.datetime.combine(timestart, datetime.time(end_hour, 59, 59), tzinfo=datetime.timezone.utc)
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
                    }, proxies=proxies,timeout=600)
    # checking response
    if all_lic.status_code != 200:
        logging.error("Getting licenses failed (status_code=%s)", all_lic.status_code)
        error = all_lic.json()
        if not isinstance(error, dict) or "error" not in error:
            raise ValueError(f"Unexpected license response status: {all_lic.status_code}")
        return error
    return all_lic.json()


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
    except req.RequestException:
        logging.exception("Request failed for edge %s", edge_id)
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
    except Exception:
        logging.exception("Error processing data for edge %s", edge_id)
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
            except Exception:
                logging.exception("Error in future")
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
            verify=True, json={
                "enterprises": [int(tenant_id)],
                "metrics": ["bpsOfBestPathRx", "bpsOfBestPathTx"],
                "interval": {"end": str(timeend), "start": str(timestart)}
            }, proxies=proxies)
        try:
            if resp.status_code != 200:
                logging.debug("Issue with getting link metrics for: %s", resp.status_code)
                results.append({"error": vars(resp), "starttime": timestart})
                continue
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


def get_capacity_planner_interval(weeks):
    """Calculate interval in EPOCH (milliseconds) based on weeks parameter.
    If weeks is 99, return previous month interval. Otherwise, return interval for specified weeks."""
    end_time = int(time.time() * 1000)

    if weeks == 99:
        # Get previous month interval
        timestart, timeend = get_previous_month_start_end()
        start_time = int(datetime.datetime.fromisoformat(timestart).timestamp() * 1000)
        end_time = int(datetime.datetime.fromisoformat(timeend).timestamp() * 1000)
    else:
        # Calculate interval based on weeks
        start_time = end_time - (weeks * 7 * 24 * 60 * 60 * 1000)

    # Print human-readable timestamps (UTC)
    start_hr = datetime.datetime.fromtimestamp(start_time / 1000, tz=datetime.timezone.utc).isoformat()
    end_hr = datetime.datetime.fromtimestamp(end_time / 1000, tz=datetime.timezone.utc).isoformat()
    print(f"Start time: {start_hr}")
    print(f"End time: {end_hr}")

    return {"start": start_time, "end": end_time}


def calculate_sample_count(interval):
    """Calculate number of 5-minute intervals for a given epoch interval."""
    return (interval["end"] - interval["start"]) // (5 * 60 * 1000)


def get_edge_link_series_capacity(api, ses, tenant_id, edge_id, interval, max_samples):
    """Get edge link series using epoch ms interval and maxSamples for capacity planning."""
    resp = ses.post(
        f"{api}/{API_BASE}/metrics/getEdgeLinkSeries",
        verify=False,
        json={
            "enterpriseId": int(tenant_id),
            "edgeId": int(edge_id),
            "interval": interval,
            "maxSamples": int(max_samples),
            "metrics": [
                "bytesRx", "bytesTx",
                "bestJitterMsRx", "bestJitterMsTx",
                "bestLatencyMsRx", "bestLatencyMsTx",
                "bestLossPctRx", "bestLossPctTx",
                "bpsOfBestPathRx", "bpsOfBestPathTx"
            ]
        }, proxies=proxies, timeout=600)
    if resp.status_code == 200:
        return resp.json()
    else:
        logging.debug("Getting edge link series failed for edge %s: %s",
                      edge_id, resp.text)
        return {"error": f"Failed for edge {edge_id}"}


CAPACITY_METRIC_LABELS = {
    "bestJitterMsRx": ("Jitter Rx", "ms"),
    "bestJitterMsTx": ("Jitter Tx", "ms"),
    "bestLatencyMsRx": ("Latency Rx", "ms"),
    "bestLatencyMsTx": ("Latency Tx", "ms"),
    "bestLossPctRx": ("Loss Rx", "%"),
    "bestLossPctTx": ("Loss Tx", "%"),
}
CAPACITY_BUCKET_LABELS = {
    "100_80": "80-100%", "80_60": "60-80%", "60_30": "30-60%", "below_30": "<30%",
}


def _capacity_timezone(name):
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        logging.warning("Unknown edge timezone %s; using UTC", _sanitize_for_log(name))
        return datetime.timezone.utc


def _capacity_business_hours(timestamp, timezone):
    local = datetime.datetime.fromtimestamp(timestamp, tz=timezone)
    return local.weekday() < 5 and 8 <= local.hour < 17


def _capacity_average(values):
    return round(sum(values) / len(values), 2) if values else 0


def _capacity_throughput(entry, timezone, direction):
    tick = entry.get("tickInterval", 300000)
    start = entry.get("startTime", 0)
    values = [round(((int(value) / 1000) * 8 / tick), 2) if value else 0 for value in entry.get("data", [])]
    business = [
        value for index, value in enumerate(values)
        if _capacity_business_hours(start / 1000 + index * tick / 1000, timezone)
    ]
    return {
        f"Max Throughput {direction} [Mbps]": round(max(values), 2) if values else 0,
        f"Avg Throughput {direction} [Mbps]": _capacity_average(values),
        f"Avg Throughput {direction} BH [Mbps]": _capacity_average(business),
    }, values


def _capacity_quality_metrics(metric, data):
    label, unit = CAPACITY_METRIC_LABELS[metric]
    values = [value for value in data if value is not None]
    return {
        f"Max {label} [{unit}]": round(max(values), 2) if values else 0,
        f"Min {label} [{unit}]": round(min(values), 2) if values else 0,
        f"Avg {label} [{unit}]": _capacity_average(values),
    }


def _capacity_link_metrics(link, timezone):
    metrics = {}
    series = {"bytesRx": [], "bytesTx": [], "bpsOfBestPathRx": [], "bpsOfBestPathTx": []}
    timestamps = []
    start, tick = 0, 300000
    for entry in link.get("series", []):
        metric = entry["metric"]
        data = entry.get("data", [])
        start, tick = entry.get("startTime", 0), entry.get("tickInterval", 300000)
        if not timestamps:
            timestamps.append(datetime.datetime.fromtimestamp(start / 1000).strftime("%Y-%m-%d %H:%M:%S"))
        if metric in ("bytesRx", "bytesTx"):
            direction = metric.removeprefix("bytes")
            throughput_metrics, series[metric] = _capacity_throughput(entry, timezone, direction)
            metrics.update(throughput_metrics)
        elif metric in CAPACITY_METRIC_LABELS:
            metrics.update(_capacity_quality_metrics(metric, data))
        elif metric in ("bpsOfBestPathRx", "bpsOfBestPathTx"):
            series[metric] = [round((value or 0) / 1_000_000, 2) for value in data]
            non_zero = [value for value in series[metric] if value > 0]
            direction = metric.removeprefix("bpsOfBestPath")
            metrics[f"Bandwidth {direction} [Mbps]"] = sorted(set(non_zero)) if non_zero else [0]
    return metrics, series, timestamps, start, tick


def _capacity_sample(values, index):
    return values[index] if index < len(values) else 0


def _capacity_bucket(percent):
    if percent >= 80:
        return "100_80"
    if percent >= 60:
        return "80_60"
    if percent >= 30:
        return "60_30"
    return "below_30"


def _capacity_direction_utilization(throughput, bandwidth, timezone, start, tick, direction):
    buckets = dict.fromkeys(CAPACITY_BUCKET_LABELS, 0)
    business_buckets = dict.fromkeys(CAPACITY_BUCKET_LABELS, 0)
    total, business_total = 0, 0
    for index in range(max(len(throughput), len(bandwidth))):
        capacity = _capacity_sample(bandwidth, index)
        if capacity <= 0:
            continue
        total += 1
        bucket = _capacity_bucket(_capacity_sample(throughput, index) / capacity * 100)
        buckets[bucket] += 1
        if _capacity_business_hours(start / 1000 + index * tick / 1000, timezone):
            business_total += 1
            business_buckets[bucket] += 1
    metrics = {}
    for bucket, label in CAPACITY_BUCKET_LABELS.items():
        metrics[f"Util {label} {direction} [%]"] = round(buckets[bucket] / total * 100, 2) if total > 0 else 0
        metrics[f"Util {label} {direction} BH [%]"] = (
            round(business_buckets[bucket] / business_total * 100, 2) if business_total > 0 else 0
        )
    return metrics


def _capacity_utilization(series, timezone, start, tick):
    if not any(series.values()):
        return {}
    metrics = {}
    for direction in ("Rx", "Tx"):
        throughput, bandwidth = series[f"bytes{direction}"], series[f"bpsOfBestPath{direction}"]
        metrics.update(_capacity_direction_utilization(
            throughput, bandwidth, timezone, start, tick, direction
        ))
        metrics[f"circuit_bandwidth_{direction.lower()}_mbps"] = round(max(bandwidth), 2) if bandwidth else 0
    return metrics


def _capacity_row(link, edge_id, edge_name, timestamps, metrics):
    row = {
        "timestamp": timestamps[0] if timestamps else "N/A",
        "edge_id": edge_id, "edge_name": edge_name, "link_id": link.get("linkId"),
        "link_name": link.get("link", {}).get("displayName", "N/A"),
        "isp": link.get("link", {}).get("isp", "N/A"),
        "interface": link.get("link", {}).get("interface", "N/A"),
    }
    for direction in ("Rx", "Tx"):
        for label in ("Max Throughput", "Avg Throughput", "Avg Throughput BH", "Bandwidth"):
            # BH follows the direction in the report's existing column names.
            column = f"{label} {direction} [Mbps]"
            if label == "Avg Throughput BH":
                column = f"Avg Throughput {direction} BH [Mbps]"
            row[column] = metrics.get(column, 0)
        for label in CAPACITY_BUCKET_LABELS.values():
            for suffix in ("[%]", "BH [%]"):
                column = f"Util {label} {direction} {suffix}"
                row[column] = metrics.get(column, 0)
        column = f"circuit_bandwidth_{direction.lower()}_mbps"
        row[column] = metrics.get(column, 0)
    row.update(metrics)
    return row


def process_edge_capacity(edge, api, ses, tenant_id, interval, num_intervals):
    """Process a single edge: fetch link series and compute utilization metrics."""
    edge_id = edge.get("id")
    edge_name = edge.get("name", "N/A")
    edge_data = {"edge_id": edge_id, "edge_name": edge_name, "all_throughput_values": [], "link_count": 0}
    links_stats = get_edge_link_series_capacity(api, ses, tenant_id, edge_id, interval, num_intervals)
    if isinstance(links_stats, dict) and "error" in links_stats:
        logging.warning("Skipping edge %s due to API error", edge_name)
        return edge_data, []
    timezone = _capacity_timezone(edge.get("site", {}).get("timezone", "UTC"))
    paths_data = []
    for link in links_stats:
        metrics, series, timestamps, start, tick = _capacity_link_metrics(link, timezone)
        metrics.update(_capacity_utilization(series, timezone, start, tick))
        rx, tx = series["bytesRx"], series["bytesTx"]
        aggregated = [
            _capacity_sample(rx, i) + _capacity_sample(tx, i)
            for i in range(max(len(rx), len(tx), 1))
        ]
        edge_data["all_throughput_values"].extend(aggregated)
        edge_data["link_count"] += 1
        paths_data.append(_capacity_row(link, edge_id, edge_name, timestamps, metrics))
    return edge_data, paths_data


def collect_capacity_data(api, ses, tenant_id, all_edges, weeks, max_workers=8):
    """Collect capacity planning data for all edges using thread pool."""
    interval = get_capacity_planner_interval(weeks)
    num_intervals = calculate_sample_count(interval)
    all_paths_data = []
    edge_aggregated_data = {}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(
                process_edge_capacity, edge, api, ses,
                tenant_id, interval, num_intervals
            ): edge for edge in all_edges
        }
        for future in as_completed(futures):
            try:
                edge_data, paths_data = future.result()
                edge_aggregated_data[edge_data["edge_id"]] = edge_data
                all_paths_data.extend(paths_data)
            except Exception:
                logging.exception("Edge processing raised exception")

    return all_paths_data, edge_aggregated_data