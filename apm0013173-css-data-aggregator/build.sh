#!/bin/bash

docker build --progress=plain \
    --secret id=build_secrets,src=./build.env \
    -t aggregator:latest .