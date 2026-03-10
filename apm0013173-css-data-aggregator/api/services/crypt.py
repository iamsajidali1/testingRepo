import os
import logging

from api.services.utils import StandardResponse
from api.services.request import make_api_request

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s: %(levelname)-8s: %(message)s')
logger = logging.getLogger(__name__)

CSS_AAF_USERNAME = os.getenv('AAF_USERNAME')
CSS_AAF_PASSWORD = os.getenv('AAF_PASSWORD')

CRYPT_BASE_URL = os.getenv('CRYPT_BASE_URL')
CRYPT_AUTH_TOKEN = os.getenv('CRYPT_AUTH_TOKEN')
CRYPT_KDBX_MAP = [
    {
        'vendor': 'VELOCLOUD',
        "kdbx_name": "css-ra-velocloud",
        "password": os.getenv('CRYPT_KDBX_VELOCLOUD_PASSWORD')
    },
    {
        'vendor': 'VMANAGE',
        "kdbx_name": "css-ra-vmanage",
        "password": os.getenv('CRYPT_KDBX_VMANAGE_PASSWORD')
    }
]

def get_credentials_from_crypt(url: str, tags: str, vendor: str):
    """
    Get the credentials from the crypt service for a specific vendor.
    
    :param url: The URL of the crypt service.
    :param tags: The comma separated tags to search for in the crypt service.
    :param vendor: The vendor name for which to get the credentials.
    :return: The credentials for the specified vendor orchestrator.
    """
    # Get the KDBX name and password for the vendor
    kdbx_name = [x['kdbx_name'] for x in CRYPT_KDBX_MAP if x['vendor'] == vendor][0]
    kdbx_password = [x['password'] for x in CRYPT_KDBX_MAP if x['vendor'] == vendor][0]
    # Prepare the headers
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Authorization': f'Token {CRYPT_AUTH_TOKEN}'
    }
    # Prepare the Request Body
    crypt_body = {
        "kdbx_name": kdbx_name,
        "password": kdbx_password,
        "url": url,
        "tags": tags.split(',')
    }
    try:
        response = make_api_request(
            url=CRYPT_BASE_URL + '/v1/credentials/',
            method='POST',
            headers=headers,
            json=crypt_body,
            verify=False,
            proxies=None, # No need for proxies as it is internal service
            auth=(CSS_AAF_USERNAME, CSS_AAF_PASSWORD)
        )
        response.raise_for_status()
        logger.info(f'Successfully retrieved credentials for {url}')
        credentials = response.json()
        if not credentials:
            return StandardResponse(404, 'Not Found', f'No credentials found for {url}')
        return StandardResponse(200, 'OK', f'Successfully retrieved credentials {url}', data=credentials)
    except Exception as err:
        return StandardResponse.handle_request_exception(err)