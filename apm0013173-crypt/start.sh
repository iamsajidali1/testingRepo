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
    --tag crypt \
    --build-arg "PYPI_HOST=$PYPI_HOST" \
    --build-arg "PYPI_AUTH=$PYPI_AUTH" \
    --build-arg "PYPI_REPO=$PYPI_REPO" \
    --build-arg "http_proxy=$http_proxy" \
    --build-arg "https_proxy=$http_proxy" \
    --build-arg "no_proxy=$no_proxy" \
    --file Dockerfile .

docker rm --force crypt || true
docker run \
    --detach --interactive --tty \
    ${NETWORK_CONFIG} \
    --name crypt \
    --publish 16161:8000 \
    --env ENV=$ENV \
    ${ENV_CONFIG} \
    crypt
if [ ! "$1" = "--no-log" ]
then
    docker logs -f crypt
fi
