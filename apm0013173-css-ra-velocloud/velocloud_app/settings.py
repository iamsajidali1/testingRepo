"""
Django settings for project.
"""

import os
import sys
from os import environ
from os.path import abspath, dirname, join

BASE_DIR = dirname(dirname(abspath(__file__)))
ENV = environ.get("ENV", "dev").lower()
UNITTEST = "test" in sys.argv or ENV == "unittest"

# SECURITY WARNING: keep the secret key used in production secret!
# NOTE: not used
SECRET_KEY = environ.get("DJANGO_SECRET") or environ.get("SECRET_KEY")
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

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "drf_yasg",
    "velocloud_app",
    "api"
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
    #"velocloud_app.middleware.auth.AAFAuthorization",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.auth.middleware.RemoteUserMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware"
]
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.RemoteUserBackend",
    "django.contrib.auth.backends.ModelBackend"
]

ROOT_URLCONF = 'velocloud_app.urls'

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

WSGI_APPLICATION = 'velocloud_app.wsgi.application'


# Database
# https://docs.djangoproject.com/en/2.2/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "velocloud" if not UNITTEST else "unittest"
    }
}

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
