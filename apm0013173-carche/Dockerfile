FROM python:3.9-alpine3.20
LABEL MAINTAINER Arif Toslim <toslim.arif@intl.att.com>

# install skeleton
RUN apk update && apk --no-cache add --upgrade ca-certificates expat perl-utils apkbuild-cpan

ENV APP_DIR /code
WORKDIR $APP_DIR

ARG CSS_ENV
ENV CSS_ENV $CSS_ENV
ENV PYTHONUNBUFFERED 1

COPY requirements.txt $APP_DIR/

COPY . $APP_DIR
COPY cert-combined.pem $APP_DIR/cert-combined.pem


# Some latest packages
RUN python3 -m pip install --upgrade pip setuptools
RUN python3 -m pip install --no-input --upgrade -r requirements.txt --break-system-packages
RUN cpan JSON


COPY . $APP_DIR
CMD "$APP_DIR"/run.sh

# Set non-root user permissions for application and accessory files
ENV USERNAME carche
ENV GROUP carche

RUN addgroup -S "$USERNAME" \
    && adduser -S "$USERNAME" -G "$GROUP" -u 10001 \
    && chown -R "$USERNAME" /usr/share/ \
    && chown -R "$USERNAME" "$APP_DIR"

USER "$USERNAME"

EXPOSE 8000