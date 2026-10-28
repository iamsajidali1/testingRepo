#!/bin/sh
set -e

# Native asset collection for the alternative nginx container startup path.
python3 manage.py collectstatic --noinput

ls -lah /var/log/nginx

# bg
nginx -c $APP_DIR/nginx.conf

# fg
export SCRIPT_NAME=""
exec gunicorn -c gunicorn.py
