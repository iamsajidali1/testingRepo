#!/bin/sh
set -ex
image=$(docker images|grep $1|awk '{print $1 ":" $2}'|head -n 1)
docker run -i --network none ${image} /app/backend/test.sh
