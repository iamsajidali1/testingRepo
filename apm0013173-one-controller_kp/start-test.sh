#!/bin/sh
docker run -it -v $(pwd):/app --rm --entrypoint sh --workdir /app node:18-alpine
