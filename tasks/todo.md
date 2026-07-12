# pdftool V7 收尾任务 - Task List

## Task 1: 修复 auto-deploy.js SSH 密码暴露问题

**Description:** 将 auto-deploy.js 中已移除的硬编码 SSH 凭据改为从环境变量 `process.env.SSH_PASS` 读取，增强安全性。

**Acceptance criteria:**
- [ ] 代码中不再包含旧 SSH 凭据
- [ ] 使用 `process.env.SSH_PASS` 读取密码
- [ ] 当环境变量未设置时，输出友好错误提示
- [ ] 现有功能不受影响（测试通过）

**Verification:**
- [ ] 对 `ai/` 执行密钥扫描不再发现旧 SSH 凭据
- [ ] `node ai/auto-deploy.js` 提示环境变量未设置（不直接暴露密码）
- [ ] 现有测试全部通过

**Dependencies:** None

**Files likely touched:**
- `ai/auto-deploy.js`

**Estimated scope:** Small (1 file)

---

## Task 2: 补充 ai-system 单元测试

**Description:** 为 ai-system 的 4 个核心脚本创建单元测试，使用 Node.js 原生测试框架或现有 vitest 配置。

**Acceptance criteria:**
- [ ] `tests/ai/keyword-engine.test.js` - 测试关键词评分逻辑
- [ ] `tests/ai/page-generator.test.js` - 测试页面生成逻辑
- [ ] `tests/ai/sitemap-builder.test.js` - 测试 sitemap 生成（如果文件存在）
- [ ] `tests/ai/indexing-agent.test.js` - 测试索引提交逻辑
- [ ] 所有测试通过

**Verification:**
- [ ] `npm test -- --grep "ai"` 全部通过
- [ ] 测试覆盖率报告生成

**Dependencies:** Task 1 (先修复安全问题)

**Files likely touched:**
- `tests/ai/keyword-engine.test.js` (新建)
- `tests/ai/page-generator.test.js` (新建)
- `tests/ai/sitemap-builder.test.js` (新建)
- `tests/ai/indexing-agent.test.js` (新建)

**Estimated scope:** Medium (4 files)

---

## Task 3: 拆分 template-engine.js 独立模块

**Description:** 将 page-generator.js 中内嵌的模板逻辑（NAV, FOOTER, WHY_EXPLANATIONS, SOLUTION_INTRO 等）拆分为独立的 `ai/template-engine.js` 模块。

**Acceptance criteria:**
- [ ] `ai/template-engine.js` 导出 `generatePage()` 函数
- [ ] `ai/page-generator.js` 导入并使用 template-engine.js
- [ ] 功能与之前完全一致（测试通过）
- [ ] 模板内容可通过配置覆盖

**Verification:**
- [ ] `npm test -- --grep "page-generator"` 通过
- [ ] 手动运行 `node ai/page-generator.js` 生成相同结果
- [ ] 代码行数 page-generator.js 减少 30%+

**Dependencies:** Task 2 (测试先行)

**Files likely touched:**
- `ai/template-engine.js` (新建)
- `ai/page-generator.js` (修改)

**Estimated scope:** Medium (2 files)

---

## Task 4: GA4 监控检查

**Description:** 检查所有 HTML 页面是否正确包含 GA4 跟踪代码 `G-3GQPKP7FYH`。

**Acceptance criteria:**
- [ ] 所有 HTML 页面包含 GA4 代码
- [ ] 代码格式正确（async script + gtag config）
- [ ] 缺失页面记录并补充

**Verification:**
- [ ] `grep -l "G-3GQPKP7FYH" *.html | wc -l` 等于总页面数
- [ ] `grep "gtag\|googletagmanager" *.html | wc -l` > 0

**Dependencies:** None

**Files likely touched:**
- 所有 HTML 页面

**Estimated scope:** Small (检查为主)

---

## Task 5: 更新 CHANGELOG.md V7 记录

**Description:** 在 CHANGELOG.md 添加 V7 相关更新记录。

**Acceptance criteria:**
- [ ] 添加 [V7] 条目
- [ ] 包含本次所有改动
- [ ] 日期为 2026-07-05

**Verification:**
- [ ] `grep "V7" CHANGELOG.md` 有输出
- [ ] 版本号从 1.1.0 更新

**Dependencies:** Task 1-4 完成

**Files likely touched:**
- `CHANGELOG.md`
- `VERSION`

**Estimated scope:** Small (文档)

---

## Task 6: 提交并部署

**Description:** 将所有改动提交到 Git 并部署到生产服务器。

**Acceptance criteria:**
- [ ] Git commit 成功
- [ ] Git push 成功
- [ ] 服务器部署成功
- [ ] 网站可访问

**Verification:**
- [ ] `git log -1 --oneline` 显示最新 commit
- [ ] `curl -so /dev/null -w "%{http_code}" https://pdftool.work/` 返回 200

**Dependencies:** Task 1-5 完成

**Estimated scope:** Small (操作任务)

---

## Checkpoint: After Tasks 1-3 (Phase 1)
- [ ] Task 1 完成并通过验证
- [ ] Task 2 测试全部通过
- [ ] Task 3 功能测试通过
- [ ] 代码审查通过

## Checkpoint: Complete
- [ ] 所有任务完成
- [ ] 已部署到生产环境
- [ ] 变更记录完整
