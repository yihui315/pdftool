/**
 * RED: 安全测试 - SSH 密码不应硬编码在代码中
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTO_DEPLOY_PATH = join(__dirname, '../../ai/auto-deploy.js');

describe('auto-deploy.js 安全测试', () => {
  it('不应包含硬编码的 SSH 密码', () => {
    const content = readFileSync(AUTO_DEPLOY_PATH, 'utf-8');
    
    // 检查常见的密码模式
    const passwordPatterns = [
      'Tw599999999',
      /const SSH_PASS\s*=\s*['"][^'"]+['"]/,
      /SSH_PASS.*=.*['"][A-Za-z0-9]{6,}['"]/,
    ];
    
    for (const pattern of passwordPatterns) {
      if (typeof pattern === 'string') {
        expect(content).not.toContain(pattern);
      } else {
        expect(pattern.test(content)).toBe(false);
      }
    }
  });

  it('应使用环境变量读取 SSH 密码', () => {
    const content = readFileSync(AUTO_DEPLOY_PATH, 'utf-8');
    
    // 应该使用 process.env.SSH_PASS
    expect(content).toContain('process.env.SSH_PASS');
  });

  it('环境变量未设置时应提示友好错误', () => {
    const content = readFileSync(AUTO_DEPLOY_PATH, 'utf-8');
    
    // 应该有错误处理逻辑
    expect(content).toMatch(/if.*SSH_PASS.*未设置|if.*!.*SSH_PASS|error.*SSH_PASS/i);
  });
});
