#!bin/sh
toolbox createproject \
    --app-name cssravelocloud \
    --namespace com.att.bok \
    --tenant-namespace 'com.att.bok.${env.TARGET_ENV}' \
    --output ../css-ra-velocloud \
    --load-container-env \
    --cpu-request 50m \
    --cpu-limit 100m \
    --memory-limit 200Mi \
    --jenkins-credentials-id 'com.att.bok_docker' \
    --lgw-uri /css-ra-velocloud \
    --lgw-strip-uri \
    --lgw-host-map dev:bok.dev.att.com,test:bok.test.att.com,prod:bok.web.att.com \
    --lgw-plugin-aaf \
    --lgw-plugin-aaf-type-map \
        dev:com.att.bok.dev.access,test:com.att.bok.test.access,prod:com.att.bok.prod.access \
    --lgw-certificate \
    --lgw-certificate-secret-map 'dev:com-att-bok-dev-certificate,test:com-att-bok-test-certificate,perf:com-att-bok-perf-certificate,prod:com-att-bok-prod-certificate' \
    --lgw-https \
    --proxy pxyapp.proxy.att.com:8080 \
    --no-proxy .att.com \
    --overwrite
