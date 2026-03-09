#!/bin/sh -xe
ENV=${ENV:-"DEV"}  # DEV|TEST|PERF|PROD

source .dockerenv
docker build \
    --tag paperplane_prod \
    --build-arg ENV=$ENV \
    --build-arg "PYPI_HOST=$PYPI_HOST" \
    --build-arg "PYPI_AUTH=$PYPI_AUTH" \
    --build-arg "PYPI_REPO=$PYPI_REPO" \
    --build-arg "http_proxy=$http_proxy" \
    --build-arg "https_proxy=$http_proxy" \
    --build-arg "no_proxy=$no_proxy" \
    --file Dockerfile .

docker rm -f paperplane_prod || true

docker run \
    --detach --interactive --tty \
    --name paperplane_prod \
    --publish 8001:8000 \
    --user paperplane \
    --env PP_ENV=$PP_ENV \
    --env-file .dockerenv \
    paperplane_prod

docker logs -f paperplane_prod
