#!/bin/sh
set -eu
NETWORK_CONFIG=""
ENV_CONFIG="--env-file .dockerenv"

if [ "${3:-}" = "--no-env" ]
then
    ENV_CONFIG=""
fi

if [ "${2:-}" = "--no-network" ]
then
    NETWORK_CONFIG="--network none"
fi

. ./.dockerenv
# Supply the two BuildKit secrets used by the primary Dockerfile. The legacy
# build_secrets file may use JFROG_TOKEN instead of JFROG_ACCESS_TOKEN.
. ./build_secrets
export JFROG_USERNAME
JFROG_ACCESS_TOKEN="${JFROG_ACCESS_TOKEN:-${JFROG_TOKEN:-}}"
export JFROG_ACCESS_TOKEN
: "${JFROG_USERNAME:?Missing JFROG_USERNAME in build_secrets}"
: "${JFROG_ACCESS_TOKEN:?Missing JFROG_ACCESS_TOKEN or JFROG_TOKEN in build_secrets}"
docker build \
    --tag css-ra-velocloud \
    --secret id=jfrog_username,env=JFROG_USERNAME \
    --secret id=jfrog_access_token,env=JFROG_ACCESS_TOKEN \
    --build-arg "ENV=${ENV:-dev}" \
    --build-arg "HTTP_PROXY=${http_proxy:-${HTTP_PROXY:-}}" \
    --build-arg "HTTPS_PROXY=${https_proxy:-${HTTPS_PROXY:-}}" \
    --build-arg "NO_PROXY=${no_proxy:-${NO_PROXY:-}}" \
    --file Dockerfile .

docker rm --force css-ra-velocloud || true
docker run \
    --detach --interactive --tty \
    ${NETWORK_CONFIG} \
    --name css-ra-velocloud \
    --publish 54321:8000 \
    --env ENV=$ENV \
    ${ENV_CONFIG} \
    css-ra-velocloud
if [ ! "${1:-}" = "--no-log" ]
then
    docker logs -f css-ra-velocloud
fi
