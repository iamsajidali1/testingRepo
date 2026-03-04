#!/bin/sh
set -xe

python3 manage.py collectstatic
nginx -c $APP_DIR/nginx.conf
uwsgi --ini $APP_DIR/uwsgi.ini > /dev/stdout
