#!/bin/bash
# pdftool.work 部署脚本 (Mac/Linux)
# 用法: ./deploy.sh

set -eu

# 配置
SERVER="154.217.241.238"
USER="root"
REMOTE_ROOT="/var/www/pdftool.work"
HEALTH_URL="https://pdftool.work/"
IDENTITY_FILE=""

# 解析参数
SKIP_BUILD=false
SKIP_HEALTH=false
EMERGENCY_SKIP_TESTS=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-health) SKIP_HEALTH=true; shift ;;
    --emergency-skip-tests) EMERGENCY_SKIP_TESTS=true; shift ;;
    --identity) IDENTITY_FILE="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📦 pdftool.work 部署脚本"
echo "   项目目录: $PROJECT_ROOT"
echo "   服务器: $SERVER"

# 构建
if [[ "$SKIP_BUILD" == "false" ]]; then
  echo ""
  echo "🔨 运行 npm build..."
  npm ci --no-audit --no-fund
  npm run build
  echo "✅ 构建完成"
fi

if [[ "$EMERGENCY_SKIP_TESTS" == "true" ]]; then
  echo "⚠️  紧急模式：已跳过单元测试和浏览器测试"
else
  npm run test:unit
  PLAYWRIGHT_USE_SYSTEM_CHROME=1 npm run test:browser
fi

# 要部署的文件
DEPLOY_FILES=(
  "index.html"
  "upload-ready.html"
  "merge.html"
  "split.html"
  "manage.html"
  "compress.html"
  "pdf-to-jpg.html"
  "jpg-to-pdf.html"
  "pdf-rotate.html"
  "pdf-unlock.html"
  "about.html"
  "privacy.html"
  "blog.html"
  "services.html"
  "sitemap.xml"
  "robots.txt"
  "ads.txt"
  "compress-pdf-to-200kb.html"
  "compress-pdf-to-500kb.html"
  "compress-pdf-to-1mb.html"
  "compress-pdf-to-300kb.html"
  "compress-pdf-to-800kb.html"
  "compress-pdf-to-2mb.html"
  "resize-pdf-for-upload.html"
  "pdf-too-large-to-upload.html"
  "compress-scanned-pdf.html"
  "compress-pdf-for-application.html"
  "compress-pdf-for-exam-registration.html"
  "compress-pdf-for-visa.html"
  "compress-pdf-for-enterprise.html"
  "compress-pdf-id-card.html"
  "compress-pdf-pay-slip.html"
  "pdf-contract-too-large.html"
  "pdf-thesis-large.html"
  "pdf-receipt-too-large.html"
  "pdf-tutorial-for-students.html"
  "compress-pdf-for-pay-slip.html"
  "compress-pdf-for-thesis.html"
  "compress-pdf-for-contract.html"
  "compress-pdf-for-certificate.html"
  "compress-scanned-pdf-to-1mb.html"
  "compress-pdf-for-receipt.html"
  "pdf-for-exam-registration-too-large.html"
  "pdf-too-large-upload-failed.html"
  "how-to-compress-pdf-under-200kb.html"
  "pdf-file-too-big-for-email.html"
  "pdf-size-reduce-online.html"
  "pdf-compress-without-quality-loss.html"
  "visa-pdf-too-large.html"
  "school-application-pdf-compress.html"
  "job-application-pdf-size.html"
  "blog-merge-pdf.html"
  "blog-pdf-tips.html"
  "blog-jpg-to-pdf.html"
  "blog-iphone-merge-pdf.html"
  "blog-android-compress-pdf.html"
  "blog-mac-compress-pdf.html"
  "blog-windows-compress-pdf.html"
  "blog-extract-pdf-pages.html"
  "blog-unlock-pdf.html"
  "blog-phone-to-pdf.html"
  "blog-pdf-page-size.html"
  "pdf-tools.html"
)

REQUIRED_FILES=(
  "${DEPLOY_FILES[@]}"
  "assets/css/tailwind.min.css"
  "assets/css/styles.css"
  "assets/js/upload-ready.js"
  "assets/js/upload-ready-worker.mjs"
  "assets/js/upload-ready-processing.mjs"
  "assets/js/pdf-preview.js"
  "assets/js/pdf-worker-entry.mjs"
  "assets/vendor/pdf-lib.min.js"
  "assets/vendor/pdf-lib.esm.min.js"
  "assets/vendor/pdfjs/pdf.mjs"
  "assets/vendor/pdfjs/pdf.worker.mjs"
  "assets/vendor/pdfjs/cmaps/Adobe-GB1-UCS2.bcmap"
  "assets/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf"
  "assets/vendor/pdfjs/wasm/openjpeg.wasm"
  "assets/vendor/pdfjs/iccs/CGATS001Compat-v2-micro.icc"
)

# 检查文件
echo ""
echo "🔍 检查文件..."
for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "❌ 缺少文件: $file"
    exit 1
  fi
done
echo "✅ 所有文件就绪"

# 检查 AdSense 占位符
if grep -l "XXXXXXXXXXXXXXXX" *.html ads.txt 2>/dev/null; then
  echo "⚠️  警告: 仍有 AdSense 占位 ID 未替换"
fi

# SSH 参数
SSH_ARGS=("-o" "StrictHostKeyChecking=no")
SCP_ARGS=("-o" "StrictHostKeyChecking=no")
if [[ -n "$IDENTITY_FILE" ]]; then
  SSH_ARGS+=("-i" "$IDENTITY_FILE")
  SCP_ARGS+=("-i" "$IDENTITY_FILE")
fi

TARGET="${USER}@${SERVER}"
RELEASE_NAME=$(date +"%Y%m%d%H%M%S")
REMOTE_RELEASE="${REMOTE_ROOT}/releases/${RELEASE_NAME}"

echo ""
echo "🚀 上传到服务器: $REMOTE_RELEASE"

# 创建远程目录
ssh "${SSH_ARGS[@]}" "$TARGET" "mkdir -p '$REMOTE_RELEASE'"

# 上传文件 - 使用tar方式避免SCP大文件列表问题
echo "   上传 HTML 和配置文件..."
tar cf - "${DEPLOY_FILES[@]}" | ssh "${SSH_ARGS[@]}" "$TARGET" "cd '$REMOTE_RELEASE' && tar xf -"

echo "   上传 assets 目录..."
tar cf - assets | ssh "${SSH_ARGS[@]}" "$TARGET" "cd '$REMOTE_RELEASE' && tar xf -"

# 激活发布
echo ""
echo "⚙️  激活发布..."
ACTIVATE_CMD="
set -eu
find '$REMOTE_RELEASE' -type d -exec chmod 755 {} \;
find '$REMOTE_RELEASE' -type f -exec chmod 644 {} \;
chown -R www-data:www-data '$REMOTE_RELEASE'
ln -sfn '$REMOTE_RELEASE' '$REMOTE_ROOT/current.next'
mv -Tf '$REMOTE_ROOT/current.next' '$REMOTE_ROOT/current'
nginx -t
systemctl reload nginx
echo '✅ 激活完成'
"
ssh "${SSH_ARGS[@]}" "$TARGET" "$ACTIVATE_CMD"

echo ""
echo "✅ 已发布版本: $RELEASE_NAME"
echo "   远程目录: $REMOTE_RELEASE"

# 健康检查
if [[ "$SKIP_HEALTH" == "false" ]]; then
  echo ""
  echo "🏥 健康检查..."
  sleep 2
  HTTP_CODE=$(curl -so /dev/null -w "%{http_code}" "$HEALTH_URL")
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "✅ 健康检查通过: HTTP $HTTP_CODE $HEALTH_URL"
  else
    echo "⚠️  健康检查: HTTP $HTTP_CODE (可能需要等几秒)"
  fi
fi

echo ""
echo "🎉 部署完成!"
