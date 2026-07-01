#!/bin/bash
# replace-affiliate.sh - 替换联盟链接占位符
# 用法: ./replace-affiliate.sh [adobe_url] [foxit_url] [nitro_url]

ADOBE_URL="${1:-ADOBE_AFFILIATE_URL}"
FOXIT_URL="${2:-FOXIT_AFFILIATE_URL}"
NITRO_URL="${3:-NITRO_AFFILIATE_URL}"

echo "Replacing affiliate placeholders..."
echo "  Adobe: $ADOBE_URL"
echo "  Foxit: $FOXIT_URL"
echo "  Nitro: $NITRO_URL"

# 替换所有 HTML 文件中的占位符
find . -name "*.html" -exec sed -i.bak \
  -e "s|ADOBE_AFFILIATE_URL|${ADOBE_URL}|g" \
  -e "s|FOXIT_AFFILIATE_URL|${FOXIT_URL}|g" \
  -e "s|NITRO_AFFILIATE_URL|${NITRO_URL}|g" \
  {} \;

# 移除备份文件
find . -name "*.html.bak" -delete

echo "Done! Affiliate links replaced."
