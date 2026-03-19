#!/bin/sh
# https://docs.camunda.org/manual/7.13/reference/rest/process-definition/post-start-process-instance/
BASE="https://bok.dev.att.com"
PROCESS_NAME="RequestHttpBin"
curl -H "Content-Type: application/json" -X POST \
${BASE}/engine-rest/process-definition/key/${PROCESS_NAME}/start |json_pp
