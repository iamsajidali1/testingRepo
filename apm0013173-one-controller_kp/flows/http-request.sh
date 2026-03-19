#!/bin/sh
# https://docs.camunda.org/manual/7.13/reference/rest/process-definition/post-start-process-instance/
BASE="https://bok.dev.att.com"
PROCESS_NAME="HttpRequest"
curl -H "Content-Type: application/json" -X POST \
${BASE}/engine-rest/process-definition/key/${PROCESS_NAME}/start \
--data-raw '{
    "variables":{
        "method":           {"value": "get",                         "type":"string"},
        "url":              {"value": "http://httpbin.org/anything", "type":"string"},
        "body":             {"value": "",                            "type":"string"},
        "ignoreCertificate":{"value": "",                            "type":"string"},
        "headers":          {"value": "",                            "type":"string"},
        "useProxy":         {"value": true,                          "type":"boolean"},
        "proxyProtocol":    {"value": "http",                        "type":"string"},
        "proxyHost":        {"value": "pxyapp.proxy.att.com",        "type":"string"},
        "proxyPort":        {"value": "8080",                        "type":"string"}
    }
}'|json_pp
