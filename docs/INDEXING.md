# pdftool.work SEO 索引指南

## 快速提交清单（每次发布新页面后执行）

### Step 1: 提交 sitemap 到 Google Search Console
1. 打开 https://search.google.com/search-console/sitemaps
2. 输入: `https://pdftool.work/sitemap.xml`
3. 点击"提交"

### Step 2: 请求核心页面索引
对以下页面逐一执行 URL Inspection → 请求索引：
```
https://pdftool.work/
https://pdftool.work/blog.html
https://pdftool.work/services.html
https://pdftool.work/upload-ready.html
https://pdftool.work/compress.html
https://pdftool.work/compress-pdf-to-200kb.html
https://pdftool.work/compress-pdf-to-500kb.html
https://pdftool.work/compress-pdf-to-1mb.html
```

### Step 3: 提交新增高意图页面
每次新增 SEO 页面后：
1. 确认 sitemap.xml 已包含该 URL
2. 在 Search Console → URL Inspection 输入新页面 URL
3. 点击"请求索引"

---

## 页面优先级与抓取频率

| 页面 | 优先级 | 建议抓取频率 |
|------|--------|-------------|
| / (首页) | 1.0 | 每天 |
| /upload-ready.html | 0.95 | 每周 |
| /compress.html | 0.9 | 每周 |
| /merge.html, /split.html, /manage.html | 0.9 | 每月 |
| /compress-pdf-to-*.html | 0.9 | 每月 |
| /blog.html | 0.8 | 每周 |
| /blog-*.html | 0.7 | 每月 |
| /services.html | 0.8 | 每月 |
| /about.html, /privacy.html | 0.5-0.6 | 每年 |

---

## 验证页面可索引性

### 检查 noindex
```bash
curl -s https://pdftool.work/PAGE.html | grep -i robots
```
确保没有 `<meta name="robots" content="noindex">`

### 检查 canonical
确保每个页面有 `<link rel="canonical" href="https://pdftool.work/PAGE.html">`

---

## IndexNow 快速提交（Bing / Yandex）

### 生成 IndexNow Key
```bash
# 生成密钥文件
openssl rand -hex 16
# 例: 3fe5d541afb24e5688345ac3d4c54b2e
```

### 创建密钥文件（部署到服务器）
```bash
# 在 /var/www/pdftool.work/current/ 下创建
echo "3fe5d541afb24e5688345ac3d4c54b2e" > bingwp_verif_4f70b.txt
```

### 提交 URL 到 IndexNow
```bash
curl -X POST "https://indexnow.org/urlcount" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://pdftool.work/new-page.html",
    "key": "3fe5d541afb24e5688345ac3d4c54b2e",
    "keyLocation": "https://pdftool.work/bingwp_verif_4f70b.txt"
  }'
```

### 批量提交 sitemap 到 IndexNow
```bash
# 使用 Python 脚本
python3 << 'EOF'
import urllib.request, json, re

SITEMAP = "https://pdftool.work/sitemap.xml"
KEY = "YOUR_INDEXNOW_KEY"
KEY_LOC = "https://pdftool.work/bingwp_verif_4f70b.txt"

# 从 sitemap 提取 URL
sitemap = urllib.request.urlopen(SITEMAP).read().decode()
urls = re.findall(r'<loc>(.*?)</loc>', sitemap)

for url in urls[:10]:  # 每次最多 10 个
    payload = json.dumps({
        "url": url,
        "key": KEY,
        "keyLocation": KEY_LOC
    }).encode()
    req = urllib.request.Request(
        "https://indexnow.org/urlcount",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        r = urllib.request.urlopen(req, timeout=10)
        print(f"OK: {url}")
    except Exception as e:
        print(f"FAIL: {url} -> {e}")
EOF
```

---

## Search Console 核心指标

### 目标
- **收录**: 30天内 20+ 页面被 Google 收录
- **展现**: 90天内出现目标关键词（前100名）
- **点击**: 90天内自然点击 > 100/月

### 重点监控关键词
- PDF 压缩
- PDF 合并
- PDF 分割
- PDF 压缩到 200KB
- PDF 压缩到 500KB
- 材料上传助手
- JPG 转 PDF
- PDF 旋转

---

## 常见问题

### Q: sitemap 提交后多久能看到结果？
A: 通常 1-7 天。可以在 Search Console 的"页面"标签查看抓取状态。

### Q: 有页面显示"已发现但尚未编入索引"？
A: 点击该 URL 查看原因。常见原因：1) noindex 标签；2) robots.txt 阻止；3) 页面质量不足。

### Q: robots.txt 需要更新吗？
A: 当前配置允许所有合法爬虫，只需要确保 sitemap 声明正确即可。

### Q: 可以强制 Google 收录某个页面吗？
A: 只能通过 URL Inspection 请求抓取，最终是否收录由 Google 算法决定。
