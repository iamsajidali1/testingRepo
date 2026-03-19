#!/usr/bin/env sh
set -xe

if [ "$CSS_ENV" != "local" ]
then
    echo ${CONFIG_FILE} | base64 -d > api/config/sequelize/config.json
    echo ${MCAP_KEY_CERT} | base64 -d > api/controllers/certs/mcap.pem
    echo ${MCAP_CLIENT_CERT} | base64 -d > api/controllers/certs/client.cert.x509
fi

# run migrations
cd api

echo '{
    "'${CSS_ENV}'": {
        "username": "'${ONE_MYSQL_USERNAME}'",
        "password": "'${ONE_MYSQL_PASSWORD}'",
        "database": "'${ONE_MYSQL_NAME}'",
        "host": "'${ONE_MYSQL_HOST}'",
        "port": '${ONE_MYSQL_PORT}',
        "dialect": "mysql",
        "dialectOptions": { "ssl": { "rejectUnauthorized": true } },
        "seederStorage": "sequelize",
        "pool": { "max": 20, "min": 0, "acquire": 60000, "idle": 60000 }
    }
}' > ./config/sequelize/config.json

if [ "$CSS_ENV" = "local" ]
then
    npx sequelize db:migrate  --debug --env dev
    npx sequelize db:seed:all --debug --env dev
else
    npx sequelize db:migrate  --debug --env ${CSS_ENV}
    npx sequelize db:seed:all --debug --env ${CSS_ENV}
fi

# run express application
cd ..
node server.js
