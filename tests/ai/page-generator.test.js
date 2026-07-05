/**
 * RED: page-generator.js 单元测试
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_GEN_PATH = join(__dirname, '../../ai/page-generator.js');

describe('page-generator.js 单元测试', () => {
  describe('模块结构', () => {
    it('应导出 main 函数', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('function main()');
      expect(content).toContain('main();');
    });

    it('应读取 top_keywords.json', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('top_keywords.json');
    });
  });

  describe('页面生成逻辑', () => {
    it('应有 URL slug 生成函数', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('function slugify');
    });

    it('应有内容类别推断函数', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('inferCategory');
    });

    it('应生成 SEO 友好的 HTML 页面', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      
      // 应包含 SEO 元素
      expect(content).toContain('<title>');
      expect(content).toContain('<meta name="description"');
      expect(content).toContain('<meta name="robots"');
    });

    it('应有 FAQ 生成逻辑', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('generateFAQ');
    });

    it('应包含 Schema.org FAQ 标记', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('application/ld+json');
      expect(content).toContain('FAQPage');
    });
  });

  describe('内容模板', () => {
    it('应有 WHY_EXPLANATIONS 模板', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('WHY_EXPLANATIONS');
    });

    it('应有 SOLUTION_INTRO 模板', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('SOLUTION_INTRO');
    });

    it('应有导航和页脚模板', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('const NAV');
      expect(content).toContain('const FOOTER');
    });
  });

  describe('工具推荐', () => {
    it('应有 getRecommendedTools 函数', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      expect(content).toContain('getRecommendedTools');
    });

    it('应推荐相关工具链接', () => {
      const content = readFileSync(PAGE_GEN_PATH, 'utf-8');
      const tools = ['upload-ready.html', 'compress.html', 'merge.html', 'split.html'];
      for (const tool of tools) {
        expect(content).toContain(tool);
      }
    });
  });
});
