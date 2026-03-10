import os
import requests
from requests.exceptions import HTTPError, Timeout, RequestException
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from requests.auth import HTTPBasicAuth

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s: %(levelname)-8s: %(message)s')
logger = logging.getLogger(__name__)

# Get the proxies from environment variable
proxies = {
    'http': os.getenv('HTTP_PROXY'),
    'https': os.getenv('HTTPS_PROXY')
}

def make_api_request(url, method='GET', headers=None, params=None, data=None, json=None, proxies=proxies, auth=None, verify=True, timeout=10, retries=3, backoff_factor=0.3):
    """
    A wrapper function to call external APIs.
    
    Example usage:
    response = make_api_request('https://api.example.com/data', method='GET', params={'key': 'value'})
    print(response.json())

    :param url: The URL of the API endpoint.
    :param method: The HTTP method to use (GET, POST, PUT, DELETE, etc.). Default is 'GET'.
    :param headers: A dictionary of HTTP headers to send with the request.
    :param params: A dictionary of URL parameters to append to the URL.
    :param data: The body to attach to the request. Used for POST, PUT, PATCH, etc.
    :param json: A JSON serializable Python object to send in the body of the request.
    :param proxies: A dictionary of proxies to use for the request.
    :param timeout: The timeout for the request in seconds. Default is 10 seconds.
    :param retries: The number of retries for the request. Default is 3.
    :param backoff_factor: A backoff factor to apply between attempts after the second try. Default is 0.3.
    :param auth: A tuple of (username, password) for Basic Authentication.
    :param verify: Whether to verify SSL certificates. Default is True.
    :return: The response object.
    :raises: HTTPError, Timeout, RequestException
    """
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=(500, 502, 504)
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    # Set auth for the session if provided
    if auth:
        session.auth = HTTPBasicAuth(*auth)
    
    try:
        logger.info(f'Making request to {url} using method {method}.')
        response = session.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            data=data,
            json=json,
            proxies=proxies,
            verify=verify,
            timeout=timeout
        )
        logger.info(f'Request to {url} completed with status code {response.status_code}.')
        response.raise_for_status()
    except HTTPError as http_err:
        logger.error(f'HTTP error occurred: {http_err}')
        raise
    except Timeout as timeout_err:
        logger.error(f'Timeout error occurred: {timeout_err}')
        raise
    except RequestException as req_err:
        logger.error(f'Request exception occurred: {req_err}')
        raise
    except Exception as err:
        logger.error(f'An error occurred: {err}')
        raise
    else:
        logger.info(f'Request to {url} completed successfully.')
        return response