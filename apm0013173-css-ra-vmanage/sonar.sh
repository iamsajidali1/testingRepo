#!/bin/sh
set -xe

sonar-scanner \
  -Dsonar.projectKey=ATT-DP1_apm0013173-css-ra-vmanage_bd29b518-7779-4872-809e-09b666e80a6e \
  -Dsonar.sources=. \
  -Dsonar.att.motsid=29786 \
  -Dsonar.host.url=https://sonar.it.att.com \
  -Dsonar.token=REPLACE_WITH_ACTUAL_TOKEN \
  -Dsonar.att.view.type=prod \
  -Dsonar.exclusions=chart/**