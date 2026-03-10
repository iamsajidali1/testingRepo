import logging
from django.utils.decorators import method_decorator

from drf_yasg.utils import swagger_auto_schema

from rest_framework import generics, status
from rest_framework.response import Response

from api.services.crypt import get_credentials_from_crypt
from api.services.velocloud import get_orchestrator_list, make_velocloud_request
from datetime import timedelta, timezone, datetime

from api.velocloud.serializers import NetworkInsightsSerializer


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s: %(levelname)-8s: %(message)s')
logger = logging.getLogger(__name__)

@method_decorator(name='get', decorator=swagger_auto_schema(tags=["VeloCloud"]))     
class NetworkInsights(generics.GenericAPIView):
    """
    NetworkInsights View to handle GET requests for network insights.

    This view handles the retrieval of network insights from VeloCloud Orchestrators.
    It processes the incoming GET request, fetches the necessary data from the orchestrators,
    and returns the aggregated network insights.

    Methods:
    --------
    get(request, *args, **kwargs):
        Handles GET requests to retrieve network insights.

    Parameters:
    -----------
    request : Request
        The incoming HTTP request.
    *args : tuple
        Additional positional arguments.
    **kwargs : dict
        Additional keyword arguments.

    Query Parameters:
    -----------------
    start_time : str, optional
        The start time for the network insights data in ISO 8601 format. Defaults to the current time.
    end_time : str, optional
        The end time for the network insights data in ISO 8601 format. Defaults to 5 minutes after the current time.

    Returns:
    --------
    Response
        A DRF Response object containing the network insights data or an error message.

    Response Codes:
    ---------------
    200 OK:
        The request was successful, and the network insights data is returned.
    404 Not Found:
        No VeloCloud Orchestrators were found.
    500 Internal Server Error:
        An unexpected error occurred while processing the request.

    Example:
    --------
    GET /api/network-insights?start_time=2023-01-01T00:00:00Z&end_time=2023-01-01T01:00:00Z&filters=["filter1", "filter2"]

    Notes:
    ------
    - The method logs incoming requests and their parameters.
    - It retrieves the list of VeloCloud Orchestrators using specific tags.
    - If no orchestrators are found, it returns a 404 response.
    - For each orchestrator, it fetches credentials and makes a request to the VCO API to get network insights.
    - If no credentials or link stats are found for an orchestrator, it logs the error and continues to the next one.
    - The final response is a list of network insights from all orchestrators.
    """
    serializer_class = NetworkInsightsSerializer
    
    def get(self, request, *args, **kwargs):
        try:
            # Parse query parameters
            now = datetime.now(timezone.utc)
            start_time = request.query_params.get('start_time', (now - timedelta(minutes=15)).isoformat())
            end_time = request.query_params.get('end_time', (now - timedelta(minutes=10)).isoformat())

            # Fetch orchestrators
            orchestrators_response = get_orchestrator_list({'sub_tags': 'elastic:true,report:NetworkInsights'})
            if orchestrators_response.has_error():
                orchestrators_response.log_error()
                return Response(orchestrators_response.to_dict(), status=orchestrators_response.status_code)

            orchestrators = orchestrators_response.get_data()
            if not orchestrators:
                logger.warning("No orchestrators found.")
                return Response({"message": "No orchestrators found."}, status=status.HTTP_404_NOT_FOUND)

            # Process each orchestrator
            response_data = []
            for orchestrator in orchestrators:
                network_insights = self._fetch_network_insights(orchestrator, start_time, end_time)
                if network_insights:
                    response_data.append(network_insights)

            # Serialize and return the response
            serializer = self.serializer_class(data=response_data, many=True)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}", exc_info=True)
            return Response({"message": f"An unexpected error occurred!"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _fetch_network_insights(self, orchestrator, start_time, end_time):
        """
        Fetch network insights for a given orchestrator.
        """
        try:
            # Fetch credentials
            crypt_response = get_credentials_from_crypt(
                url=orchestrator['url'],
                tags=orchestrator['tags'],
                vendor='VELOCLOUD'
            )
            if crypt_response.has_error():
                logger.error(f"Failed to get credentials for orchestrator {orchestrator['url']}")
                crypt_response.log_error()
                return None

            credentials = crypt_response.get_data()[0]

            # Prepare request parameters
            velo_request_params = {
                "url": orchestrator['url'],
                "tenant_id": orchestrator['tenant_id'],
                "username": credentials['username'],
                "password": credentials['password'],
                "data": {
                    "params": [
                        {"name": "timestart", "value": start_time},
                        {"name": "timeend", "value": end_time}
                    ],
                    "devices": []
                }
            }

            # Fetch link stats
            link_stats = self._fetch_stats(velo_request_params, '/report/aggregatedLinksStatistics')
            # Fetch edge stats
            edge_stats = self._fetch_stats(velo_request_params, '/report/aggregatedEdgeStatistics')

            # Return aggregated insights
            return {
                'orchestrator': orchestrator['url'],
                'tenantId': orchestrator['tenant_id'],
                'tags': orchestrator['tags'],
                'linkStats': link_stats.get('data'),
                'edgeStats': edge_stats.get('data'),
                'timeSeries': {
                    'startTime': start_time,
                    'endTime': end_time
                }
            }

        except Exception as e:
            logger.error(f"Error fetching network insights for orchestrator {orchestrator['url']}: {e}", exc_info=True)
            return None

    def _fetch_stats(self, params, endpoint):
        """
        Fetch statistics from a given VeloCloud endpoint.
        """
        response = make_velocloud_request(**params, endpoint=endpoint)
        if response.has_error():
            response.log_error()
            return None
        return response.get_data()