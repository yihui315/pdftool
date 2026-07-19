# AdSense 提交审核清单

## 提交前检查清单（提交前必读）

### ✅ 页面数量
- [x] 至少 15 个有效页面（当前发布门检查 245 个 AdSense 页面）
- [x] 教程、场景页、核心工具页和五个增长语言的搜索落地页均已纳入 `dist/`

### ✅ 内容质量
- [x] 所有工具有实际功能（纯前端 PDF 处理）
- [x] 页面有实质内容（FAQ、HowTo、场景说明）
- [x] 无空页面或占位内容
- [x] 无抄袭内容，全部原创

### ✅ 导航与结构
- [x] 导航包含全部工具（当前 10 个）
- [x] Footer 包含 About / Privacy / Contact
- [x] 有 sitemap.xml
- [x] 有 robots.txt

### ✅ 合规检查
- [x] 无诱导点击广告语言（"请点击广告支持"等）
- [x] AdSense 不贴上传/下载按钮（全部 >200 字符）
- [x] 广告不伪装成内容
- [x] 无违规内容（盗版、赌博、色情）
- [x] Privacy 页面说明 AdSense / Cookie / 第三方广告
- [x] About 页面无夸大宣传

### ✅ 技术配置
- [x] ads.txt 已部署（pub-2913395948188969）
- [x] GA4 已配置（G-3GQPKP7FYH）
- [x] 所有页面有唯一 title + meta description
- [x] 所有页面有 canonical 标签
- [x] robots.txt 不阻止爬虫
- [x] HTTPS 正常工作

### ✅ 提交信息
- **网站地址**: https://pdftool.work
- **网站语言**: 简体中文、英语、西班牙语、巴西葡萄牙语、日语、印尼语
- **内容类型**: 工具/教程

---

## AdSense 审核常见拒绝原因

1. **内容不足** - 页面太少或内容太薄 → 当前发布门检查 245 个 AdSense 页面 ✅
2. **导航有问题** - 爬虫无法抓取 → robots.txt 允许 ✅
3. **诱导点击** - 有违规广告语言 → 无违规 ✅
4. **虚假功能** - 功能不工作 → 全部纯前端 PDF 处理 ✅
5. **关于我们不完整** → 已更新 ✅

---

## 提交后注意事项

### 如果审核通过（通常 1-7 天）
1. 在 AdSense 后台确认网站已批准
2. 确保付款设置正确
3. 监控广告展示情况

### 如果审核被拒（通常 1-3 天收到邮件）
常见原因及解决方案：
- 原因：页面内容不足 → 增加更多 SEO 文章
- 原因：导航问题 → 检查 robots.txt 和 sitemap
- 原因：违规内容 → 检查所有页面有无违规文字
- 原因：诱导点击 → 检查广告位周围文字

---

## 联盟计划申请链接

| 平台 | 申请地址 | 备注 |
|------|---------|------|
| Adobe Affiliate | https://www.adobe.com/affiliate-program.html | Adobe 全球联盟 |
| Foxit Affiliate | https://www.foxit.com/partners/affiliate-program.html | PDF 软件合作 |
| Nitro Affiliate | https://www.gonitro.com/affiliate | Nitro PDF 联盟 |

申请通过后，将真实链接替换：
```bash
./scripts/replace-affiliate.sh "你的Adobe链接" "你的Foxit链接" "你的Nitro链接"
```
