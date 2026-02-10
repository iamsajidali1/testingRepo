import sys
import logging
import requests

from os import environ
from api.constants import MCAP_CONFIG
from rest_framework import status


logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)


def runMcapScript(data):
    for server in MCAP_CONFIG["serverList"]:
        logging.info("Trying the MCAP Server: %s", server)
        url = f'https://{server}{MCAP_CONFIG["restApiTaskPath"]}'
        headers = {
            "Content-Type": "application/json",
            "username": environ.get("MCAP_USER_NAME"),
            "userpwd": environ.get("MCAP_USER_PASSWORD"),
        }
        json = {
            "command": "run",
            "retryLogin": True,
            "connectWithSSH": True,
            "connectWithTelnet": True,
            "restApiId": MCAP_CONFIG["restApiId"],
        }
        json.update(data)
        mcapResponse = requests.post(url=url, headers=headers, json=json, verify=False)
        if mcapResponse.status_code == status.HTTP_200_OK:
            return {
                "status": "Success",
                "statusCode": mcapResponse.status_code,
                "message": "MCAP Execution successful!",
                "data": mcapResponse.json()
            }
    return {
        "status": "Error",
        "statusCode": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "message": "An unknown error occured, please check MCAP Logs!"
    }