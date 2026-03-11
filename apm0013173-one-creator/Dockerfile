#############
### build ###
#############
FROM node:16-alpine AS builder
# base image

# set some labels
LABEL APPLICATION="Open Network Experience (ONE)"
LABEL MOTSID="29786"
LABEL MODULE="ONE Front-End"
LABEL MAINTAINER="Arif, Toslim <ta147p@att.com>"

# Take the ARGS
ARG NODE_ENV
# Set the ENV
ENV NODE_ENV ${NODE_ENV}

# set working directory
WORKDIR /usr/src/app
COPY package.json package-lock.json /usr/src/app/

RUN npm install --legacy-peer-deps
RUN npm install -g @angular/cli@10.0.0

COPY . /usr/src/app

# Make the Build
RUN ng --version
RUN ng build --output-path=./dist/out --configuration=${NODE_ENV} --base-href "/one/"

############
### prod ###
############
FROM nginx:alpine

RUN apk update --no-cache && apk upgrade --no-cache
# Lean the image by cutting unnecessary vulnerable packages
RUN apk del -r tiff curl

# build a nginx image with static website
# From 'builder' copy website to default nginx public folder
RUN mkdir /usr/share/nginx/html/one
COPY --from=builder /usr/src/app/dist/out /usr/share/nginx/html/one

# Copy the default nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Set non-root user permissions for application and accessory files
ENV USERNAME onecreator
ENV GROUP onecreator

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
