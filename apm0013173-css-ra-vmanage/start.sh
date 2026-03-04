#!/bin/sh -xe
NETWORK_CONFIG=""
ENV_CONFIG="--env-file .dockerenv"

if [ "$3" = "--no-env" ]
then
    ENV_CONFIG=""
fi

if [ "$2" = "--no-network" ]
then
    NETWORK_CONFIG="--network none"
fi

source .dockerenv
docker build \
    --tag css-ra-vmanage \
    --build-arg ENV=$ENV \
    --build-arg "PYPI_HOST=$PYPI_HOST" \
    --build-arg "PYPI_AUTH=$PYPI_AUTH" \
    --build-arg "PYPI_REPO=$PYPI_REPO" \
    --build-arg "http_proxy=$http_proxy" \
    --build-arg "https_proxy=$http_proxy" \
    --build-arg "no_proxy=$no_proxy" \
    --file Dockerfile .

docker rm --force css-ra-vmanage || true
docker run \
    --detach --interactive --tty \
    ${NETWORK_CONFIG} \
    --name css-ra-vmanage \
    --publish 54322:8000 \
    --env ENV=$ENV \
    ${ENV_CONFIG} \
    css-ra-vmanage
if [ ! "$1" = "--no-log" ]
then
    docker logs -f css-ra-vmanage
fi
