#!/bin/sh

BUILD_DIR="$(pwd)"
source ./vendor/install_openssl.sh 3.0.13+quic
sudo updatedb
source ./vendor/install_libpq.sh
sudo updatedb
sudo ldconfig
cd $BUILD_DIR
