# Changelog

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
