"""
WSGI config for the project.
https://docs.djangoproject.com/en/2.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'velocloud_app.settings')

django_application = get_wsgi_application()

# Gunicorn reads SCRIPT_NAME from the process environment and fails every
# request whose path does not start with it (500 "Configuration problem").
# Requests arrive both with the ingress prefix (/svc/velocloud/api/...) and
# without it (in-cluster callers hitting /api/...), so the env var is removed
# (after Django settings have read it) and the prefix is stripped here instead.
URL_PREFIX = os.environ.pop("SCRIPT_NAME", "").rstrip("/")


def application(environ, start_response):
    path_info = environ.get("PATH_INFO", "")
    if URL_PREFIX and (path_info == URL_PREFIX or path_info.startswith(URL_PREFIX + "/")):
        environ["SCRIPT_NAME"] = environ.get("SCRIPT_NAME", "") + URL_PREFIX
        environ["PATH_INFO"] = path_info[len(URL_PREFIX):]
    return django_application(environ, start_response)
