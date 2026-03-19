#!/bin/sh
# https://docs.camunda.org/manual/7.13/reference/rest/process-definition/post-start-process-instance/
BASE="https://self-service.dev.att.com"
PROCESS_NAME="RequestCrypt"
curl -H "Content-Type: application/json" -X POST \
${BASE}/engine-rest/process-definition/key/${PROCESS_NAME}/start \
--data-raw '{
    "variables":{
        "body": {
            "value": "{\"kdbx_name\":\"css-ra-velocloud\",\"paths\":[\"VCO109\"],\"password\": \"ADD-PASSWORD-HERE\"}",
            "type": "string"
        }
    }
}'|json_pp
