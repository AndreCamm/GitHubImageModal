#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/Glance.xpi
zip -r -X dist/Glance.xpi \
  manifest.json \
  content.js \
  content.css \
  lib \
  icons \
  -x '*.DS_Store'
echo "Packed dist/Glance.xpi"
