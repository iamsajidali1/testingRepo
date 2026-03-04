#!/bin/sh
set -e
./start.sh --no-log --no-network --no-env
docker exec -it crypt ./test.sh

if [ "$1" = "--browser" ]
then
    rm -rf htmlcov
    docker cp crypt:/app/htmlcov htmlcov
    open htmlcov/index.html
fi
