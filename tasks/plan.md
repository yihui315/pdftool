# Implementation Plan: pdftool V7 收尾任务

## Overview

完成 pdftool V7 AI 系统的收尾工作：代码质量改进、测试覆盖、自动化完善。

## Architecture Decisions

1. **SSH 密码安全**：auto-deploy.js 中硬编码密码改用环境变量 `process.env.SSH_PASS`
2. **模板引擎独立化**：将 page-generator.js 中的模板逻辑拆分为独立 `template-engine.js` 模块
3. **测试覆盖**：为所有 ai-system 脚本添加单元测试

## Task List

### Phase 1: 代码质量修复

- [ ] Task 1: 修复 auto-deploy.js SSH 密码暴露问题
- [ ] Task 2: 补充 ai-system 单元测试
- [ ] Task 3: 拆分 template-engine.js 独立模块

### Checkpoint: Phase 1
- [ ] 所有测试通过
- [ ] SSH 密码不在代码中
- [ ] 代码审查通过

### Phase 2: 收尾工作

- [ ] Task 4: GA4 监控检查
- [ ] Task 5: 更新 CHANGELOG.md V7 记录
- [ ] Task 6: 提交并部署

### Checkpoint: Complete
- [ ] 所有任务完成
- [ ] 已部署到生产环境
- [ ] 变更记录完整

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSH 部署失败 | 高 | 保留密码作为 fallback |
| 测试破坏现有功能 | 中 | 先跑现有测试，确认基线 |
| Git 冲突 | 低 | 先 pull 再 commit |

## Open Questions

- sitemap-builder.js 是否已创建？（之前任务中）
