#############
### BUILD ###
#############
FROM oneeastus2cr2azn0hvf.azurecr.io/node:20-alpine AS builder
# base image

# set some labels
LABEL APPLICATION="Open Network Experience (ONE)"
LABEL MOTSID="29786"
LABEL MODULE="CSS Front-End"
LABEL MAINTAINER="Arif, Toslim <ta147p@att.com>"

# define build arguments
ARG ENV
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# define and set environment variables
ENV NODE_ENV=${ENV}
# Set the AT&T Internal Artifact URL
ENV JFROG_HOST="artifact.it.att.com"
# Set the AT&T Pypi Repository URL Path
ENV NPM_REPO_PATH="/artifactory/api/npm/apm0013173-npm-bok-group/"
# Set proxy environment variables
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

# Set the Work Directory
ENV APP_DIR="/usr/src/app"
WORKDIR $APP_DIR

# Copy the package.json files
COPY package.json package-lock.json $APP_DIR

# Set global npm configuration with the JFrog NPM Repository URL
RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    npm config set email "${JFROG_USERNAME}" && \
    npm config set registry "https://${JFROG_HOST}${NPM_REPO_PATH}" && \
    npm config set "//${JFROG_HOST}${NPM_REPO_PATH}:_authToken=${NPM_AUTH_TOKEN}" && \
    npm config set proxy "${HTTP_PROXY}" && \
    npm config set https-proxy "${HTTPS_PROXY}" && \
    npm config set noproxy "${NO_PROXY}" && \
    npm install --legacy-peer-deps --verbose && \
    npm install -g @angular/cli@14.0.0 --verbose

COPY . $APP_DIR

# Make the Build
RUN ng version
# Build for AT&T Internal
RUN ng build --output-path=./dist/out --configuration=${NODE_ENV}


############
### PROD ###
############
FROM oneeastus2cr2azn0hvf.azurecr.io/nginx:alpine

# Set the AT&T Internal Artifact URL
ENV JFROG_HOST="artifact.it.att.com"
# Set the AT&T Alpine Repository URL Path
ENV ALPINE_REPO_PATH="/artifactory/dl-cdn-alpinelinux-org"

# Update the repositories to use ATT's internal repository, also encode @ in the username
RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    sed -i "s|dl-cdn.alpinelinux.org/alpine|${JFROG_USERNAME}:${ALPINE_AUTH_TOKEN}@${JFROG_HOST}${ALPINE_REPO_PATH}|g" /etc/apk/repositories && \
    sed -i "s|@att.com|%40att.com|g; s|@intl.att.com|%40intl.att.com|g" /etc/apk/repositories

RUN cat /etc/apk/repositories

RUN apk update --no-cache && apk upgrade --no-cache

# Lean the image by cutting unnecessary vulnerable packages
RUN apk del -r tiff curl

RUN mkdir /usr/share/nginx/html/css
COPY --from=builder /usr/src/app/dist/out /usr/share/nginx/html/css

# Copy the default nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

ENV USERNAME="cssfrontend"
ENV GROUP="cssfrontend"
# Set non-root user permissions for application and accessory files
RUN addgroup -S "$USERNAME" \
    && adduser -S "$USERNAME" -G "$GROUP" -u 1001 \
    && chown -R "$USERNAME":"$GROUP" \
        /var/cache/nginx \
        /var/log/nginx \
        /usr/share/nginx/html/ \
        /etc/nginx

# Create new PID file with non-root user read/write access
RUN touch /var/run/nginx.pid && \
    chown -R "$USERNAME":"$GROUP" /var/run/nginx.pid

USER "$USERNAME"
EXPOSE 8000
