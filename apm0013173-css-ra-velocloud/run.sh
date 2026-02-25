#!/bin/sh
set -xe

# static files such as DRF CSS + JS
python3 manage.py collectstatic --noinput

ls -lah /var/log/nginx

# bg
nginx -c $APP_DIR/nginx.conf

# fg
#uwsgi --ini $APP_DIR/uwsgi.ini > /dev/stdout
export SCRIPT_NAME=""
gunicorn -c gunicorn.py > /dev/stdout