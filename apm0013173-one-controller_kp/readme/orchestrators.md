# Velocloud Orchestrator License Details

## REST API Details

### Base URL

```
https://selfservice.web.att.com/api/orchestrator/vco/
```

### Authentication

- **Method**: Basic Authentication (AAF Auth Username and Password)
- **Headers**:
  - `Authorization: Basic <base64-encoded-credentials>`
- **Details**: AAF Namespace Credentials can be used, please send the complete aaf username to [Arif, Toslim](mailto://toslim.arif@att.com) for access. Also global logon credentials can also be used. i.e., Username as `<ATT_UID>@csp.att.com` and GL Password 

### Endpoints

#### Get License Details

- **Endpoint**: `/license`
- **Method**: `GET`
- **Description**: Retrieve the license details for the Velocloud Orchestrator.
- **Query Parameters**:
  - `orchestrator` (string, required): The fully qualified domain name (FQDN) of the Velocloud Orchestrator, including the protocol. Example: `https://vco92-usvi1.velocloud.net/`
  - `management` (string, optional): The management tag. Must be a string with a length between 2 and 255 characters.
- **Headers**:
  - `Content-Type: application/json`
- **Response**:
  ```json
  {
    "statusCode": 200,
    "message": "License data fetched successfully!",
    "data": [
      {
        "orchestrator": "https://vco206-fra1.velocloud.net/",
        "tenantId": 1,
        "management": "ATT",
        "licenseDetails": {
          "licenses": [{...}, {...}, ...],
          "licenseCount": 1218,
          "updatedAt": "2024-11-26T15:02:43.000Z"
        }
      }
    ]
  }
  ```

#### Example Request

```bash
curl --location 'https://selfservice.web.att.com/api/orchestrator/vco/license?orchestrator=https%3A%2F%2Fvco92-usvi1.velocloud.net%2F&management=ATT' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic <base64-encoded-credentials>'
```

#### Example Response

```json
{
  "statusCode": 200,
  "message": "License data fetched successfully!",
  "data": [
    {
      "orchestrator": "https://vco206-fra1.velocloud.net/",
      "tenantId": 1,
      "management": "ATT",
      "licenseDetails": {
        "licenses": [{...}, {...}, ...],
        "licenseCount": 999,
        "updatedAt": "2024-11-26T15:02:43.000Z"
      }
    }
  ]
}
```

#### Example Errors

Bad Request, No Params Passed
```json
{
    "statusCode": 422,
    "message": "Bad Request! Request validation Failed!.",
    "errors": [
        {
            "value": "",
            "msg": "Invalid value",
            "param": "orchestrator",
            "location": "query"
        }
    ]
}
```

### Error Codes

- `400 Bad Request`: Invalid request parameters.
- `401 Unauthorized`: Authentication failed.
- `404 Not Found`: License details not found.
- `422 Unprocessed request`: The required param `orchestrator` is missing
- `500 Internal Server Error`: An error occurred on the server.

For more details, please contsact [Arif, Toslim](mailto://toslim.arif@int.att.com).
