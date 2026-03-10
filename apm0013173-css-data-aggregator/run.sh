#!/bin/sh
set -xe  # Exit immediately if a command exits with a non-zero status, and print each command before executing it

# database
# python3 manage.py migrate  # Uncomment this line if you need to apply database migrations at startup

# Collect static files without user input
python3 manage.py collectstatic --noinput # Uncomment this line if you need to collect static files at startup

# Start Nginx with the specified configuration file in the background
nginx -c $APP_DIR/nginx.conf

# Start uWSGI with the specified configuration file and redirect output to stdout
uwsgi --ini $APP_DIR/uwsgi.ini > /dev/stdout