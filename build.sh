#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/GitHubImageModal.xpi
zip -r -X dist/GitHubImageModal.xpi \
  manifest.json \
  content.js \
  content.css \
  lib \
  icons \
  -x '*.DS_Store'
echo "Packed dist/GitHubImageModal.xpi"
