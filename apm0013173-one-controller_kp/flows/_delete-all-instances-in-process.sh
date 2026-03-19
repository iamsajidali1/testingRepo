#!/bin/sh
# https://docs.camunda.org/manual/7.7/reference/rest/process-instance/delete/
BASE="https://bok.dev.att.com"
instances=$(
    curl -H "Content-Type: application/json" \
         -X POST \
         ${BASE}/engine-rest/process-instance \
         --data-raw '{
             "processDefinitionKey": "'$1'"
         }'\
    |json_pp\
    |grep '"id"'\
    |awk '{print $3}'\
    |sed -e 's/[,"]//g'
)

for inst in $instances
do
    curl -H "Content-Type: application/json" \
         -X DELETE \
         ${BASE}/engine-rest/process-instance/${inst}?skipIoMappings=true \
         -w "\n${inst} -> %{http_code}\n"
done
