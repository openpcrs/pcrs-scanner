#!/bin/bash

set -Eeuox pipefail

INSTALL_LOCKFILE="gdal_install.lock"

cd "$BUILD_DIR"
gdal-config --version
# check a file to not run into a recursion
if [[ ! -e "$INSTALL_LOCKFILE" ]]; then
  touch "$INSTALL_LOCKFILE"
  # install gdal with specific options to use the host gdal library
  # need to remove the previously installed version for it to work correctly, but yarn remove would change the lock file
  rm -rf node_modules/gdal-async
  # install gdal-async with special flags
  npm_config_build_from_source=true npm_config_shared_gdal=true yarn add gdal-async
  rm "$INSTALL_LOCKFILE"
fi
