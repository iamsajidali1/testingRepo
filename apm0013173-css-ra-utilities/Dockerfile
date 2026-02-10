FROM oneeastus2cr2azn0hvf.azurecr.io/debian:trixie-slim

SHELL ["/bin/bash", "-c"]

ARG ENV
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# Set the Service ENV
ENV ENV=${ENV}
# Set proxy environment variables
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

ENV APP_DIR=/app
WORKDIR $APP_DIR

RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    touch /etc/apt/auth.conf.d/jfrog.conf && \
    echo "machine artifact.it.att.com" > /etc/apt/auth.conf.d/jfrog.conf && \
    echo "login ${JFROG_USERNAME}" >> /etc/apt/auth.conf.d/jfrog.conf && \
    echo "password ${JFROG_TOKEN}" >> /etc/apt/auth.conf.d/jfrog.conf && \
    touch /etc/apt/sources.list.d/jfrog.sources && \
    echo "Types: deb" > /etc/apt/sources.list.d/jfrog.sources && \
    echo "URIs: https://artifact.it.att.com/artifactory/apm0013173-deb-group" >> /etc/apt/sources.list.d/jfrog.sources && \
    echo "Suites: trixie trixie-updates trixie-security" >> /etc/apt/sources.list.d/jfrog.sources && \
    echo "Components: main contrib" >> /etc/apt/sources.list.d/jfrog.sources && \
    echo "Trusted: yes" >> /etc/apt/sources.list.d/jfrog.sources && \
    rm /etc/apt/sources.list.d/debian.sources && \
    touch /etc/apt/apt.conf.d/99insecure && \
    echo 'Acquire::https::artifact.it.att.com::Verify-Peer "false";' >> /etc/apt/apt.conf.d/99insecure && \
    echo 'Acquire::https::artifact.it.att.com::Verify-Host "false";' >> /etc/apt/apt.conf.d/99insecure && \
    apt-get clean && apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends debian-archive-keyring ca-certificates build-essential \
    python3-pip uwsgi-plugin-python3 python3-dev python3-venv nginx libffi-dev wget unzip libaio1t64 libaio-dev openssl && \
    update-ca-certificates && \
    apt-get update && apt-get upgrade -y && \
    #remove jfrog token
    rm /etc/apt/auth.conf.d/jfrog.conf && \
    rm /etc/apt/sources.list.d/jfrog.sources && \
    rm /etc/apt/apt.conf.d/99insecure && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client
ENV ORACLE_HOME=/usr/local/instantclient
ENV LD_LIBRARY_PATH=$ORACLE_HOME
ENV PATH=$ORACLE_HOME:$PATH

RUN ln -sf /usr/lib/$(gcc -print-multiarch)/libaio.so.1t64 /usr/lib/$(gcc -print-multiarch)/libaio.so.1 && \
    ln -sf /usr/lib/$(gcc -print-multiarch)/libaio.so.1 /usr/lib/$(gcc -print-multiarch)/libaio.so && \
    if [ "$(uname -m)" = "x86_64" ]; then \
        wget -O /tmp/instantclient-basic.zip https://download.oracle.com/otn_software/linux/instantclient/2326000/instantclient-basiclite-linux.x64-23.26.0.0.0.zip; \
        wget -O /tmp/instantclient-sdk.zip https://download.oracle.com/otn_software/linux/instantclient/2326000/instantclient-sdk-linux.x64-23.26.0.0.0.zip; \
    elif [ "$(uname -m)" = "aarch64" ]; then \
        wget -O /tmp/instantclient-basic.zip https://download.oracle.com/otn_software/linux/instantclient/2390000/instantclient-basiclite-linux.arm64-23.9.0.25.07.zip; \
        wget -O /tmp/instantclient-sdk.zip https://download.oracle.com/otn_software/linux/instantclient/2390000/instantclient-sdk-linux.arm64-23.9.0.25.07.zip; \
    else echo "Unsupported architecture: $(uname -m)" && exit 1; \
    fi && \
    unzip -o /tmp/instantclient-basic.zip -d /usr/local && \
    unzip -o /tmp/instantclient-sdk.zip -d /usr/local && \
    ln -s /usr/local/instantclient_* /usr/local/instantclient && \
    echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig && \
    rm -f /tmp/*.zip && \
    mkdir -p /usr/local/instantclient/network/admin && \
    touch /usr/local/instantclient/network/admin/sqlnet.ora && \
    echo "SQLNET.ENCRYPTION_CLIENT = requested" > /usr/local/instantclient/network/admin/sqlnet.ora && \
    echo "SQLNET.ENCRYPTION_TYPES_CLIENT = (AES256)" >> /usr/local/instantclient/network/admin/sqlnet.ora
    #echo "SQLNET.crypto_checksum_client = requested" >> /usr/local/instantclient/network/admin/sqlnet.ora && \
    #echo "SQLNET.crypto_checksum_types_client = requested" >> /usr/local/instantclient/network/admin/sqlnet.ora

ENV TNS_ADMIN=/usr/local/instantclient/network/admin

COPY . $APP_DIR

RUN --mount=type=secret,id=build_secrets \
    source /run/secrets/build_secrets && \
    python3 -m venv venv && python3 --version && \ 
    ./venv/bin/pip config set global.index-url "https://${JFROG_USERNAME}:${JFROG_TOKEN}@artifact.it.att.com/artifactory/api/pypi/pypi-proxy/simple" && \
    ./venv/bin/pip config set global.trusted-host "artifact.it.att.com" && \
    ./venv/bin/pip install --upgrade pip && \
    ./venv/bin/pip install --no-cache-dir -r requirements.txt && \
    #remove jfrog token
    ./venv/bin/pip config unset global.index-url && \
    ./venv/bin/pip config unset global.trusted-host

CMD ./run.sh

ENV USERNAME=utilities
ENV GROUP=utilities

RUN groupadd --system "$GROUP" && \
    useradd --system --uid 10001 --gid "$GROUP" --shell /bin/bash --create-home "$USERNAME" && \
    mkdir -p /var/cache/nginx /var/log/nginx /var/lib/nginx/body "$APP_DIR" && \
    chown -R "$USERNAME":"$GROUP" /var/cache/nginx /var/log/nginx /var/lib/nginx && \
    chown -R "$USERNAME":"$GROUP" "$APP_DIR"

USER "$USERNAME"