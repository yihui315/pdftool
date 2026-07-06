#!/bin/bash
#
# V7.1 Deploy Script - 自动部署脚本
#
# 用法: bash deploy/deploy.sh
#

set -e

TIMESTAMP=$(date +%Y%m%d%H%M%S)
echo "🚀 V7.1 Deploy - $TIMESTAMP"

# SSH密码（通过环境变量传入）
if [ -z "$SSH_PASS" ]; then
  echo "❌ SSH_PASS environment variable not set"
  echo "   Usage: SSH_PASS='your-password' bash deploy/deploy.sh"
  exit 1
fi

SERVER="root@154.217.241.238"
SITE_DIR="/var/www/pdftool.work"
GIT_DIR="/root/.ssh"

# Step 1: Git add + commit
echo ""
echo "1️⃣ Git commit..."
git add .
git status --short > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "   Nothing to commit"
else
  git commit -m "auto: V7.1 SEO pages update ($TIMESTAMP)"
  echo "   ✅ Committed"
fi

# Step 2: Git push
echo ""
echo "2️⃣ Git push..."
git push origin main
echo "   ✅ Pushed to origin/main"

# Step 3: Server deploy via SSH
echo ""
echo "3️⃣ Server deploy..."

# 使用 sshpass 进行 SSH 密码认证
export SSHPASS="$SSH_PASS"

# 创建释放目录
RELEASE_DIR="$SITE_DIR/releases/$TIMESTAMP"
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER "
  mkdir -p $RELEASE_DIR
  chmod 755 $RELEASE_DIR
  echo '   ✅ Release dir created'
"

# 上传文件
echo ""
echo "4️⃣ Uploading files..."

# 上传所有HTML和配置文件
tar cf - *.html sitemap.xml robots.txt ads.txt 2>/dev/null | sshpass -e ssh -o StrictHostKeyChecking=no $SERVER "cd $RELEASE_DIR && tar xf -"
echo "   ✅ HTML + config uploaded"

# 上传目录
for dir in assets data seo-pages ai-system deploy; do
  if [ -d "$dir" ]; then
    tar cf - $dir | sshpass -e ssh -o StrictHostKeyChecking=no $SERVER "cd $RELEASE_DIR && tar xf -"
    echo "   ✅ $dir/ uploaded"
  fi
done

# Step 5: Fix permissions
echo ""
echo "5️⃣ Fixing permissions..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER "
  find $RELEASE_DIR -type d -exec chmod 755 {} \;
  find $RELEASE_DIR -type f -exec chmod 644 {} \;
  chown -R www-data:www-data $RELEASE_DIR
  echo '   ✅ Permissions fixed'
"

# Step 6: Activate release
echo ""
echo "6️⃣ Activating release..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER "
  ln -sfn $RELEASE_DIR $SITE_DIR/current.next
  mv -Tb $SITE_DIR/current.next $SITE_DIR/current
  echo '   ✅ Activated: current → $TIMESTAMP'
"

# Step 7: Reload nginx
echo ""
echo "7️⃣ Reloading nginx..."
sshpass -e ssh -o StrictHostKeyChecking=no $SERVER "systemctl reload nginx"
echo "   ✅ Nginx reloaded"

# Step 8: Verify
echo ""
echo "8️⃣ Verifying..."
sleep 2
for path in "/" "compress.html" "upload-ready.html" "sitemap.xml"; do
  status=$(curl -so /dev/null -w "%{http_code}" "https://pdftool.work/$path" 2>/dev/null || echo "ERR")
  echo "   $status $path"
done

echo ""
echo "🎉 V7.1 Deploy completed!"
echo "📦 Release: $TIMESTAMP"
echo "🌐 https://pdftool.work"
