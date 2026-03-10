FROM oneeastus2cr2azn0hvf.azurecr.io/alpine:3.21

LABEL maintainer="Arif Toslim <toslim.arif@intl.att.com>"
LABEL description="CSS/ONE Data Aggregator using alpine image with ATT's internal repositories configured"

# Define build arguments
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

# Copy build secrets to the build environment and source them
# Update the repositories to use ATT's internal repository, also encode @ in the username
RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    sed -i "s|dl-cdn.alpinelinux.org/alpine|${JFROG_USERNAME}:${ALPINE_AUTH_TOKEN}@${JFROG_HOST}${ALPINE_REPO_PATH}|g" /etc/apk/repositories && \
    sed -i "s|@att.com|%40att.com|g; s|@intl.att.com|%40intl.att.com|g" /etc/apk/repositories

# Update and Upgrade OS packages
RUN apk update --allow-untrusted && apk upgrade --no-cache --allow-untrusted
# Install the required packages
RUN apk add --update --no-cache --allow-untrusted \
    uwsgi-python3 nginx ca-certificates build-base python3-dev libffi-dev py3-pip tzdata

# Set the Work Directory
ENV APP_DIR="/app"
WORKDIR $APP_DIR

# Copy the requirements file
COPY requirements.txt $APP_DIR

# Create a virtual environment and install the required python packages
RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    pip config set global.index-url "https://${JFROG_USERNAME}:${PYPI_AUTH_TOKEN}@${JFROG_HOST}${PYPI_REPO_PATH}" && \
    pip config set global.trusted-host "${JFROG_HOST}" && \
    pip install --no-cache-dir --upgrade --break-system-packages pip && \
    pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy the project files
COPY . $APP_DIR

# Copy the nginx configuration, uwsgi configuration, and the run script into the application directory
COPY nginx.conf uwsgi.ini run.sh $APP_DIR/

# Ensure the run script is executable
RUN chmod +x $APP_DIR/run.sh

# Set the default command to execute the run script located in the application directory
CMD "$APP_DIR"/run.sh

# Set non-root user permissions for application and accessory files
ENV USERNAME="aggregator"
ENV GROUP="aggregator"

RUN addgroup -S "$USERNAME" \
    && adduser -S "$USERNAME" -G "$GROUP" -u 10001 \
    && mkdir /var/cache/nginx \
    && chown -R "$USERNAME":"$GROUP" \
        /var/cache/nginx \
        /var/log/nginx \
        /var/lib/nginx \
    && chown -R "$USERNAME" "$APP_DIR"

USER "$USERNAME"