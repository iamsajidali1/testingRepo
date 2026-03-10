# CSS Data Aggregator

## Overview
The Aggregator API is a Django-based microservice designed to provide a summary of its status and other relevant information. This project serves as a foundational API for data aggregation tasks.

## Features
- RESTful API built with Django and Django REST Framework.
- Endpoint to retrieve the summary of the microservice and its current status.

## Requirements
- Python 3.x
- Django 5.1.6
- Django REST Framework

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/ATT-DP1/apm0013173-css-data-aggregator.git
   cd apm0013173-css-data-aggregator
   ```

2. Create and activate a virtual environment:
   ```
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install the required packages:
   ```
   pip3 install -r requirements.txt --verbose
   ```

4. Apply migrations:
   ```
   python manage.py migrate
   ```

5. Run the development server:
   ```
   python manage.py runserver
   ```

## Usage
- Access the API at `http://localhost:8000/api/summary/` to get the microservice summary and status.

## Responses
The API provides standardized responses for both success and error cases. The response format includes the following fields:

- `statusCode`: The HTTP status code.
- `statusText`: The HTTP status text.
- `message`: A message describing the response.
- `data`: Additional data to include in the response (only for successful responses).
- `error`: Error information to include in the response (only for error responses).

### Example Success Response
```json
{
    "statusCode": 200,
    "statusText": "OK",
    "message": "Successfully retrieved data",
    "data": {
        // ... your data here ...
    }
}
```

### Example Error Response
```json
{
    "statusCode": 500,
    "statusText": "Internal Server Error",
    "message": "An unexpected error occurred",
    "error": "Detailed error message"
}
```

## License
This project is licensed under the MIT License.

## Author
- Arif, Toslim (toslim.arif@att.com)