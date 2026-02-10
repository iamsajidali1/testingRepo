"""
Django settings for project.
"""

import os
import sys
from os import environ
from os.path import abspath, dirname, join
from utilities_app.keyvault import KeyVaultHelper, get_vault_url

BASE_DIR = dirname(dirname(abspath(__file__)))
ENV = environ.get("ENV", "dev").lower()
UNITTEST = "test" in sys.argv or ENV == "unittest"

# SECURITY WARNING: keep the secret key used in production secret!
# NOTE: not used
SECRET_KEY = os.environ.get("SECRET_KEY")
assert SECRET_KEY, "SECRET_KEY must be set"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = ENV != "prod"

ALLOWED_HOSTS = [
    os.environ.get('POD_IP'),
    os.environ.get('HOST_IP'),
    "localhost",
    "local.att.com",
    "selfservice.dev.att.com",
    "selfservice.web.att.com",
    "css-ra-utilities-nprd.com-att-one.svc.cluster.local",
    "css-ra-utilities-prod.com-att-one.svc.cluster.local"
]

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "drf_spectacular",
    "utilities_app",
    "api"
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication'
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.auth.middleware.RemoteUserMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware"
    # "utilities_app.middleware.auth.AAFAuthorization"
]
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.RemoteUserBackend",
    "django.contrib.auth.backends.ModelBackend"
]

ROOT_URLCONF = 'utilities_app.urls'

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

WSGI_APPLICATION = 'utilities_app.wsgi.application'

SPECTACULAR_SETTINGS = {
    'TITLE': 'CSS Utilities API',
    'DESCRIPTION': 'API documentation',
    'VERSION': '1.0.0',
}

# Database
# https://docs.djangoproject.com/en/2.2/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "utilities" if not UNITTEST else "unittest"
    }
}


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': (
                "[{asctime}] {levelname}: {module} {process:d} {thread:d} {message}"
            ),
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{asctime}] {levelname}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'level': 'WARNING' if DEBUG else 'INFO', ##change to DEBUG for more verbosity
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING' if DEBUG else 'INFO', ##change to DEBUG for more verbosity
            'propagate': True,
        },
        '': {  # Root logger
            'handlers': ['console'],
            'level': 'WARNING' if DEBUG else 'INFO', ##change to DEBUG for more verbosity
        },
    },
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800

# Password validation
# https://docs.djangoproject.com/en/2.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [{
    "NAME": (
        "django.contrib.auth.password_validation"
        ".UserAttributeSimilarityValidator"
    ),
}, {
    "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
}, {
    "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
}, {
    "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
}]


# Internationalization
# https://docs.djangoproject.com/en/2.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True
USE_X_FORWARDED_HOST = True

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
    """ open document """
    with open(join(DOC_PATH, name), encoding='utf8') as file:
        return file.read()

def fetch_keyvault_secrets():
    vault_url = get_vault_url()
    kv = KeyVaultHelper(vault_url)
    for key in os.environ:
        value = os.environ[key]
        if value.endswith("@azurekeyvault"):
            secret_name = value.split("@")[0]
            try:
                secret_value = kv.get_secret(secret_name)
                os.environ[key] = secret_value
            except Exception as e:
                raise RuntimeError(f"Failed to fetch Key Vault secret for {key}: {e}")
        elif value == "" and key.isupper():
            # Optionally fetch if env var is required but missing
            try:
                secret_value = kv.get_secret(key.lower())
                os.environ[key] = secret_value
            except Exception:
                pass  # Ignore if not found

fetch_keyvault_secrets()
