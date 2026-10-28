"""Gunicorn *development* config file"""

# FastAPI ASGI application (Gunicorn's setting retains its historical name).
wsgi_app = "velocloud_app.asgi:application"
worker_class = "uvicorn_worker.UvicornWorker"
# The granularity of Error log outputs
loglevel = "debug"
# The number of worker processes for handling requests
workers = 2
# The socket to bind
#bind = "0.0.0.0:8800"
bind = "unix:/app/config/gunicorn.sock"
# Restart workers when code changes (development only!)
reload = False
errorlog = '-'
loglevel = 'info'
accesslog = '-'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'
# Redirect stdout/stderr to log file
capture_output = True
# PID file so you can easily fetch process ID
# pidfile = "dev.pid"
# Daemonize the Gunicorn process (detach & enter background)
#daemon = True
timeout = 10000
keepalive = 5
