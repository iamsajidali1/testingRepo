FROM oneeastus2cr2azn0hvf.azurecr.io/node:18-alpine
LABEL MAINTAINER Arif Toslim <toslim.arif@intl.att.com>


ARG ENV
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY


# Set the Service ENV
ENV ENV=${ENV}
# Set the AT&T Internal Artifact URL
ENV JFROG_HOST="artifact.it.att.com"
# Set the AT&T Alpine Repository URL Path
ENV ALPINE_REPO_PATH="/artifactory/dl-cdn-alpinelinux-org"
# Set the AT&T Pypi Repository URL Path
ENV NPM_REPO_PATH="/ui/repos/tree/General/npm-proxy"
# Set proxy environment variables
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    sed -i "s|dl-cdn.alpinelinux.org/alpine|${JFROG_USERNAME}:${ALPINE_AUTH_TOKEN}@${JFROG_HOST}${ALPINE_REPO_PATH}|g" /etc/apk/repositories && \
    sed -i "s|@att.com|%40att.com|g; s|@intl.att.com|%40intl.att.com|g" /etc/apk/repositories

# install os packages
RUN apk update && apk upgrade --no-cache --allow-untrusted
RUN apk add --update --no-cache python3-dev build-base libcap --allow-untrusted

ENV APP_DIR /app
WORKDIR $APP_DIR

ARG CSS_ENV
ENV CSS_ENV $CSS_ENV

# copy private dependencies
RUN mkdir deps
COPY /deps/* "$APP_DIR"/deps/

RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    printf "email = ${JFROG_USERNAME}\nalways-auth = true\nregistry=https://artifact.it.att.com/artifactory/api/npm/apm0013173-npm-bok-group/\n//artifact.it.att.com/artifactory/api/npm/apm0013173-npm-bok-group/:_authToken=${NPM_AUTH_TOKEN}" > .npmrc

RUN cat .npmrc

# copy package.json and install
COPY package.json "$APP_DIR"/

RUN npm install --only-prod --verbose

COPY . "$APP_DIR"

EXPOSE 8000
CMD /app/run.sh

# Set non-root user permissions for application and accessory files
ENV USERNAME controller
ENV GROUP controller

RUN addgroup -S "$USERNAME" \
    && adduser -S "$USERNAME" -G "$GROUP" -u 1001 \
    && chown -R "$USERNAME" "$APP_DIR"

USER "$USERNAME"