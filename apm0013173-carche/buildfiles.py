#!/usr/bin/env python3
'''
This file is used to set the database connection
and add carche templates to filesystem
'''
import configparser
from os.path import join, abspath, dirname, exists
from os import environ, makedirs
import ssl

import socket
import pymysql
import pymysql.cursors

from carche_project.api.templatetypes import TemplateTypes

BASE_DIR = abspath(__file__)
CONF_FILE = join(dirname(BASE_DIR), 'config', '.conf.ini')

settings = configparser.ConfigParser()
settings.read(CONF_FILE)

hostname = socket.gethostname()

if 'CSS_ENV' in environ:
    ENV = environ.get("CSS_ENV")
    print("enviroment " + ENV)

if ENV != "local":
    print(ENV)

DB = 'MYSQL_DB'

DB_NAME = settings.get(DB, 'db')
HOSTNAME = settings.get(DB, 'hostname')
PORT = settings.get(DB, 'port')
USER = settings.get(DB, 'user')
PASSWORD = settings.get(DB, 'password')
DBHOST = HOSTNAME + ":" + PORT
CERTS = "/usr/share/ca-certificates"

query = (
    f"select * from api_template "
    f"where templateType ='{TemplateTypes.carche.value}'"
)

try:
    import certifi
except Exception:
    certifi = None

ENV = environ.get("CSS_ENV", "local")
if ENV.casefold() != "local":
    print("environment " + ENV)

def build_ssl_context() -> ssl.SSLContext:
    ca = environ.get("MYSQL_SSL_CA")  # optional: path to Azure/MySQL CA pem
    insecure = environ.get("MYSQL_SSL_INSECURE", "").lower() in ("1", "true", "yes")

    if ca and exists(ca):
        ctx = ssl.create_default_context(cafile=ca)
    elif certifi is not None:
        ctx = ssl.create_default_context(cafile=certifi.where())
    elif exists("/etc/ssl/certs/ca-certificates.crt"):  # Alpine/Debian bundle
        ctx = ssl.create_default_context(cafile="/etc/ssl/certs/ca-certificates.crt")
    else:
        ctx = ssl.create_default_context()

    if insecure:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    return ctx

mysql_connection = pymysql.connect(
    user=USER, password=PASSWORD,
    database=DB_NAME, host=HOSTNAME, port=int(PORT),
    ssl=build_ssl_context(),
)

connection = mysql_connection.cursor()
connection.execute(query)
# 1-name 2-contractID 3-services 4-path 5-body 6-version 7-devicemodel

for item in connection:
    if item[2]:
        path = "_cArche/Templates/" + item[2]
    else:
        path = "_cArche/Templates/services/" + item[3]
    if not exists(path):
        makedirs(path)
    filename = path + "/" + item[1]
    with open(filename, "wt", newline='\n') as f:
        for line in item[5]:
            f.write(str(line).rstrip('\r'))
        f.close()
connection.close()
