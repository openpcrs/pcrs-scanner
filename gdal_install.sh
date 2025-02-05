#!/bin/bash

INSTALL_LOCKFILE="gdal_install.lock"

# check a file to not run into a recursion
if [[ ! -e "$INSTALL_LOCKFILE" ]]; then
  touch "$INSTALL_LOCKFILE"
  # install gdal with specific options to use the host gdal library
  rm -rf node_modules/gdal-async
  npm_config_build_from_source=true npm_config_shared_gdal=true yarn add gdal-async
  rm "$INSTALL_LOCKFILE"
fi
