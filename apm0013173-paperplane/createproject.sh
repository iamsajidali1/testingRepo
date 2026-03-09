#!bin/sh
# pull TARGET_ENV from Jenkinsfile (defaults to git branch name)
# therefore dev | test | perf | prod branches
toolbox createproject \
    --app-name paperplanenew \
    --namespace com.att.paperplane \
    --output ../paperplane \
    --load-container-env \
    --lgw-certificate \
    --lgw-certificate-secret 'paperplane-${env.TARGET_ENV}-certificate' \
    --kubectl-optional-ymls \
        'ymls/${env.TARGET_ENV}/lgw-service.yml' \
        'ymls/${env.TARGET_ENV}/job-check-planned-messages.yml' \
    --memory-request 300Mi \
    --memory-limit 1600Mi \
    --cpu-limit 800m \
    --cpu-request 400m \
    --replicas 4 \
    --run-post-docker-build "['./post-build.sh', 'paperplanenew']" \
    --proxy pxyapp.proxy.att.com:8080 \
    --overwrite --no-jenkinsfile
