#!/bin/sh
set -xe
docker build \
    --file Dockerfile \
    --tag css-orm:python \
    --build-arg https_proxy=$https_proxy .
docker run \
    --rm -p 6000:6000 -it \
    --env ONE_MYSQL_PASSWORD=$ONE_MYSQL_PASSWORD \
    css-orm:python
