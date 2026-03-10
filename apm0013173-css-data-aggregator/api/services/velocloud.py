import os
import logging

from api.services.request import make_api_request
from api.services.utils import StandardResponse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s: %(levelname)-8s: %(message)s')
logger = logging.getLogger(__name__)

CSS_ORM_URL = os.getenv('CSS_ORM_URL')
CSS_RA_VELOCLOUD_URL = os.getenv('CSS_RA_VELOCLOUD_URL')
CSS_AAF_USERNAME = os.getenv('AAF_USERNAME')
CSS_AAF_PASSWORD = os.getenv('AAF_PASSWORD')
CSS_RA_VELOCLOUD_TOKEN = os.getenv('CSS_RA_VELOCLOUD_TOKEN')


def make_velocloud_request(url: str, tenant_id: int, username: str, password: str, endpoint: str, data=None):
    """
    A wrapper function to call the CSS VeloCloud Resource Adapter API.
    
    :param url: The URL of the VeloCloud orchestrator.
    :param tenant_id: The tenant ID for the VeloCloud orchestrator.
    :param username: The username for the VeloCloud orchestrator.
    :param password: The password for the VeloCloud orchestrator.
    :param data: The JSON serializable Python object to send in the body of the request.
    :return: The JSON response from the API.
    :raises: VeloCloudRequestError: Custom exception for VeloCloud request errors.
    """
    # Prepare the headers
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Url': url,
        'X-Tenant-ID': str(tenant_id),
        'X-Username': username,
        'X-Password': password,
        'X-Authorization': CSS_RA_VELOCLOUD_TOKEN
    }
    try:
        response = make_api_request(
            url=CSS_RA_VELOCLOUD_URL + endpoint,
            method='POST',
            headers=headers,
            json=data,
            verify=False,
            proxies=None, # No need for proxies as it is internal service
            auth=(CSS_AAF_USERNAME, CSS_AAF_PASSWORD)
        )
        response.raise_for_status()
        logger.info(f'Successfully made request to orchestrator {url} and tenant {tenant_id}')
        return StandardResponse(200, 'OK', 'Successfully made request to VeloCloud orchestrator', data=response.json())
    except Exception as err:
        return StandardResponse.handle_request_exception(err)
    
def get_orchestrator_list(filters=None):
    """
    Get the list of VeloCloud orchestrators from the CSS ORM.
    
    :param filters: A dictionary of filters to apply (e.g., id, url, tenant_id, tags).
    :return: A list of VeloCloud orchestrators.
    """
    params = {}
    if filters:
        if 'id' in filters:
            params['id'] = filters['id']
        if 'url' in filters:
            params['url'] = filters['url']
        if 'tenant_id' in filters:
            params['tenant_id'] = filters['tenant_id']
        if 'tags' in filters:
            params['tags'] = filters['tags']
    
    try:
        logger.info('Getting the list of VeloCloud orchestrators from the CSS ORM.')
        logger.info(f'Using filters: {params}')
        response = make_api_request(
            url=CSS_ORM_URL + '/orchestratorlist/',
            method='GET',
            headers={'Content-Type': 'application/json'},
            params=params,
            proxies=None # No need for proxies as it is internal service
        )
        response.raise_for_status()
        response_data = response.json().get('results', [])
        # Filter out the sub_tags if passed in filters
        # For example, if sub_tags = 'elastic=true', then only return the orchestrators where the 'tag' has the value 'elastic=true'
        if 'sub_tags' in filters:
            logger.info(f'Applying sub_tags filter: {filters["sub_tags"]}')
            sub_tags_filters = [tag.strip() for tag in filters['sub_tags'].split(',')]
            response_data = [
                orchestrator for orchestrator in response_data
                if orchestrator['tags'] and all(sub_tag in orchestrator['tags'].split(',') for sub_tag in sub_tags_filters)
            ]
        logger.info(f'Successfully retrieved the list of VeloCloud orchestrators')
        logger.info(f'Recieved total {len(response_data)} VCOs')
        if not response_data:
            return StandardResponse(404, 'Not Found', 'No orchestrators found, that match the filters')
        return StandardResponse(200, 'OK', 'Successfully retrieved the list of VeloCloud orchestrators', data=response_data)
    except Exception as err:
        return StandardResponse.handle_request_exception(err)