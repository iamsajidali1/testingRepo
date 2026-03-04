from api.http import HttpMethods
from api.parse import ParseMethods
import logging
import requests

def get_device_list(session, host, port):
    """Obtain a list of specified device type

    Args:
        category (str): vedges or controllers

    Returns:
        result as (dict): All data associated with a response.
    """
    logging.info("Retrieving device list")

    url = f"https://{host}:{port}/dataservice/device"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result

def get_device_int_stats(session, host, port, deviceId):
    """Obtain a list of interface statistics

    Args: 
        category (str): vedges or controllers

    Returns:
        result (dict): All data associated with a response.
    """
    logging.info("Retrieving device list of interfaces")
    url = f"https://{host}:{port}/dataservice/device/interface?deviceId={deviceId}"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result

def get_bulkApis_options(session, host, port, api_option):
    """BULK-APIS - This command is executing GET api calls. It is BULK API developed by Cisco and thanks to that, we can gather informations from all devices very quickly. 
    Data are gathered from all vEdge devices + controllers. At this time, cEdges are not supported. 

    Args:

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

    """
    logging.info("Running bulk apis call ...")

    url = f"https://{host}:{port}/{api_option}"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result

def show_attached_dev_to_device_templates(session, host, port, templateId):
    """Get device template 
    """
    logging.info("Running output to show devices attached to device template ...")

    url = f"https://{host}:{port}/dataservice/template/device/config/attached/{templateId}"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result

def get_device_input_variables(session, host, port, templateId):
    """Get input variables for devices attached to a device template."""
    logging.info("Retrieving device input variables for template %s", templateId)
    # Get attached devices
    url = f"https://{host}:{port}/dataservice/template/device/config/attached/{templateId}"
    response = session.get(url, verify=False)
    data = response.json().get("data", []) if response.status_code == 200 else []
    device_ids = [d.get("uuid") for d in data if d.get("uuid")]
    if not device_ids:
        return []
    input_url = f"https://{host}:{port}/dataservice/template/device/config/input"
    payload = {'templateId': templateId, 'deviceIds': device_ids, 'isEdited': True, 'isMasterEdited': False}
    resp = session.post(input_url, json=payload, verify=False)
    if resp.status_code == 200:
        return resp.json().get("data", [])
    return []



def show_attached_dev_to_feature_templates(session, host, port):
    """Get features template 
    """
    logging.info("Running output to show devices attached to feature template ...")

    # This function is under construction, will work together with get device templates / get feature templates

    url = f"https://{host}:{port}/dataservice/template/feature/devicetemplates"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result

def get_device_templates(session, host, port):
    """Get device templates 
    """
    logging.info("Running output to get device templates ...")

    url = f"https://{host}:{port}/dataservice/template/device"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result

def get_feature_templates(session, host, port):
    """Get feature templates 
    """
    logging.info("Running output to get feature templates ...")

    url = f"https://{host}:{port}/dataservice/template/feature"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result

def get_tshoot_outputs(session, host, port, api):
    """Get tshoot outputs function 
    """
    logging.info("Running function to get tshoot outputs ...")

    #TODO: How to get updated headers so it retrieves only required info?

    url = f"https://{host}:{port}/{api}"
    response = HttpMethods(session, url).request('GET')
    result = ParseMethods.parse_data(response)
    return result
