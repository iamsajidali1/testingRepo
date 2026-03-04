FROM alpine:3.19
LABEL MAINTAINER Arif Toslim <toslim.arif@intl.att.com>

# install os packages
RUN apk update && apk upgrade --no-cache
RUN apk add --update --no-cache uwsgi-python3 \
    nginx ca-certificates build-base python3-dev libffi-dev

ENV APP_DIR /app
WORKDIR $APP_DIR

#install pip
RUN wget https://bootstrap.pypa.io/get-pip.py
RUN python3 get-pip.py --break-system-packages
RUN rm get-pip.py

COPY requirements.txt $APP_DIR/

RUN python3 -m pip install --no-input --upgrade -r requirements.txt --break-system-packages

COPY nginx.conf uwsgi.ini run.sh $APP_DIR/
CMD "$APP_DIR"/run.sh

WORKDIR $APP_DIR

ARG ENV
ENV ENV $ENV

COPY . $APP_DIR

# Set non-root user permissions for application and accessory files
ENV USERNAME crypt
ENV GROUP crypt

RUN addgroup -S "$USERNAME" \
    && adduser -S "$USERNAME" -G "$GROUP" -u 10001 \
    && mkdir /var/cache/nginx \
    && chown -R "$USERNAME":"$GROUP" \
        /var/cache/nginx \
        /var/log/nginx \
        /var/lib/nginx \
    && chown -R "$USERNAME" "$APP_DIR"

USER "$USERNAME"