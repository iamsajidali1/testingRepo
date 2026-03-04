#!/bin/sh
set -ex
image=$(docker images|grep $1|awk '{print $1 ":" $2}'|head -n 1)
docker run -i --network none --env DJANGO_SECRET=test ${image} /app/test.sh
