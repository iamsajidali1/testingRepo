#!/bin/sh
# https://docs.camunda.org/manual/7.13/reference/rest/process-definition/post-start-process-instance/
PROCESS_NAME="MdsVelocloud"
curl -H "Content-Type: application/json" -X POST \
https://bok.dev.att.com/engine-rest/process-definition/key/${PROCESS_NAME}/start \
--data-raw '{
    "variables":{
        "vcoProtocol":{"value":"",                                  "type":"string"},
        "vcoHostname":{"value":"something.velocloud.net",           "type":"string"},
        "vcoUsername":{"value":"user",                              "type":"string"},
        "vcoPassword":{"value":"pass",                              "type":"string"},
        "emails":     {"value":"attuid@att.com,attuid@intl.att.com","type":"string"}
    }
}'|json_pp
