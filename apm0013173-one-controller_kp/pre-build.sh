#!/bin/sh
set -ex

# in-repo modules
## docs
docker build \
    --tag dockercentral.it.att.com:5100/com.att.bok/one-docs:${TARGET_ENV} \
    --file Dockerfile.docs .
docker push dockercentral.it.att.com:5100/com.att.bok/one-docs:${TARGET_ENV}

## orm
docker build \
    --tag dockercentral.it.att.com:5100/com.att.bok/css-orm:python \
    --file orm/Dockerfile orm
docker push dockercentral.it.att.com:5100/com.att.bok/css-orm:python

# out-repo submodules
## carche
set +x
echo build carche with creds
docker build \
    --tag dockercentral.it.att.com:5100/com.att.bok/css-carche:${TARGET_ENV} \
    --file carche/Dockerfile \
    --build-arg PYPI_AUTH=${PYPI_AUTH} \
    --build-arg PYPI_REPO=${PYPI_REPO} \
    --build-arg http_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg https_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg no_proxy=.att.com \
    carche
set -x

## crypt
set +x
echo build crypt with creds
docker build \
    --tag dockercentral.it.att.com:5100/com.att.bok/css-crypt:${TARGET_ENV} \
    --file crypt/Dockerfile \
    --build-arg PYPI_AUTH=${PYPI_AUTH} \
    --build-arg PYPI_REPO=${PYPI_REPO} \
    --build-arg http_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg https_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg no_proxy=dockercentral.it.att.com \
    crypt
set -x

## css-ra-velocloud
set +x
echo build css-ra-velocloud with creds
docker build \
    --tag dockercentral.it.att.com:5100/com.att.bok/css-ra-velocloud:${TARGET_ENV} \
    --file css-ra-velocloud/Dockerfile \
    --build-arg PYPI_AUTH=${PYPI_AUTH} \
    --build-arg PYPI_REPO=${PYPI_REPO} \
    --build-arg http_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg https_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg no_proxy=dockercentral.it.att.com \
    css-ra-velocloud
set -x

## css-ra-viptela
set +x
echo build css-ra-viptela with creds
docker build \
    --tag dockercentral.it.att.com:5100/com.att.bok/css-ra-viptela:${TARGET_ENV} \
    --file css-ra-viptela/Dockerfile \
    --build-arg PYPI_AUTH=${PYPI_AUTH} \
    --build-arg PYPI_REPO=${PYPI_REPO} \
    --build-arg http_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg https_proxy=http://pxyapp.proxy.att.com:8080 \
    --build-arg no_proxy=dockercentral.it.att.com \
    css-ra-viptela
set -x
