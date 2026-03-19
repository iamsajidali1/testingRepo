#!/bin/sh
set -ex
image=$(docker images|grep $1|awk '{print $1 ":" $2}'|head -n 1)
docker run --interactive --network none ${image} \
    sh -c 'touch /app/api/controllers/certs/client.cert.x509&&touch /app/api/controllers/certs/mcap.pem&&npm run test'