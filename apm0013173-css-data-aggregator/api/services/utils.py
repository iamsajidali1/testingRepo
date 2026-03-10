import logging
import requests

class StandardResponse:
    def __init__(self, status_code, status_text, message, data=None, error=None):
        """
        Initializes the StandardResponse object.

        Args:
            status_code (int): The HTTP status code.
            status_text (str): The HTTP status text.
            message (str): A message describing the response.
            data (optional): Additional data to include in the response. Defaults to None.
            error (optional): Error information to include in the response. Defaults to None.
        """
        self.status_code = status_code
        self.status_text = status_text
        self.message = message
        self.data = data
        self.error = error

    def get_data(self):
        """
        Returns the data from the response.

        Returns:
            The data included in the response.
        """
        return self.data

    def get_error(self):
        """
        Returns the error from the response.

        Returns:
            The error included in the response.
        """
        return self.error

    def is_success(self):
        """
        Checks if the response indicates a successful request.

        Returns:
            bool: True if the response is successful, False otherwise.
        """
        return 200 <= self.status_code < 300

    def has_error(self):
        """
        Checks if the response contains an error based on the HTTP status code.

        Returns:
            bool: True if the response contains an error, False otherwise.
        """
        return self.status_code >= 400

    def log_error(self):
        """
        Logs the error message and error details.
        """
        logger = logging.getLogger(__name__)
        logger.error(f"{self.message}: {self.error}")

    def to_dict(self):
        """
        Converts the StandardResponse object to a dictionary.

        Returns:
            dict: A dictionary representation of the StandardResponse object.
        """
        response = {
            "statusCode": self.status_code,
            "statusText": self.status_text,
            "message": self.message,
        }
        if self.data is not None:
            response["data"] = self.data
        if self.error is not None:
            response["error"] = self.error
        return response

    @staticmethod
    def handle_request_exception(exception):
        """
        Handles request exceptions and returns a StandardResponse.

        Args:
            exception (Exception): The exception to handle.

        Returns:
            StandardResponse: The standardized response for the exception.
        """
        logger = logging.getLogger(__name__)
        
        if isinstance(exception, requests.exceptions.HTTPError):
            logger.error(f'HTTP error occurred: {exception}')
            return StandardResponse(exception.response.status_code, 'HTTP Error', str(exception))
        elif isinstance(exception, requests.exceptions.ConnectionError):
            logger.error(f'Connection error occurred: {exception}')
            return StandardResponse(503, 'Connection Error', str(exception))
        elif isinstance(exception, requests.exceptions.Timeout):
            logger.error(f'Timeout error occurred: {exception}')
            return StandardResponse(504, 'Timeout Error', str(exception))
        elif isinstance(exception, requests.exceptions.RequestException):
            logger.error(f'Request error occurred: {exception}')
            return StandardResponse(400, 'Request Error', str(exception))
        else:
            logger.error(f'An unexpected error occurred: {exception}')
            return StandardResponse(500, 'Unexpected Error', str(exception))