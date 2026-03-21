#!/bin/bash
set -e

# CleanCheck Deploy Script
# Builds the frontend and deploys to Strato cleancheck.e-findo.de

REMOTE_HOST="stu115279244@515469.ssh.w1.strato.hosting"
REMOTE_DIR="cleancheck"
LOCAL_DIST="frontend/dist"

echo "=== CleanCheck Deploy ==="

# 1. Build
echo "[1/4] Building frontend..."
cd "$(dirname "$0")/frontend"
npm run build
cd ..

# 2. Verify build output
echo "[2/4] Verifying build..."
if [ ! -f "$LOCAL_DIST/index.html" ]; then
  echo "ERROR: index.html not found in dist/"
  exit 1
fi

JS_COUNT=$(ls "$LOCAL_DIST/assets/"*.js 2>/dev/null | wc -l | tr -d ' ')
CSS_COUNT=$(ls "$LOCAL_DIST/assets/"*.css 2>/dev/null | wc -l | tr -d ' ')

if [ "$JS_COUNT" -eq 0 ]; then
  echo "ERROR: No JS files found in dist/assets/"
  exit 1
fi
if [ "$CSS_COUNT" -eq 0 ]; then
  echo "ERROR: No CSS files found in dist/assets/"
  exit 1
fi

echo "  Found: ${JS_COUNT} JS, ${CSS_COUNT} CSS files"
echo "  JS: $(ls "$LOCAL_DIST/assets/"*.js)"
echo "  CSS: $(ls "$LOCAL_DIST/assets/"*.css)"

# 3. Add .htaccess
cat > "$LOCAL_DIST/.htaccess" << 'HTACCESS'
RewriteEngine On
RewriteBase /

RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]

<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "index\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>

AddType application/javascript .js
AddType text/css .css
HTACCESS

# 4. Deploy via SFTP
echo "[3/4] Deploying to $REMOTE_HOST..."
export SSHPASS='kL2qP3***95!'

# Use absolute paths to avoid lcd issues
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ABS_DIST="$SCRIPT_DIR/$LOCAL_DIST"

# Clean remote assets first, then upload everything
sshpass -e sftp -oBatchMode=no -oStrictHostKeyChecking=no "$REMOTE_HOST" << SFTP
cd $REMOTE_DIR
cd assets
$(for f in $(ls "$LOCAL_DIST/assets/" 2>/dev/null); do echo "rm $f"; done)
lcd $ABS_DIST/assets
put *
cd ..
lcd $ABS_DIST
put .htaccess
put index.html
put favicon.svg
put icons.svg
put manifest.webmanifest
put registerSW.js
put sw.js
$(ls "$LOCAL_DIST"/workbox-*.js 2>/dev/null | xargs -I{} basename {} | while read f; do echo "put $f"; done)
quit
SFTP

# 5. Verify deployment
echo "[4/4] Verifying deployment..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://cleancheck.e-findo.de/")
if [ "$HTTP_CODE" != "200" ]; then
  echo "WARNING: Site returned HTTP $HTTP_CODE"
else
  echo "  Site returns HTTP 200"
fi

CSS_CHECK=$(curl -s "https://cleancheck.e-findo.de/assets/$(ls "$LOCAL_DIST/assets/"*.css | xargs basename)" | head -c 20)
if [[ "$CSS_CHECK" == *"tailwind"* ]]; then
  echo "  CSS verified OK"
else
  echo "  ERROR: CSS not serving correctly!"
  echo "  Content: $CSS_CHECK"
  exit 1
fi

echo ""
echo "=== Deploy complete! ==="
echo "https://cleancheck.e-findo.de"
