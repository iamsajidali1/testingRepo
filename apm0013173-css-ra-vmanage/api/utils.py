"""Common utility functions."""
import sys
import logging
import datetime

from urllib.parse import urlparse
from os import environ

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)

proxies = {
    "http": environ.get("http_proxy"),
    "https": environ.get("https_proxy"),
    "no_proxy": environ.get("no_proxy")
}

def get_credentials(request):
    """
    Retrieves credentials from the HTTP headers of the request.

    Args:
        request (HttpRequest): The HTTP request object.

    Returns:
        tuple: A tuple containing the host, port, user, and password extracted from the request headers.
    """
    logging.debug("Parsing credentials from HTTP headers")
    user = request.META.get("HTTP_X_USERNAME")
    password = request.META.get("HTTP_X_PASSWORD")
    url = request.META.get("HTTP_X_URL")
    parsed_url = urlparse(url)
    host = parsed_url.hostname
    port = parsed_url.port or 443
    logging.debug(
        "Using vManage: %s, user: %s, pass is non-empty: %s",
        url, user, bool(password)
    )
    return host, port, user, password

def create_filename(basename: str, suffix: str):
    """ create standardized name for file """
    now = datetime.datetime.now()
    return f'{basename}_{now.strftime("%m-%d-%Y_%H-%M-%S")}.{suffix}'