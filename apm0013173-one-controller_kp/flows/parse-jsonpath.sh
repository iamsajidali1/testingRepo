#!/bin/sh
# https://docs.camunda.org/manual/7.13/reference/rest/process-definition/post-start-process-instance/
BASE="https://bok.dev.att.com"
PROCESS_NAME="ParseJsonPath"
curl -H "Content-Type: application/json" -X POST \
${BASE}/engine-rest/process-definition/key/${PROCESS_NAME}/start \
--data-raw '{
    "variables":{
        "json":     {"value": "{\"firstName\":\"First\",\"lastName\":\"Last\",\"age\":123}", "type":"string"},
        "jsonpath": {"value": "$.firstName", "type":"string"}
    }
}'|json_pp
