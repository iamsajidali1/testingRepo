""" Module which will login to devices ssh/telnet """
import logging
import sys
import time
from datetime import datetime
from netmiko import ConnectHandler
from netmiko import redispatch

logging.basicConfig(
    stream=sys.stdout,
    level=logging.ERROR,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)


def ssh_client(client):
    """ function which returns credentials """
    logging.debug('Logging to device: %s', client["device"])
    now = datetime.now()
    logfile = f'{client["device"]}-{now.strftime("%m-%d-%Y_%H-%M-%S")}.log'
    ssh_device = {
        'device_type': 'linux',
        'ip': client["jumpserver"],
        'username': client["jumplogin"],
        'password': client["jumppass"],
        'port': 22,
        "session_log": logfile
    }
    responses = []
    net_connect = ConnectHandler(**ssh_device)
    net_connect.write_channel(f'ssh {client["devuser"]}@{client["device"]}\n')
    time.sleep(4)
    net_connect.write_channel(client["devpass"] + '\n')
    time.sleep(1)
    redispatch(net_connect, device_type='cisco_ios')
    for command in client["commands"]:
        responses.append(net_connect.send_command(command))
    net_connect.disconnect()
    return responses
