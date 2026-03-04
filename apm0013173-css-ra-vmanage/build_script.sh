#!/bin/sh
set -xe

# for MySQL
apt install --yes --no-install-recommends gcc

# install Python packages
python3 -m pip install --no-input --upgrade \
    --trusted-host pypi.org --trusted-host files.pythonhosted.org \
    --requirement compile-requirements.txt

apt remove --yes gcc
apt autoremove --yes
