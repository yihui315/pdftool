# Changelog

## [1.3.2.0] - 2026-07-19

### Changed
- 发布脚本现在会原子安装并验证生产 Nginx 配置，失败时同时恢复上一份站点发布物与服务器配置。
- 上线健康检查会逐个验证 sitemap 中的规范 URL 首次响应均为 HTTP 200，任何重定向或不可用页面都会阻止发布。

### Fixed
- 修复 `pdftool.work` HTTPS 首页重定向到自身的问题，并将 apex、`www` 与 HTTP 升级规则拆分为独立虚拟主机。
- 修复联系页、条款页和 Cookie 同意功能合入后遗留的测试 fixture、路由数量与交互断言漂移。

### Testing
- 发布门现覆盖 190 项单元测试、44 项 Chromium/Edge 浏览器测试、110 条多语言路由和 475 个发布文件。

## [1.3.1.0] - 2026-07-12

### Changed
- 让 `npm test` 自动先生成可测试的不可变发布目录，并让多语言构建只复制一次锁定的 PDF 运行时资源。
- 将 AdSense 合规检查限定到实际 `dist/` 发布物，避免源码、构建目录和其他工作树重复计数。

### Fixed
- 修复简体中文、英语、西班牙语、巴西葡萄牙语、日语和印尼语页面中跳转链接、桌面导航与移动菜单的共享外壳语言串扰。
- 修复 PDF 转 JPG 在 PDF.js 尚未加载完成时快速选择文件会丢失操作、按钮永久禁用的问题。
- 加固五个增长语言路由的 URL、运行时语言身份和根路径静态资源隔离，并覆盖 Chrome 与 Edge。

### Testing
- 发布门现覆盖 183 项单元测试、44 项 Chromium/Edge 浏览器测试、98 条多语言路由、465 个发布文件和 235 个 AdSense 页面。

## [1.3.0.0] - 2026-07-06

### Added
- 上线统一的多语言静态站点构建体系，覆盖简体中文、英语、西班牙语、巴西葡萄牙语、日语和印尼语。
- 为合并、拆分、压缩、页面管理、PDF 转图片、图片转 PDF、旋转、解锁和上传准备提供本地化工具页。
- 新增 20 个面向 1MB、500KB、保持可读性和文件过大上传场景的五语言搜索引流页，并输出可见 FAQ 与结构化数据。
- 生成带 canonical、hreflang、sitemap、文件哈希和 Git 提交信息的原子化 `dist/` 发布物。

### Changed
- 将 V6/V7 AI SEO、AdSense 合规页、博客和既有高意图静态页面纳入 `dist/` 白名单复制及 sitemap，避免两套生成系统在发布阶段互相覆盖。
- 本地服务、Playwright 和 CI 统一验证生成后的 `dist/`，并保留 main 分支的 SEO、AdSense 检查与 sitemap 提交脚本。
- PowerShell 与 Bash 部署脚本统一只发布经过 manifest 哈希验证的 `dist/`，记录构建 commit，并在激活或线上健康检查失败时回滚。
- 将 PDF 工具运行时资源改为根路径和第一方静态资源，确保嵌套语言页面可安全加载 PDF.js、pdf-lib 和 worker。

### Fixed
- 加固多语言内容、locale 对象、原型链、模板转义、构建输出路径和原子目录替换，拒绝伪造或越界输入。
- 修复移动端和桌面端导航溢出、上传准备移动设备提示、预览来源标签及浏览器测试与真实发布目录不一致的问题。
- 合并最新 main 的 V7 安全和性能修复，并清理新增脚本中的行尾空白。

### Testing
- 扩展内容验证、渲染、SEO alternate、manifest、sitemap、release 资产和浏览器端 PDF 工作流测试。
- 发布门覆盖完整 unit、Chromium/Edge 浏览器测试、生产构建和 release 文件验证。

## [1.2.0] - 2026-07-05

### Added
- **AI System V6** - 完整 AI SEO 自动化系统:
  - `ai/keyword-engine.js` - AI 关键词发现与评分
  - `ai/page-generator.js` - 差异化 SEO 页面生成
  - `ai/sitemap-builder.js` - 自动 sitemap 生成
  - `ai/indexing-agent.js` - IndexNow 批量索引提交
  - `ai/auto-deploy.js` - Git → 服务器自动部署

### Security
- 修复 `auto-deploy.js` SSH 密码硬编码问题，改用环境变量 `SSH_PASS`

### Testing
- 添加 AI System 单元测试:
  - `tests/ai/auto-deploy-security.test.js` - 安全测试
  - `tests/ai/keyword-engine.test.js` - 关键词引擎测试
  - `tests/ai/page-generator.test.js` - 页面生成测试

### Infrastructure
- GA4 跟踪代码已部署到全部 150 个页面
- SEO 系统支持 5 种内容类别差异化生成

## [1.1.0] - 2026-07-01

### Added
- **PDF 旋转** (`pdf-rotate.html`) - 批量旋转 PDF 每一页的角度，90°/180°/270° 任意选
- **PDF 解锁** (`pdf-unlock.html`) - 移除 PDF 打开密码，生成无密码版本
- **PDF 转图片** (`pdf-to-jpg.html`) - 将 PDF 每一页转换为高清 JPG 图片
- **图片转 PDF** (`jpg-to-pdf.html`) - 将 JPG、PNG 等图片批量合并为一个 PDF 文件
- **材料上传助手** (`upload-ready.html`) - 针对上传材料场景的 PDF 压缩工具
- **SEO 博客文章**:
  - `blog-merge-pdf.html` - 如何免费合并 PDF 教程
  - `blog-pdf-tips.html` - PDF 压缩太大怎么办
  - `blog-jpg-to-pdf.html` - JPG 图片转 PDF 教程
- **高意图 SEO 落地页**:
  - `compress-pdf-to-200kb.html` - PDF 压缩到 200KB 专用落地页
  - `compress-pdf-to-500kb.html` - PDF 压缩到 500KB 专用落地页
  - `compress-pdf-to-1mb.html` - PDF 压缩到 1MB 专用落地页
  - `compress-pdf-for-visa.html` - 签证申请材料 PDF 压缩
  - `compress-pdf-for-exam-registration.html` - 考试报名材料 PDF 压缩
  - `compress-pdf-for-application.html` - 申请材料 PDF 压缩
  - `compress-pdf-for-enterprise.html` - 企业用户 PDF 压缩
  - `compress-pdf-id-card.html` - 证件 PDF 压缩
  - `compress-pdf-pay-slip.html` - 工资条 PDF 压缩
  - `compress-scanned-pdf.html` - 扫描件 PDF 压缩
  - `pdf-too-large-to-upload.html` - 文件过大处理指南
  - `resize-pdf-for-upload.html` - 调整 PDF 上传尺寸
  - `pdf-contract-too-large.html` - 合同 PDF 过大处理
  - `pdf-thesis-large.html` - 论文 PDF 过大处理
  - `pdf-receipt-too-large.html` - 收据 PDF 过大处理
  - `pdf-tutorial-for-students.html` - 学生 PDF 教程
- **服务合作页** (`services.html`) - PDF 批量处理与企业内网部署服务
- **HowTo Schema** - 所有工具页添加结构化数据，提升 SEO 展示
- **Related Tools 内链** - 所有工具页底部增加相关工具推荐区块
- **sitemap.xml** - 33 个 URL，覆盖工具页、博客页、服务页和高意图 SEO 落地页

### Changed
- AdSense 集成完成，所有页面部署 Display 广告单元 (slot: 6363231932)
- GA4 分析已配置 (G-3GQPKP7FYH)
- 隐私政策更新，包含 AdSense、Cookie 和第三方广告说明
- about 页面更新工具列表（10 个核心工具与入口）
- VERSION 升级至 1.1.0

## [1.0.0] - 2026-06-30

### Added
- PDF 合并 (`merge.html`)
- PDF 分割 (`split.html`)
- PDF 页面管理 (`manage.html`)
- PDF 压缩 (`compress.html`)
- 关于页面 (`about.html`)
- 隐私政策 (`privacy.html`)
- sitemap.xml + robots.txt
- Google Search Console 验证
- GitHub Actions 自动化测试
