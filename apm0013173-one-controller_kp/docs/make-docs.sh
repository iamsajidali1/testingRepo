#!/bin/sh
docker run -i \
   -v $(pwd):/app \
   -w /app \
   -e 'https_proxy=http://pxyapp.proxy.att.com:8080' \
   python:alpine \
   sh -c 'pip install -r /app/requirements.txt && apk add make && make html'
