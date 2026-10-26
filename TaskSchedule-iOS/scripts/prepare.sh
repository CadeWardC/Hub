#!/usr/bin/env bash
# Copies the Task & Schedule web app into build/web for the app bundle.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
web="$here/../TaskSchedule"
rm -rf "$here/build/web"
mkdir -p "$here/build/web"
cp "$web"/index.html "$web"/styles.css "$web"/app.js "$web"/protocols.js "$web"/sync.js "$web"/sync-config.js \
   "$web"/icon.svg "$web"/app-icon-*.png "$web"/manifest.webmanifest "$here/build/web/"
echo "Prepared $(du -sh "$here/build/web" | cut -f1) of web files"
