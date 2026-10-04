#!/usr/bin/env bash
# Build + verify a static export for app.custoray.com.
# Then upload the ENTIRE out/ directory to the web root in one sync.
#
# Why chunk/CSS 404s happen on new laptops:
#   HTML from build A is uploaded, but out/_next from build B is incomplete/missing.
#   New devices fetch that HTML and request hashes that are not on the server.
#
# Correct deploy (cPanel / FTP / rsync):
#   1) npm run build
#   2) Delete remote _next/ (or empty the app web root)
#   3) Upload ALL of out/ (html + _next + assets + .htaccess) before opening the site
#   4) Hard refresh once

set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

echo
echo "Build verified. Upload the entire out/ folder to the app web root."
echo "Do not skip out/_next/static/css or out/_next/static/chunks."
