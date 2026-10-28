FROM artifact.it.att.com/astra-secure-container-catalog/python:3.14.6 AS build

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

ENV ENV=${ENV}
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TZ=UTC
ENV APP_DIR=/app
ENV VENV_DIR=/app/venv
ENV JFROG_HOST=artifact.it.att.com
ENV PYPI_REPO_PATH=/artifactory/api/pypi/pypi-proxy/simple

WORKDIR ${APP_DIR}

RUN python -m venv ${VENV_DIR}
ENV PATH="${VENV_DIR}/bin:${PATH}"

COPY requirements.txt ${APP_DIR}/requirements.txt

RUN --mount=type=secret,id=jfrog_username \
	--mount=type=secret,id=jfrog_access_token \
	set -eu; \
	JFROG_USERNAME="$(cat /run/secrets/jfrog_username)"; \
	JFROG_ACCESS_TOKEN="$(cat /run/secrets/jfrog_access_token)"; \
	pip config set global.index-url "https://${JFROG_USERNAME}:${JFROG_ACCESS_TOKEN}@${JFROG_HOST}${PYPI_REPO_PATH}"; \
	pip config set global.trusted-host "${JFROG_HOST}"; \
	pip install --no-cache-dir --upgrade pip setuptools; \
	pip install --no-cache-dir -r requirements.txt; \
	pip uninstall -y wheel 2>/dev/null || true

FROM artifact.it.att.com/astra-secure-container-catalog/python:3.14.6-r0-hardened

ARG ENV
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

ENV ENV=${ENV}
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TZ=UTC
ENV APP_DIR=/app
ENV VENV_DIR=/app/venv
ENV PATH="${VENV_DIR}/bin:${PATH}"

WORKDIR ${APP_DIR}

COPY --from=build ${VENV_DIR} ${VENV_DIR}
COPY --chown=10001:10001 . ${APP_DIR}

EXPOSE 8000

USER 10001:10001

ENTRYPOINT ["/app/venv/bin/gunicorn"]
CMD ["--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "10000", "--access-logfile", "-", "--error-logfile", "-", "velocloud_app.wsgi:application"]
