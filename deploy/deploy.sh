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
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-health) SKIP_HEALTH=true; shift ;;
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
  npm run build
  echo "✅ 构建完成"
fi

# 要部署的文件
DEPLOY_FILES=(
  "index.html"
  "merge.html"
  "split.html"
  "manage.html"
  "compress.html"
  "pdf-to-jpg.html"
  "jpg-to-pdf.html"
  "about.html"
  "privacy.html"
  "sitemap.xml"
  "robots.txt"
  "ads.txt"
)

REQUIRED_FILES=(
  "${DEPLOY_FILES[@]}"
  "assets/css/tailwind.min.css"
  "assets/css/styles.css"
  "assets/vendor/pdf-lib.min.js"
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

# 上传文件
echo "   上传 HTML 和配置文件..."
scp "${SCP_ARGS[@]}" "${DEPLOY_FILES[@]}" "${TARGET}:${REMOTE_RELEASE}/"

echo "   上传 assets 目录..."
scp "${SCP_ARGS[@]}" -r assets "${TARGET}:${REMOTE_RELEASE}/"

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
