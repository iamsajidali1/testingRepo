#!/bin/sh
set -xe
cdpcreator createproject \
    --app-name carche \
    --namespace com.att.bok \
    --lgw-host bok.dev.att.com \
    --cpu-request 50m \
    --cpu-limit 100m \
    --memory-limit 200Mi \
    --lgw-uri /carche \
    --lgw-strip-uri \
    --lgw-plugin-aaf \
    --load-image-arg \
    --output ../self_service_carche \
    --jenkins-credentials-id 'com.att.bok_docker' \
    --lgw-host-map dev:bok.dev.att.com,test:bok.test.att.com,perf:bok.perf.att.com,prod:bok.web.att.com \
    --load-container-env \
    --lgw-plugin-cors \
    --lgw-https \
    --lgw-certificate \
    --lgw-certificate-secret 'com-att-bok-${env.TARGET_ENV}-certificate' \
    --lgw-upstream-connect-timeout 600000 \
    --lgw-upstream-read-timeout 600000 \
    --lgw-upstream-send-timeout 600000 \
    --proxy pxyapp.proxy.att.com:8080 \
    --no-proxy att.com \
    --overwrite