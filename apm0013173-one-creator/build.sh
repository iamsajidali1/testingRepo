#!/bin/bash

# function that displays usage
display_usage() {
	echo -e "Usage: $0 --env [dev|test|prod]"
}

# check whether user had supplied -h or --help . If yes display usage
if [[ ( $# -eq 1 ) && ( $1 == "-h" ) ]]
  then
    display_usage
    exit 0
fi

if [[ ( $# -eq 1 ) && ( $1 == "--help" ) ]]
  then
    display_usage
    exit 0
fi

# check whether an argument is passed
if [ $# -lt 2 ]
  then
    echo "Argument '--env' is not supplied!"
    display_usage
    exit 1
fi

# check whether --env parameter is either dev, test or prod
if [[ ! (( $2 == "dev") || ( $2 == "test" ) || ( $2 == "prod" )) ]]
  then
    display_usage
    exit 0
fi

# now the real stuff
# setup common variables irrespective of branch
image_name="one-creator"
http_proxy="http://proxy.conexus.svc.local:3128"
https_proxy="http://proxy.conexus.svc.local:3128"
no_proxy="localhost,127.0.0.1,*svc,*.cluster.local,.npmjs.org,github.com,registry.npmjs.org"

# build with respective branch config
case "$2" in
   "dev")
    echo "Building Development Environment..."
    image_tag="dev"
    NODE_ENV="dev"
   ;;
   "test")
    echo "Building Test Environment..."
    image_tag="test"
    NODE_ENV="test"
   ;;
   "prod")
    echo "Building Production Environment..."
    image_tag="prod"
    NODE_ENV="production"
   ;;
esac

# probably checkout to specific branch

# finally build
docker build -t "$image_name":"$image_tag" \
   --build-arg NODE_ENV="$NODE_ENV" \
   --build-arg http_proxy="$http_proxy" \
   --build-arg https_proxy="$https_proxy" \
   --build-arg no_proxy="$no_proxy" .
