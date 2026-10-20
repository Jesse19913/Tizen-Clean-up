#!/bin/sh
# Packages src/ into dist/arn0-launcher.wgt (unsigned; Apps2Samsung signs it on install).
set -eu
cd "$(dirname "$0")/.."

[ -f src/icon.png ] || node scripts/make-icon.mjs
node scripts/build-marks.mjs

mkdir -p dist
rm -f dist/arn0-launcher.wgt
(cd src && zip -q -r -X ../dist/arn0-launcher.wgt . -x '*.DS_Store' -x '.*' -x 'img/marks/*')

echo "Built dist/arn0-launcher.wgt"
unzip -l dist/arn0-launcher.wgt
