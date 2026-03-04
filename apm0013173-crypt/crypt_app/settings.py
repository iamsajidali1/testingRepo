"""
Django settings for crypt_app project.
"""

import os
import sys
from os import environ
from os.path import abspath, dirname, join
from django.db.backends.signals import connection_created
from django.dispatch import receiver

ALLOWED_HOSTS = [
    os.environ.get('POD_IP'),
    os.environ.get('HOST_IP'),
    "local.att.com",
    "crypt.dev.att.com",
    "crypt.test.att.com",
    "crypt.web.att.com",
    "selfservice.dev.att.com",
    "selfservice.web.att.com",
    "crypt-nprd.com-att-one.svc.cluster.local",
    "crypt-prod.com-att-one.svc.cluster.local"
]

BASE_DIR = dirname(dirname(abspath(__file__)))
ENV = environ.get("ENV", "dev").lower()

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = environ.get("DJANGO_SECRET")
assert SECRET_KEY

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = ENV != "prod"

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'drf_yasg',
    'crypt_app',
    'api'
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication'
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "crypt_app.middleware.auth.AAFAuthorization",
    "crypt_app.middleware.auth.XAuthorization",
    "django.contrib.auth.middleware.AuthenticationMiddleware",\
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware"
]


ROOT_URLCONF = 'crypt_app.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'crypt_app.wsgi.application'


# Database
# https://docs.djangoproject.com/en/2.2/ref/settings/#databases

import pymysql
# Fake PyMySQL's version and install as MySQLdb
# https://adamj.eu/tech/2020/02/04/how-to-use-pymysql-with-django/
pymysql.version_info = (2, 0, 1, "final", 0)
pymysql.install_as_MySQLdb()

# Azure MySQL DB server requires TLS. Using the .pem for CA from the link below
# https://docs.microsoft.com/en-us/azure/mysql/concepts-ssl-connection-security
# ! Baltimore CA certificate unnecessary in the app, required on the hosts !
print("Adjusting DB settings with TLS for Azure")
CERTS = "/usr/share/ca-certificates"

DATABASES = {
    'default': {
        "ENGINE": "django.db.backends.mysql",
        "NAME": environ.get("DB_NAME", "crypt"),
        "USER": environ.get("DB_USER", "root"),
        "PASSWORD": environ.get("DB_PASSWORD", "crypt"),
        "HOST": environ.get("DB_HOST", "172.17.0.1"),
        "PORT": int(environ.get("DB_PORT", 42424)),
        "OPTIONS":  {
            "ssl_ca": f"{CERTS}/mozilla/DigiCert_Global_Root_CA.crt",
            "ssl_verify_cert": False,
            "ssl_verify_identity": False
        },
        "AUTOCOMMIT": True
    }
}
print(f'Options: {DATABASES["default"]["OPTIONS"]}')

if "test" in sys.argv or ENV == "unittest":
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "crypt",
        "AUTOCOMMIT": True
    }}

# Password validation
# https://docs.djangoproject.com/en/2.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [{
    "NAME": (
        "django.contrib.auth.password_validation"
        ".UserAttributeSimilarityValidator"
    )
}, {
    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"
}, {
    "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"
}, {
    "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"
}]


# Internationalization
# https://docs.djangoproject.com/en/2.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

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


@receiver(connection_created)
def connection_init(sender, connection, **__):
    if "test" in sys.argv or ENV == "unittest":
        # Django migrations don't use correctly ALTER with libSQLite3.31+!!!
        connection.cursor().execute("PRAGMA legacy_alter_table = ON")
        return
    print("Setting autocommit on connection start")
    connection.cursor().execute("SET autocommit=1")
