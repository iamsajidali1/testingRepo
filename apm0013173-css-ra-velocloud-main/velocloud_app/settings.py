"""
Runtime configuration for the FastAPI resource adapter.
"""

import os
import stat
import sys
import tempfile
from os import environ
from os.path import abspath, dirname, join
from pathlib import Path

BASE_DIR = dirname(dirname(abspath(__file__)))
ENV = environ.get("ENV", "dev").lower()
UNITTEST = "test" in sys.argv or ENV == "unittest"

# SECURITY WARNING: keep the secret key used in production secret!
# Retained environment name: signs existing authentication/session records.
SECRET_KEY = environ.get("DJANGO_SECRET")
assert SECRET_KEY

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = ENV != "prod"

ALLOWED_HOSTS = [
    os.environ.get('POD_IP'),
    os.environ.get('HOST_IP'),
    "localhost",
    "local.att.com",
    "selfservice.dev.att.com",
    "selfservice.web.att.com",
    "css-ra-velocloud-nprd.com-att-one.svc.cluster.local",
    "css-ra-velocloud-prod.com-att-one.svc.cluster.local"
]

# Application definition


# Database
# https://docs.djangoproject.com/en/2.2/ref/settings/#databases

def _private_database_path():
    directory = Path(tempfile.gettempdir()) / "css-ra-velocloud"
    directory.mkdir(mode=0o700, exist_ok=True)
    metadata = directory.lstat()
    if not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid != os.getuid():
        raise PermissionError(f"Unsafe SQLite directory: {directory}")
    if stat.S_IMODE(metadata.st_mode) != 0o700:
        raise PermissionError(f"SQLite directory must be private (0700): {directory}")
    database = directory / "velocloud.sqlite3"
    try:
        metadata = database.lstat()
    except FileNotFoundError:
        return str(database)
    if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.getuid():
        raise PermissionError(f"Unsafe SQLite file: {database}")
    return str(database)


DATABASES = {
    "default": {
        "ENGINE": "sqlite3",
        "NAME": _private_database_path() if not UNITTEST else "unittest"
    }
}

# Password validation
# https://docs.djangoproject.com/en/2.2/ref/settings/#auth-password-validators


# Internationalization
# https://docs.djangoproject.com/en/2.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'


USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.2/howto/static-files/
MYSQL_DUPLICATE_ENTRY = 1062
SWAGGER_SETTINGS = {"VALIDATOR_URL": None}

FORCE_SCRIPT_NAME = environ.get("SCRIPT_NAME", "")
STATIC_URL = f'{FORCE_SCRIPT_NAME}/static/'
STATIC_ROOT = f'{os.environ["APP_DIR"]}/static'
DOC_PATH = join(dirname(abspath(__file__)), "documents")
CALL_PATH = join(dirname(abspath(__file__)), "calls")
TEMPLATE_PATH = join(dirname(abspath(__file__)), "templates")

MATOMO_URLS = {
    "dev": "http://tmatomo.test.att.com/matomo/matomo.php",
    "test": "http://tmatomo.test.att.com/matomo/matomo.php",
    "prod": "http://tmatomo.web.att.com/matomo/matomo.php"
}
MATOMO_IDS = {"dev": 999, "test": 999, "prod": 999}
TMATOMO_API_TOKEN = environ.get("TMATOMO_API_TOKEN")


def get_document(name):
    with open(join(DOC_PATH, name)) as file:
        return file.read()

PAPERPLANE_URL = "https://paperplane.it.att.com"
PAPERPLANE_TOKEN = environ.get('PAPERPLANE_TOKEN')
