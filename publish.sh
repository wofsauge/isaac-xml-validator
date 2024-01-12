#!/bin/bash
set -e # Exit on any errors


# This script requires the pip packages: setuptools, twine, build


# Get the directory of this script:
# https://stackoverflow.com/questions/59895/getting-the-source-directory-of-a-bash-script-from-within
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Subroutines
function pause() {
   read -p "$*"
}

# Read the username and password.
source .env
if [[ -z $PYPI_USERNAME ]]; then
  echo "Error: PYPI_USERNAME is not set. Copy \".env_template\" to \".env\" and fill in the values."
  exit 1
fi
if [[ -z $PYPI_PASSWORD ]]; then
  echo "Error: PYPI_PASSWORD is not set. Copy \".env_template\" to \".env\" and fill in the values."
  exit 1
fi

# Build Pypi package
py -m pip install --upgrade pip
py -m pip install build twine

py -m build

pause "Build finished. Press any key to continue uploading..."

py -m twine upload dist/* -u "$PYPI_USERNAME" -p "$PYPI_PASSWORD" --skip-existing

pause "Press enter to continue..."
