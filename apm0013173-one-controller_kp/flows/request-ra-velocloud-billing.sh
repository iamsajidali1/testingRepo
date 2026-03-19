#!/bin/sh
# https://docs.camunda.org/manual/7.13/reference/rest/process-definition/post-start-process-instance/
BASE="https://self-service.dev.att.com"
PROCESS_NAME="RequestRAVeloBilling"
curl -H "Content-Type: application/json" -X POST \
${BASE}/engine-rest/process-definition/key/${PROCESS_NAME}/start \
--data-raw '{
    "variables":{
        "cryptBody": {"value": "{\"kdbx_name\": \"css-ra-velocloud\",\"password\": \"INSERT PASSWORD\", \"tags\":[\"access:msp\", \"customer:ncr\"]}", "type": "string"},
        "emails":    {"value": "pb548a@att.com", "type": "string"}
    }
}' -v -H "Authorization: Basic <cssbackend:password>"
