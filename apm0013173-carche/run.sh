#!/bin/sh
PATH_TO_APP="carche_project"

if [ "$CSS_ENV" != "LOCAL" ] 
then 
    echo ${CONFIG_FILE} | base64 -d > ${APP_DIR}/config/.conf.ini
    cat ${APP_DIR}/config/.conf.ini
fi

# run buildfiles and start server
python buildfiles.py
cd ${PATH_TO_APP}
./manage.py makemigrations
./manage.py migrate
./manage.py runserver 0.0.0.0:8000