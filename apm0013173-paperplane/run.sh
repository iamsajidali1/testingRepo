#!/bin/sh
set -xe

# database
# python3 manage.py migrate

# static files such as DRF CSS + JS
python3 manage.py collectstatic

# bg
nginx -c $APP_DIR/backend/nginx.conf

# fg
uwsgi --ini $APP_DIR/backend/uwsgi.ini > /dev/stdout
