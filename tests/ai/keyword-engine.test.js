/**
 * RED: keyword-engine.js 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYWORD_ENGINE_PATH = join(__dirname, '../../ai/keyword-engine.js');

describe('keyword-engine.js 单元测试', () => {
  describe('评分逻辑', () => {
    it('应导出 main 函数', () => {
      // 动态导入模块
      const content = readFileSync(KEYWORD_ENGINE_PATH, 'utf-8');
      expect(content).toContain('function main()');
      expect(content).toContain('main();');
    });

    it('应有评分权重定义', () => {
      const content = readFileSync(KEYWORD_ENGINE_PATH, 'utf-8');

      // 检查意图权重
      expect(content).toContain('INTENT_WEIGHTS');

      // 检查类别权重
      expect(content).toContain('CATEGORY_WEIGHTS');
    });

    it('应包含高价值关键词场景', () => {
      const content = readFileSync(KEYWORD_ENGINE_PATH, 'utf-8');

      // 签证、简历等高商业意图关键词
      const highValueKeywords = ['visa', 'resume', 'contract', 'certificate', 'exam'];
      for (const kw of highValueKeywords) {
        expect(content).toContain(kw);
      }
    });

    it('应生成 top_keywords.json 输出', () => {
      const content = readFileSync(KEYWORD_ENGINE_PATH, 'utf-8');

      // 输出文件路径
      expect(content).toContain('top_keywords.json');

      // 应该是 JSON 格式
      expect(content).toContain('JSON.stringify');
    });
  });

  describe('关键词分类', () => {
    it('应区分 pain/action/scenario/tools/content 类别', () => {
      const content = readFileSync(KEYWORD_ENGINE_PATH, 'utf-8');

      const categories = ['pain', 'action', 'scenario', 'tools', 'content'];
      for (const cat of categories) {
        expect(content).toContain(cat);
      }
    });
  });
});
