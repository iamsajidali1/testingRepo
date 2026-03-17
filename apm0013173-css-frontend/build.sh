#!/bin/bash

docker build  --no-cache --progress=plain \
    --build-arg ENV='dev' \
    --build-arg HTTP_PROXY='http://sub.proxy.att.com:8080' \
    --build-arg HTTPS_PROXY='http://sub.proxy.att.com:8080' \
    --build-arg NO_PROXY='.extensions.svc,.vault.azure.net,localhost,127.0.0.1,10.0.16.0/24,.svc.cluster.local,.azurecr.io,.azure.com' \
    --secret id=build_secrets,src=./build.env \
    -t css-frontend:latest .