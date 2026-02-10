# CSS Resource Adapter - Utilities

A microservice to host all important and critical utility functions used in CSS/ONE 29786.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [License](#license)

## Overview

This microservice provides a centralized set of utility functions for the CSS/ONE platform, streamlining common operations and integrations.

## Features

- Centralized utility functions for CSS/ONE
- RESTful API endpoints
- Dockerized deployment
- Configurable via environment variables and YAML files
- Includes Helm chart for Kubernetes deployment

## Project Structure

```
.
├── api/                # API endpoints and business logic
│   ├── queries/        # Query modules
│   ├── templates/      # API templates
│   └── tests/          # API tests
├── chart/              # Helm chart for Kubernetes deployment
├── config/             # Configuration files
├── static/             # Static files (CSS, JS, images)
├── utilities_app/      # Django app configuration and middleware
├── Dockerfile*         # Docker build files
├── requirements.txt    # Python dependencies
├── manage.py           # Django management script
├── README.md           # Project documentation
└── ...                 # Other supporting files
```

## Getting Started

### Prerequisites

- Python 3.13+
- Docker (optional, for containerized deployment)
- pip
- docker-ce

### Local Installation

1. Clone the repository:
    ```sh
    git clone <repo-url>
    cd apm0013173-css-ra-utilities
    ```
2. Set local env for JFROG
    ```
    export JFROG_USERNAME=xxxx
    export JFROG_TOKEN=xxxxxxx
    ```
3. Create local docker image:
    ```
    docker build -t css-ra-utilities:local --platform linux/amd64 --build-arg ENV="dev" --build-arg HTTP_PROXY="http://sub.proxy.att.com:8080" --build-arg NO_PROXY=".att.com" --secret id=build_secrets,src=./.env -f Dockerfile.local .
    ```
4. Run local image
    ```
    docker run -dti -h css-ra-utilities --name css-ra-utilities -p 1621:8000 -v path/to/css-ra-utilities/local:/app/ css-ra-utilities:local
    ```
5. Ask for env file from mh592s / ms639x@
    ```
    copy .env to Your local project root folder
    ```
6. Connect to local container
    ```
    docker exec -it css-ra-utilities bash
    ```
7. Finish local setup
    ```
    export $(grep -v '^#' .env | xargs -d '\n')
    python3 -m venv venv 
    ./venv/bin/pip config set global.index-url "https://${JFROG_USERNAME}:${JFROG_TOKEN}@artifact.it.att.com/artifactory/api/pypi/pypi-proxy/simple" 
    ./venv/bin/pip config set global.trusted-host "artifact.it.att.com" 
    ./venv/bin/pip install --upgrade pip 
    ./venv/bin/pip install --no-cache-dir -r requirements.txt
    ```
8. Run Local Server
    ```
    ./venv/bin/python3 manage.py runserver 0.0.0.0:8000
    ```

## Development

- Main app code is in the `api/` and `utilities_app/` directories.
- Configuration is managed via files in `config/` and environment variables.
- Static assets are in `static/`.

## Testing

To run tests:

```sh
python manage.py test
```

## Deployment

- Use the provided Dockerfiles for containerized deployment.
- Helm chart in `chart/` can be used for Kubernetes deployments.

## Configuration

- Environment variables and files in `config/` control runtime settings.
- See `requirements.txt` and `compile-requirements.txt` for dependencies.

---

For more details, see the code and comments in each module.