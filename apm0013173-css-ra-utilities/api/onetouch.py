"""uCPE OneTouch related functions."""
import os
import sys
import logging
import requests
import xmltodict
import json
import re
from http import HTTPStatus

from os import environ
from api.mcap import runMcapScript
from api.utils import multireplace, findkeys, bootstrap_notification
from rest_framework import status
from comment_parser import comment_parser

from api.constants import PHS_URI

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)

class FTData:
  def __init__(self, phsData):
    logging.debug('got data, parsing in class')
    self.response={
        "status":"OK",
        "activationCode":"",
        "server":"",
        "siteID":"",
        "serial":"",
        "hostname":"",
        "isVyatta": False,
        "mgmtAddress": "",
        "data":{
            "jcp": {"found" : False,
            "config": ""},
            "nmte": {"found" : False,
                "config": ""},
            "jdm": {"found" : False,
                "config": "",
                "address": ""},
            "vyatta":
            {"found":False,
            "config": ""},
            "t1":
              {
                "config":""
              }
            }
        }
    self.logger = logging
    phsDict = phsData
    try:
      self.response['hostname']=str(list(findkeys(phsData, 'username'))[0]).split(',')[1]
    except:
      self.response['hostname']='N/A'
    # legacy xml:
    try:
      if phsData['device']['configuration']['config']['ucpe']['jdm']:
        legacy = True
    except:
      legacy = False
    try:
      if 'vyatta' in phsData['device']['configuration']['config']['system']['@xmlns']: vyatta=True
    except:
      vyatta = False

    if vyatta:
      # process vyatta xml
      self.response['serial'] = phsData['device']['unique-id']
      self.response['activationCode'] = phsData['device']['activation-code']
      del phsData['device']['activation-code']
      del phsData['device']['web-hooks']
      # parse the xml after deleting the proprietary things (activation code and webhook info)
      self.set_vyatta_config(xmltodict.unparse({"device" : phsDict['device']}, pretty=True, indent=''))
      for iface in phsDict['device']['configuration']['config']['interfaces']['switch']:
        if iface['name'] =='sw4088':
          self.response['mgmtAddress'] = str(iface['vif']['address'][0]).split('/')[0]
          self.logger.debug(str(iface['vif']['address'][0]).split('/')[0])
    elif not legacy:
      self.logger.debug(f"Value of FTdata object's T1 config is {self.response['data']['t1']}")
      self.logger.debug("ok, not vyatta, grabbing config")
      # work only with the relevant part of the config, the rest is not needed for Juniper uCPE
      phsDict = phsData['device']['configuration']['config']
      # NMTE config is by default, grab it directly
      try:
        self.response['data']['nmte']['config'] = "cat << 'EOF' > /var/third-party/nmte-stage1.xml\n" + \
          xmltodict.unparse({"configuration":phsDict['ucpe']['ipsec-nm']['configuration']}, pretty=True, indent='') + "\nEOF"
      except:
        self.logger.debug("NMTE not found, skipping...")
      self.response['data']['nmte']['found'] = True
      # JCP config is a must, grab it
      self.response['data']['jcp']['config'] = "cat << 'EOF' > /var/third-party/jcp-stage1.xml\n" + \
        xmltodict.unparse({"configuration":phsDict['ucpe']['jvm']['configuration']}, pretty=True, indent='') + "\nEOF"
      self.response['data']['jcp']['found'] = True
      # TDM VNF config

      # JDM config has two possible sources for some reason, might be deprecated
      if phsDict['ucpe'].get('vnf') != None:
        if phsDict['ucpe']['vnf']['@vnf-name'] == 'jdm':
          s = xmltodict.unparse({"configuration":phsDict['ucpe']['vnf']['configuration']}, pretty=True, indent='')
          self.set_jdm_config(s)
          for iface in phsDict['ucpe']['vnf']['configuration']['interfaces']['interface']:
            if iface['name'] == 'jsxe0':
              self.logger.debug(iface)
              jdmIP = iface['unit']['family']['inet6']['address']['name']
              self.response['mgmtAddress'] = jdmIP.split("/")[0]
            else:
              if phsDict['ucpe'].get('jdm') != None:
                s = xmltodict.unparse({"configuration":phsDict['ucpe']['jdm']['configuration']}, pretty=True, indent='')
                self.set_jdm_config(s)
                if phsDict['ucpe']['jdm']['configuration'].get('interface') != None:
                  if phsDict['ucpe']['jdm']['configuration']['interface']['name'] == 'sxe0':
                    logging.debug(phsDict['ucpe']['jdm']['configuration']['interface'])
                    jdmIP = phsDict['ucpe']['jdm']['configuration']['interface']['vlan-id']['family']['inet6']['address']
                    self.response['mgmtAddress'] = jdmIP.split("/")[0]
      self.response['serial'] = phsData['device']['unique-id']
      self.response['activationCode'] = phsData['device']['activation-code']
  # set the jdm config and mark as found (useless?)
    else:
      self.response['activationCode'] = phsData['device']['activation-code']
      self.response['serial'] = phsData['device']['unique-id']
      del phsData['device']['activation-code']
      del phsData['device']['web-hooks']
      try:
        self.set_jdm_config(xmltodict.unparse(phsDict['device']['configuration']['config']['ucpe']['jdm'], pretty=True, indent=''))
        self.response['mgmtAddress'] = str(phsDict['device']['configuration']['config']['ucpe']['jdm']['configuration']['interface']['vlan-id']['family']['inet6']['address']).split('/')[0]
        self.logger.debug(f"found mgmt address: {self.response['mgmtAddress']}")
      except:
        self.set_jdm_config({"configuration": "Error parsing the data!"})
        self.logger.debug(f"something's going on ... ")
      try:
        self.response['data']['jcp']['config'] = "cat << 'EOF' > /var/third-party/jcp-stage1.xml\n" + \
          xmltodict.unparse(phsDict['device']['configuration']['config']['ucpe']['jvm'], pretty=True, indent='') + "\nEOF"
        self.logger.debug(f"pared jdm")
      except:
        self.response['dat']['jcp']['config']={"configuration":"Error parsing data!"}
        # end parsinig the data for jdm/jcp
  
  def set_jdm_config(self, data):
    self.response['data']['jdm']['config'] = "cat << 'EOF' > /var/third-party/jdm-stage1.xml\n" + data + "\nEOF"
    self.response['data']['jdm']['found'] = True
  
  # testing call to dump sone info
  def dump_info(self):
    self.logger.debug("here is some info: mgmt: {0}, found jcp: {1}".format(self.response['mgmtAddress'], self.response['data']['jcp']['found']))
  
  def set_vyatta_config(self, data):
    self.response['data']['vyatta']['config'] = "cat << 'EOF' > /home/dtactech/vnos-stage1.xml\n" + data + "\nEOF"
    self.response['data']['vyatta']['found'] = True
    self.response['isVyatta'] = True
  
  def set_t1_config(self, data):
    self.response['data']['t1']['config'] = data


class Bootstrap:
  def __init__(self, serial, jdmip):
    # read the template file
    current_path = os.path.dirname(__file__)
    file = open(os.path.join(current_path, 'templates/bootstrap.xml'), 'r')
    fileContent = file.read()
    file.close()
    
    # get required env variables
    ssh_rsa = environ.get("BOOTSTRAP_SSH_RSA")
    ssh_dsa = environ.get("BOOTSTRAP_SSH_DSA")
  
    # define desired replacements
    replacements = {
      "$serial": serial,
      "$jdmip": jdmip,
      "$sshRsa": ssh_rsa,
      "$sshDsa": ssh_dsa
    } 
    # replace the variables in the template
    bootstrapData = multireplace(fileContent, replacements)
    # parse the XML to json
    self.data = xmltodict.parse(bootstrapData)

  def print_data(self):
    print(self.data)

  def get_payload(self):
    data = {"payload": xmltodict.unparse(self.data)}
    return data

  def send_bootstrap(self):
    data = { "payload": xmltodict.unparse(self.data) }
    logging.debug(f"Post this data: {json.dumps(data)}")

    output = bootstrap_notification(data)
    logging.debug(f"output: {output}")
    if output["statusCode"] == 100 or output["statusCode"] == 204:
      return {
        "status": "Success",
        "message": f"Execution successful!"
      }
    return output


def getFtDataByHostname(hostname):
  urlstring = f'{PHS_URI}/restconf/data/att-bootstrap-server:devices/device={hostname}'
  logging.info("Using URL: %s", urlstring)
  username = environ.get("PHS_USERNAME")
  password = environ.get("PHS_PASSWORD")
  phsResponse = requests.get(url=urlstring, auth=(username, password))
  logging.info("HGPHS returned code: %s", phsResponse.status_code)
  if phsResponse.status_code == status.HTTP_200_OK:
    phsDict = xmltodict.parse(phsResponse.text, process_namespaces=False)
    ftData = FTData(phsDict)
    if "TDM-VNF" in phsResponse.text:
      ftData.set_t1_config("cat << 'EOF' >> /var/log/syslog\n" + comment_parser.extract_comments_from_str(phsResponse.text, 'text/xml')[0].text() + "\nEOF")
    ftData.response['siteID'] = "NA"
    return {
      "status": "Success",
      "statusCode": status.HTTP_200_OK,
      "message": f"Successfully fetched details from PHS for device: {hostname}", 
      "data": ftData.response 
    }
  return {
    "status": "Error",
    "statusCode": phsResponse.status_code,
    "message": f"Failed in fetching details from PHS for device: {hostname}", 
    "data": None
  }


def pingDeviceByAddress(ipAddress):
  data = {
      "scriptId": "ta147p:OneTouch_Ping:Server::Commands",
      "hostname": "durncs963a",
      "dms_server": "rlpv10026",
      "address": ipAddress
  }
  output = runMcapScript(data)
  if output["statusCode"] == status.HTTP_200_OK:
    return {
        "status": "Success",
        "statusCode": status.HTTP_200_OK,
        "message": "Execution successful!",
        "data": output["data"]["worklistObj"]["worklistRowsSelectedAr"][0]
    }
  return output


def bootstrapDevice(serial: str, jdmip: str) -> dict:
    """
    Bootstrap a device with given serial number and JDM IP.
    
    Args:
        serial (str): Device serial number
        jdmip (str): JDM IP address
        
    Returns:
        dict: Response containing status code and message
    """
    if not serial or not jdmip:
        return {
            "statusCode": HTTPStatus.BAD_REQUEST,
            "message": "Serial and JDMIP are required"
        }

    try:
        bootstrap = Bootstrap(serial=serial, jdmip=jdmip)
        bootstrap.print_data()
        
        response = bootstrap.send_bootstrap()
        if not response:
            raise ValueError("Empty response from bootstrap")

        if response["statusCode"] in [100, HTTPStatus.NO_CONTENT]:
            response.update({
                "message": "Bootstrap executed successfully!"
            })
            return response

        response.update({
            "statusCode": HTTPStatus.INTERNAL_SERVER_ERROR,
            "message": "Bootstrap execution failed!"
        })
        return response

    except Exception as e:
        return {
            "statusCode": HTTPStatus.INTERNAL_SERVER_ERROR,
            "message": f"Bootstrap error: {str(e)}"
        }

