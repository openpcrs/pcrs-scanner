#!/bin/bash

INSTALL_LOCKFILE="gdal_install.lock"

# check a file to not run into a recursion
if [[ ! -e "$INSTALL_LOCKFILE" ]]; then
  touch "$INSTALL_LOCKFILE"
  # install gdal with specific options to use the host gdal library
  yarn add --pure-lockfile gdal-async --build-from-source --shared_gdal
  rm "$INSTALL_LOCKFILE"
fi
