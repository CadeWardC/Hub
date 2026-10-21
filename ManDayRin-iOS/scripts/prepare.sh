#!/usr/bin/env bash
# Copies the ManDayRin web app into build/web and writes build/course.json (themes + word lists) for Swift.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
web="$here/../ManDayRin"
rm -rf "$here/build/web"
mkdir -p "$here/build/web"
cp "$web"/index.html "$web"/app.js "$web"/weeks.js "$web"/styles.css "$web"/icon.svg "$web"/icon-192.png "$here/build/web/"
cp -R "$web/audio" "$here/build/web/audio"
node -e '
  const fs = require("fs"), vm = require("vm");
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(process.argv[1], "utf8"), sandbox);
  const course = sandbox.window.MANDAYRIN_COURSE;
  const weeks = {};
  for (const [week, data] of Object.entries(course.weeks)) weeks[week] = data.words.map(([zh, py, en]) => [zh, py, en]);
  fs.writeFileSync(process.argv[2], JSON.stringify({ themes: course.themes, weeks }));
' "$web/weeks.js" "$here/build/course.json"
echo "Prepared $(du -sh "$here/build/web" | cut -f1) of web files and course.json"
