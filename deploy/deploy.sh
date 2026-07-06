#!/usr/bin/env bash
# Deploy the verified immutable dist/ artifact to the production release directory.

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d%H%M%S)
SERVER=${SERVER:-root@154.217.241.238}
SITE_DIR=${SITE_DIR:-/var/www/pdftool.work}
HEALTH_ORIGIN=${HEALTH_ORIGIN:-https://pdftool.work}
RELEASE_DIR="$SITE_DIR/releases/$TIMESTAMP"
MANIFEST="dist/release-manifest.json"

for command in npm node git tar ssh sshpass curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

if [ -z "${SSH_PASS:-}" ]; then
  echo "SSH_PASS environment variable not set." >&2
  echo "Usage: SSH_PASS='your-password' bash deploy/deploy.sh" >&2
  exit 1
fi

if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  echo "Working tree must be clean before deployment." >&2
  exit 1
fi

echo "Building release $TIMESTAMP..."
npm ci --no-audit --no-fund
npm run build
npm run verify:release

if [ "${EMERGENCY_SKIP_TESTS:-0}" = "1" ]; then
  echo "WARNING: EMERGENCY_SKIP_TESTS=1; unit and browser gates were skipped." >&2
else
  npm run test:unit
  npm run test:browser
fi

if [ ! -f "$MANIFEST" ]; then
  echo "Missing $MANIFEST" >&2
  exit 1
fi

HEAD_COMMIT=$(git rev-parse HEAD)
EXPECTED_COMMIT=$(node -e "const m=require('./$MANIFEST'); process.stdout.write(m.gitCommit || '')")
if [ "$EXPECTED_COMMIT" != "$HEAD_COMMIT" ]; then
  echo "Manifest commit $EXPECTED_COMMIT does not match HEAD $HEAD_COMMIT." >&2
  exit 1
fi

EXPECTED_FILE_COUNT=$(node -e "const m=require('./$MANIFEST'); process.stdout.write(String(m.files.length + 1))")
CHECKSUM_FILE=$(mktemp)
cleanup() {
  rm -f "$CHECKSUM_FILE"
}
trap cleanup EXIT
node -e "const m=require('./$MANIFEST'); for (const f of m.fileDetails) console.log(f.sha256 + '  ' + f.path)" > "$CHECKSUM_FILE"

export SSHPASS="$SSH_PASS"
SSH=(sshpass -e ssh -o StrictHostKeyChecking=no "$SERVER")
previousRelease=$("${SSH[@]}" "readlink -f '$SITE_DIR/current' 2>/dev/null || true")

rollback() {
  if [ -n "$previousRelease" ]; then
    "${SSH[@]}" "set -eu; ln -sfn '$previousRelease' '$SITE_DIR/current.next'; mv -Tf '$SITE_DIR/current.next' '$SITE_DIR/current'; nginx -t; systemctl reload nginx"
    echo "Rolled back to $previousRelease" >&2
  fi
}

"${SSH[@]}" "mkdir -p '$RELEASE_DIR' && chmod 755 '$RELEASE_DIR'"

echo "Uploading verified dist/ artifact..."
tar -C dist -cf - . | "${SSH[@]}" "cd '$RELEASE_DIR' && tar xf -"

REMOTE_FILE_COUNT=$("${SSH[@]}" "find '$RELEASE_DIR' -type f | wc -l" | tr -d '[:space:]')
if [ "$REMOTE_FILE_COUNT" != "$EXPECTED_FILE_COUNT" ]; then
  echo "Remote artifact count mismatch: expected $EXPECTED_FILE_COUNT, found $REMOTE_FILE_COUNT." >&2
  exit 1
fi

"${SSH[@]}" "cd '$RELEASE_DIR' && sha256sum -c -" < "$CHECKSUM_FILE"
"${SSH[@]}" "printf '%s\n' '$EXPECTED_COMMIT' > '$RELEASE_DIR/.release-commit'"
REMOTE_COMMIT=$("${SSH[@]}" "cat '$RELEASE_DIR/.release-commit'")
if [ "$REMOTE_COMMIT" != "$EXPECTED_COMMIT" ]; then
  echo "Remote release commit marker mismatch." >&2
  exit 1
fi

activateCommand="set -eu
find '$RELEASE_DIR' -type d -exec chmod 755 {} \;
find '$RELEASE_DIR' -type f -exec chmod 644 {} \;
nginx -t
ln -sfn '$RELEASE_DIR' '$SITE_DIR/current.next'
mv -Tf '$SITE_DIR/current.next' '$SITE_DIR/current'
systemctl reload nginx"
if ! "${SSH[@]}" "$activateCommand"; then
  rollback
  echo "Remote activation failed." >&2
  exit 1
fi

echo "Activated $RELEASE_DIR"

if [ "${EMERGENCY_SKIP_HEALTH:-0}" = "1" ]; then
  echo "WARNING: EMERGENCY_SKIP_HEALTH=1; post-deploy smoke checks were skipped." >&2
  exit 0
fi

sleep 2
smokeChecks=(
  "/|text/html"
  "/en/|text/html"
  "/es/|text/html"
  "/pt-br/|text/html"
  "/ja/|text/html"
  "/id/|text/html"
  "/compress.html|text/html"
  "/en/compress-pdf.html|text/html"
  "/es/compress-pdf.html|text/html"
  "/pt-br/compress-pdf.html|text/html"
  "/ja/compress-pdf.html|text/html"
  "/id/compress-pdf.html|text/html"
  "/sitemap.xml|xml"
  "/robots.txt|text/plain"
  "/ads.txt|text/plain"
  "/assets/js/i18n.js|javascript"
  "/assets/vendor/pdfjs/pdf.worker.mjs|javascript"
  "/assets/vendor/pdfjs/cmaps/Adobe-GB1-UCS2.bcmap|octet-stream"
  "/assets/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf|font"
  "/assets/vendor/pdfjs/wasm/openjpeg.wasm|application/wasm"
)
smokeFailed=0
for check in "${smokeChecks[@]}"; do
  path=${check%%|*}
  expected=${check#*|}
  response=$(curl -sS -o /dev/null -w "%{http_code}|%{content_type}" "$HEALTH_ORIGIN$path" || true)
  status=${response%%|*}
  contentType=${response#*|}
  if [ "$status" != "200" ] || [[ ! "$contentType" =~ $expected ]]; then
    echo "Smoke failed: $path -> $response (expected 200 and $expected)" >&2
    smokeFailed=1
  else
    echo "Smoke OK: $path [$contentType]"
  fi
done

ACTIVE_COMMIT=$("${SSH[@]}" "cat '$SITE_DIR/current/.release-commit' 2>/dev/null || true")
if [ "$ACTIVE_COMMIT" != "$EXPECTED_COMMIT" ]; then
  echo "Active release commit marker mismatch." >&2
  smokeFailed=1
fi

if [ "$smokeFailed" -ne 0 ]; then
  rollback
  echo "Post-deploy smoke checks failed." >&2
  exit 1
fi

echo "Release smoke checks passed."
echo "Release: $TIMESTAMP"
echo "Commit: $EXPECTED_COMMIT"
