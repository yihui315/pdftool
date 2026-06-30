# pdftool.work

pdftool.work 是一个纯静态、中文、全客户端处理的在线 PDF 工具站。站点使用 Tailwind CSS 和 pdf-lib，PDF 文件只在用户浏览器中读取和处理，不上传到本站服务器。

## 页面与功能

- index.html：首页、工具导航、优势说明和 FAQ。
- upload-ready.html：将单个 PDF 压到 200KB、500KB、1MB 或自定义上限，验证实际大小并在需要时逐页确认清晰度。
- merge.html：多文件 PDF 合并、排序、进度和下载。
- split.html：按页码范围或逐页分割 PDF。
- manage.html：删除、旋转和拖拽排序 PDF 页面。
- compress.html：安全的 PDF 结构优化，不主动降低图片清晰度。
- about.html：产品定位与运营说明。
- privacy.html：文件本地处理、Cookie、广告和日志政策。
- sitemap.xml、robots.txt：搜索引擎抓取入口。
- ads.txt：AdSense 授权销售商占位文件。

## 推荐目录结构

~~~text
pdftool.work/
├─ .github/
│  └─ workflows/
│     └─ test.yml
├─ index.html
├─ upload-ready.html
├─ merge.html
├─ split.html
├─ manage.html
├─ compress.html
├─ about.html
├─ privacy.html
├─ sitemap.xml
├─ robots.txt
├─ ads.txt
├─ assets/
│  ├─ css/
│  │  ├─ tailwind.min.css
│  │  └─ styles.css
│  ├─ js/
│  │  ├─ site.js
│  │  ├─ merge.js
│  │  ├─ split.js
│  │  ├─ manage.js
│  │  ├─ compress.js
│  │  ├─ upload-ready.js
│  │  ├─ upload-ready-worker.mjs
│  │  └─ pdf-preview.js
│  └─ vendor/
│     ├─ pdf-lib.min.js
│     ├─ pdf-lib.esm.min.js
│     └─ pdfjs/
├─ src/
│  └─ tailwind.css
├─ scripts/
│  └─ copy-vendor.mjs
├─ deploy/
│  ├─ deploy.ps1
│  ├─ preflight.ps1
│  └─ nginx/
│     └─ pdftool.work
├─ tests/
│  ├─ helpers/
│  │  └─ page.js
│  ├─ pdf-tools.test.js
│  └─ site.test.js
├─ CHANGELOG.md
├─ CLAUDE.md
├─ package.json
├─ package-lock.json
├─ TESTING.md
├─ TODOS.md
├─ VERSION
├─ tailwind.config.js
└─ vitest.config.js
~~~

服务器采用版本目录和 current 软链接：

~~~text
/var/www/pdftool.work/
├─ current -> /var/www/pdftool.work/releases/20260629153000
└─ releases/
   ├─ 20260629153000/
   └─ 其他历史版本/
~~~

Nginx 配置文件最终路径为：

~~~text
/etc/nginx/sites-available/pdftool.work
~~~

## 本地开发

### 环境要求

- Node.js 24（CI 使用的版本）
- npm
- Python 3，用于启动简单静态服务器

### 首次安装和构建

~~~powershell
npm ci
npm run build
npm test
~~~

npm run build 会执行两件事：

1. 扫描所有 HTML 和 assets/js 下的脚本，生成压缩后的 assets/css/tailwind.min.css。
2. 复制锁定的 pdf-lib 1.17.1 与 pdfjs-dist 6.1.200，包括 PDF.js 模块、Worker、CMap、标准字体、WASM 解码器和 ICC 配置。
3. 验证发布页面、模块和所有 PDF.js 支持目录存在且非空。

`npm test` 会先运行 Vitest 单元测试，再在 Chromium 与 Microsoft Edge 中运行真实 Worker、Canvas、隐私隔离、缩略图和完整工具流程。测试夹具、分层与编写约定见 [TESTING.md](TESTING.md)。

### 启动本地服务器

~~~powershell
npm run serve
~~~

浏览器访问 http://localhost:8080/。修改 Tailwind 类名时可另开终端运行：

~~~powershell
npm run watch:css
~~~

不要直接双击 file:// 页面做最终测试。HTTP 服务器更接近生产环境，也能更准确地暴露资源路径问题。

## 部署到 Ubuntu VPS

服务器地址：154.217.241.238

生产域名：https://pdftool.work

### 0. 运行上线预检

在本地项目根目录执行：

~~~powershell
powershell -ExecutionPolicy Bypass -File .\deploy\preflight.ps1
~~~

预检会检查生产静态文件、根域与 www 的 A 记录，以及 VPS 的 22、80、443 端口。它还会发送只读 Host 请求，判断 pdftool.work 的 Nginx 虚拟主机是否已经安装，不会修改本地或远程配置。

只有 `PREFLIGHT_OK` 表示必需条件已满足。`Nginx host route` 是提示项，可在首次安装站点配置前显示失败。

### 1. 配置 DNS

在域名服务商添加：

| 类型 | 主机记录 | 值 |
| --- | --- | --- |
| A | @ | 154.217.241.238 |
| A | www | 154.217.241.238 |

如果存在指向其他服务器的 AAAA 记录，请更新或删除。申请证书前，确认两个域名都已经解析到该 VPS。

Windows 检查命令：

~~~powershell
Resolve-DnsName pdftool.work
Resolve-DnsName www.pdftool.work
~~~

### 2. 初始化服务器

~~~bash
ssh root@154.217.241.238
sudo apt update
sudo apt install -y nginx snapd
sudo mkdir -p /var/www/pdftool.work/releases
sudo systemctl enable --now nginx
~~~

如果服务器启用了 UFW，再放行 SSH、HTTP 和 HTTPS：

~~~bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
~~~

不要在未确认 SSH 已放行时直接启用 UFW，以免锁住远程连接。

### 3. 安装 Nginx 站点配置

在本地项目根目录运行：

~~~powershell
scp .\deploy\nginx\pdftool.work root@154.217.241.238:/etc/nginx/sites-available/pdftool.work
ssh root@154.217.241.238 "ln -sfn /etc/nginx/sites-available/pdftool.work /etc/nginx/sites-enabled/pdftool.work && nginx -t && systemctl reload nginx"
~~~

配置包含：

- www 到主域的 301 跳转
- 静态文件 404 处理，不错误回退到首页
- gzip 压缩
- 7 天静态资源缓存
- HTML、robots.txt、sitemap.xml 和 ads.txt 禁止长期缓存
- nosniff、SAMEORIGIN、Referrer-Policy 和 Permissions-Policy 安全响应头

首次部署前 current 目录尚不存在时，Nginx 会暂时返回 404，属于正常现象。

### 4. 从 Windows 发布

部署脚本会先执行 npm ci、生产构建、单元测试和 Chromium/Edge 浏览器测试，再上传新版本并原子切换 current 软链接。激活后会检查页面、模块、Worker、CMap、字体和 WASM；失败会自动恢复上一个版本：

~~~powershell
powershell -ExecutionPolicy Bypass -File .\deploy\deploy.ps1 -HealthUrl "http://pdftool.work/"
~~~

使用 SSH 私钥：

~~~powershell
powershell -ExecutionPolicy Bypass -File .\deploy\deploy.ps1 -IdentityFile "$HOME\.ssh\id_ed25519" -HealthUrl "http://pdftool.work/"
~~~

SSL 配置完成后，后续直接运行：

~~~powershell
powershell -ExecutionPolicy Bypass -File .\deploy\deploy.ps1
~~~

可用参数：

- -User：SSH 用户，默认 root。
- -Server：服务器 IP，默认 154.217.241.238。
- -IdentityFile：SSH 私钥路径。
- -SkipBuild：只跳过 npm ci 与生产构建，不能跳过测试。
- -EmergencySkipTests：紧急跳过测试，会打印醒目警告，不应作为常规发布参数。
- -SkipHealthCheck：紧急跳过发布后完整烟测，不应作为常规发布参数。

脚本不会上传 node_modules、src、scripts、package.json 或部署配置，只上传浏览器运行所需的静态成品。

## SSL 证书

先保证 HTTP 页面可以通过公网访问，且 80、443 端口已放行。Certbot 官方当前推荐通过 Snap 安装：[Certbot Nginx 官方说明](https://certbot.eff.org/instructions?os=ubuntubionic&tab=standard&ws=nginx)。

在 VPS 执行：

~~~bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot

sudo certbot --nginx \
  -d pdftool.work \
  -d www.pdftool.work \
  --redirect \
  --agree-tos \
  --no-eff-email \
  --email YOUR_REAL_EMAIL

sudo certbot renew --dry-run
~~~

必须把 YOUR_REAL_EMAIL 替换为真实可收件邮箱。如果 www 尚未解析到服务器，应先补 DNS，不要直接申请包含 www 的证书。

验证：

~~~bash
curl -I https://pdftool.work/
curl -I https://www.pdftool.work/
systemctl list-timers | grep certbot
~~~

www 应最终跳转到 https://pdftool.work/。

## 回滚

部署脚本保留历史 releases。查看版本：

~~~bash
ls -1 /var/www/pdftool.work/releases
readlink -f /var/www/pdftool.work/current
~~~

切换到指定历史版本：

~~~bash
sudo ln -sfn /var/www/pdftool.work/releases/目标版本 /var/www/pdftool.work/current.next
sudo mv -Tf /var/www/pdftool.work/current.next /var/www/pdftool.work/current
sudo nginx -t
sudo systemctl reload nginx
~~~

## AdSense 上线注意事项

当前代码使用 ca-pub-XXXXXXXXXXXXXXXX 和示例广告位 ID。占位状态下广告容器会自动隐藏，不影响页面布局。

审核通过后按以下顺序处理：

1. 在八个 HTML 页面的 head 中，把 ca-pub-XXXXXXXXXXXXXXXX 替换为真实 Publisher ID，并将 AdSense async script 移出 HTML 注释。
2. 把每个 data-ad-slot 的示例数字替换为 AdSense 后台创建的真实 responsive ad unit ID。
3. 编辑 ads.txt，删除授权记录前的 #，并替换真实 Publisher ID：

   ~~~text
   google.com, pub-你的真实ID, DIRECT, f08c47fec0942fa0
   ~~~
4. 确认 https://pdftool.work/ads.txt 返回 HTTP 200。
5. 创建或转发 privacy@pdftool.work，确保隐私页面中的联系方式真实可用。
6. 根据访客地区配置 Google 认证的同意管理平台。面向欧洲经济区、英国和瑞士展示广告时尤其需要检查 CMP 要求。
7. 不要自行点击广告，不要诱导点击，也不要把广告伪装成下载按钮或工具操作按钮。

广告位已经在代码中用注释标出：

- 顶部横幅
- 工具操作区下方
- 处理结果区域

styles.css 和 site.js 中的 XXXXXXXXXXXXXXXX 仅用于识别未配置的占位广告，不需要修改。

## 上线检查

~~~powershell
npm ci
npm run build
~~~

上线后逐项确认：

- 首页、材料上传助手和 6 个原有子页面返回 HTTP 200。
- PDF.js 模块、Worker、CMap、字体、WASM 和 ICC 代表资源返回正确 MIME 类型。
- www 正确 301 到主域。
- sitemap.xml、robots.txt 和 ads.txt 可访问。
- 浏览器控制台没有资源 404 或 JavaScript 错误。
- 四个 PDF 工具均可生成并下载结果。
- 手机宽度下没有横向滚动。
- privacy@pdftool.work 可以正常收件。
- AdSense 真实 ID 启用后，广告容器不再隐藏。

## 隐私与运维说明

PDF 内容不会经过 Nginx 上传。Nginx 只提供 HTML、CSS、JavaScript 和 vendor 静态文件，并记录普通访问日志。浏览器的可处理文件大小取决于用户设备内存，因此 client_max_body_size 对这些工具没有作用。

当前 Nginx 配置未启用 CSP 和 HSTS。原因是 AdSense 域名清单需要在真实广告启用后验证，HSTS 也应在 HTTPS 稳定运行后再添加，避免过早锁定错误配置。

材料上传助手首版仅支持桌面 Chrome 与 Microsoft Edge；触屏优先设备会显示兼容提示并保留基础工具入口。工具只验证所选文件大小上限，不承诺具体门户接受文件。
