#############
### BUILD ###
#############
FROM node:16 AS builder
# base image

# set some labels
LABEL APPLICATION="Open Network Experience (ONE)"
LABEL MOTSID="29786"
LABEL MODULE="OneTouch Frontend"
LABEL MAINTAINER="Arif, Toslim <ta147p@att.com>"

# take the ARGS
ARG NODE_ENV
# set the ENV
ENV NODE_ENV ${NODE_ENV}

# set working directory
ENV APP_DIR /usr/src/app
WORKDIR "$APP_DIR"
COPY package.json package-lock.json /usr/src/app/

RUN npm install --legacy-peer-deps
RUN npm install -g @angular/cli@10.0.1

COPY . /usr/src/app

# Make the Build
RUN ng version
# Build for AT&T Internal
RUN ng build --output-path=./dist/out --configuration=${NODE_ENV} --base-href "/onetouch/"


############
### PROD ###
############
FROM nginx:alpine
# build a nginx image with static website
# From 'builder' copy website to default nginx public folder
RUN apk update --no-cache && apk upgrade --no-cache
# Lean the image by cutting unnecessary vulnerable packages
RUN apk del -r tiff curl

RUN mkdir /usr/share/nginx/html/onetouch
COPY --from=builder /usr/src/app/dist/out /usr/share/nginx/html/onetouch

# Copy the default nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

ENV USERNAME onetouch
ENV GROUP onetouch
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
