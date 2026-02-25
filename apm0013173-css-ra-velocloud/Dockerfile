FROM oneeastus2cr2azn0hvf.azurecr.io/alpine:3.19
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
ENV PYPI_REPO_PATH="/artifactory/api/pypi/pypi-proxy/simple"
# Set proxy environment variables
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    sed -i "s|dl-cdn.alpinelinux.org/alpine|${JFROG_USERNAME}:${JFROG_TOKEN}@${JFROG_HOST}${ALPINE_REPO_PATH}|g" /etc/apk/repositories && \
    sed -i "s|@att.com|%40att.com|g; s|@intl.att.com|%40intl.att.com|g" /etc/apk/repositories

# install os packages
RUN apk update && apk upgrade --no-cache --allow-untrusted
RUN apk add --update --no-cache --allow-untrusted uwsgi-python3 \
    nginx ca-certificates build-base python3-dev py3-pip

ENV APP_DIR /app
WORKDIR $APP_DIR


COPY requirements.txt $APP_DIR/

RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    pip config set global.index-url "https://${JFROG_USERNAME}:${JFROG_TOKEN}@${JFROG_HOST}${PYPI_REPO_PATH}" && \
    pip config set global.trusted-host "${JFROG_HOST}" && \
    pip install --no-cache-dir --upgrade --break-system-packages pip && \
    pip install --no-cache-dir --break-system-packages -r requirements.txt

COPY nginx.conf uwsgi.ini run.sh $APP_DIR/
CMD "$APP_DIR"/run.sh

WORKDIR $APP_DIR

ARG ENV
ENV ENV $ENV

COPY . $APP_DIR

# Set non-root user permissions for application and accessory files
ENV USERNAME velocloud
ENV GROUP velocloud

RUN addgroup -S "$USERNAME" \
    && adduser -S "$USERNAME" -G "$GROUP" -u 10001 \
    && mkdir /var/cache/nginx \
    && chown -R "$USERNAME":"$GROUP" \
        /var/cache/nginx \
        /var/log/nginx \
        /var/lib/nginx \
    && chown -R "$USERNAME" "$APP_DIR"

USER "$USERNAME"