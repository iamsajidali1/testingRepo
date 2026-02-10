""" constants module """
import os

PHS_URI = "https://rasp.phs.az.3pc.att.com"

LOCAL_DEPLOYMENT = os.getenv("LOCAL_DEPLOYMENT", "false").lower() == "true"

EDF_VIP = "alpd892-vip.aldc.att.com"
EDF_SID="p044edf1"
EDF_SERV_NAME = "p044edf.db.att.com"
if(LOCAL_DEPLOYMENT):
    EDF_PORT = 1521
else:
    EDF_PORT = 50159
EDF_CONN = "(DESCRIPTION=(ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)(HOST = {host})(PORT = {port})))(CONNECT_DATA=(SID={sid})))".format(host=EDF_VIP, port=EDF_PORT, sid=EDF_SID)

MCAP_CONFIG = {
    "port": 443,
    "serverList": [ "mcap.web.att.com", "mcapaz.web.att.com" ],
    "restApiId": "tv8985:ONE:Server:Rest:Api",
    "restApiTaskPath": "/restapi/taskManagement",
    "restApiDataPath": "/restapi/dataManagement"
}