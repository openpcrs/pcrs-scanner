# pcrs-scanner

A simple but efficient remote spatial data scanner

## Features

### Key features

- Scan remote storages
- Scan remote data files
- Compute metadata
- HTTP proxy
- Downloading with basic authentication
- Detect changes

### Supported storages

- HTTP / Directory crawling
- FTP
- SFTP

### Supported data formats

- JPEG 2000
- GeoTIFF

## Prerequisites

- Node.js 20 LTS and above
- Yarn Package manager (but can be easily adapted to npm)
- MongoDB 4.0 and above
- libgdal-dev

## Installation

If you encounter errors with processing .tiff files using ZSTD compression, check that `gdal-async` is installed with the `--build-from-source` and `--shared-gdal` npm flags. With yarn those would be the `npm_config_build_from_source` and `npm_config_shared_gdal` environment variables that are configured in `gdal_install.sh`.

If you encounter errors with the `proj.db` file, this is likely because the `libgdal-dev` dependency is not located at the usual path. Run `find / -name proj.db 2>/dev/null` and add an environment variable called `PROJ_LIB` with the path to the directory containing `proj.db`.

## Development

## API

## License

MIT

## Maintainer

- Jérôme Desboeufs (@jdesboeufs)

## Funding

- Agence Nationale pour la Cohésion des Territoires
