#!/usr/bin/env node
/**
 * Sitemap Builder - 生成符合 sitemap.org 规范的 XML
 *
 * 功能:
 * - 扫描所有 HTML 文件
 * - 根据页面类型设置 priority 和 changefreq
 * - 按最后修改时间排序
 * - 生成标准 XML 格式
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASE = join(__dirname, '..');

// 页面类型识别和优先级配置
const PAGE_TYPES = {
  mainNav: {
    files: ['index.html', 'compress.html', 'merge.html', 'split.html', 'pdf-rotate.html',
            'pdf-to-jpg.html', 'jpg-to-pdf.html', 'manage.html', 'about.html', 'blog.html',
            'privacy.html', 'upload-ready.html', 'services.html', 'pdf-tools.html'],
    priority: '0.8',
    changefreq: 'weekly'
  },
  seoLanding: {
    pattern: /^seo-.*\.html$/,
    priority: '0.6',
    changefreq: 'monthly'
  },
  blog: {
    pattern: /^blog-.*\.html$/,
    priority: '0.7',
    changefreq: 'weekly'
  },
  tool: {
    pattern: /^(compress|merge|split|pdf-rotate|pdf-to-jpg|jpg-to-pdf|resize-pdf|pdf-unlock)\.html$/,
    priority: '0.9',
    changefreq: 'daily'
  },
  guide: {
    pattern: /^guide-.*\.html$/,
    priority: '0.6',
    changefreq: 'monthly'
  },
  compress: {
    pattern: /^compress-.*\.html$/,
    priority: '0.7',
    changefreq: 'weekly'
  }
};

// 主导航页额外列表
const MAIN_NAV_PAGES = [
  'index.html', 'compress.html', 'merge.html', 'split.html', 'pdf-rotate.html',
  'pdf-to-jpg.html', 'jpg-to-pdf.html', 'manage.html', 'about.html', 'blog.html',
  'privacy.html', 'upload-ready.html', 'services.html', 'pdf-tools.html'
];

/**
 * 确定页面类型和优先级配置
 */
function getPageConfig(filename) {
  // 主导航页
  if (MAIN_NAV_PAGES.includes(filename)) {
    return { type: 'mainNav', priority: '0.8', changefreq: 'weekly' };
  }

  // 工具页
  const toolPatterns = [
    /^compress\.html$/, /^merge\.html$/, /^split\.html$/, /^pdf-rotate\.html$/,
    /^pdf-to-jpg\.html$/, /^jpg-to-pdf\.html$/, /^resize-pdf\.html$/, /^pdf-unlock\.html$/,
    /^compress-pdf.*\.html$/
  ];
  if (toolPatterns.some(p => p.test(filename))) {
    return { type: 'tool', priority: '0.9', changefreq: 'daily' };
  }

  // SEO 落地页
  if (/^seo-/.test(filename)) {
    return { type: 'seoLanding', priority: '0.6', changefreq: 'monthly' };
  }

  // 博客页
  if (/^blog-/.test(filename)) {
    return { type: 'blog', priority: '0.7', changefreq: 'weekly' };
  }

  // 指南页
  if (/^guide-/.test(filename)) {
    return { type: 'guide', priority: '0.6', changefreq: 'monthly' };
  }

  // 其他 compress-*.html
  if (/^compress-/.test(filename)) {
    return { type: 'compress', priority: '0.7', changefreq: 'weekly' };
  }

  // 其他页面默认
  return { type: 'other', priority: '0.5', changefreq: 'monthly' };
}

/**
 * 扫描目录下所有 HTML 文件
 */
function scanHtmlFiles(dir) {
  const files = [];

  function scan(currentDir, baseRelative = '') {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过特定目录
          if (entry === 'node_modules' || entry === '.git' || entry === 'tests' ||
              entry === 'test-results' || entry === 'src' || entry === 'docs' ||
              entry === 'ai' || entry === 'scripts' || entry === 'deploy') {
            continue;
          }
          const newRelative = baseRelative ? `${baseRelative}/${entry}` : entry;
          scan(fullPath, newRelative);
        } else if (extname(entry) === '.html') {
          const relativePath = baseRelative ? `${baseRelative}/${entry}` : entry;
          files.push({
            path: fullPath,
            name: entry,
            relativePath: relativePath,
            mtime: stat.mtime
          });
        }
      }
    } catch (e) {
      // 忽略访问错误
    }
  }

  scan(dir);
  return files;
}

/**
 * 格式化日期为 ISO 格式 (YYYY-MM-DD)
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * 生成 XML 字符串
 */
function generateSitemapXml(pages, baseUrl = 'https://pdftool.work') {
  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];

  // 按修改时间排序 (最新的在前)
  pages.sort((a, b) => b.mtime - a.mtime);

  for (const page of pages) {
    const config = getPageConfig(page.name);
    const relativePath = page.relativePath || page.path.replace(BASE + '/', '');
    const url = relativePath === 'index.html'
      ? baseUrl + '/'
      : baseUrl + '/' + relativePath;

    xmlLines.push('  <url>');
    xmlLines.push(`    <loc>${escapeXml(url)}</loc>`);
    xmlLines.push(`    <lastmod>${formatDate(page.mtime)}</lastmod>`);
    xmlLines.push(`    <changefreq>${config.changefreq}</changefreq>`);
    xmlLines.push(`    <priority>${config.priority}</priority>`);
    xmlLines.push('  </url>');
  }

  xmlLines.push('</urlset>');
  return xmlLines.join('\n');
}

/**
 * XML 特殊字符转义
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 主函数
 */
function main() {
  console.log('🗺️  Sitemap Builder\n');

  // 扫描 HTML 文件
  console.log('1️⃣  Scanning HTML files...');
  const htmlFiles = scanHtmlFiles(BASE);
  console.log(`   Found ${htmlFiles.length} HTML files`);

  // 统计各类型页面
  const stats = { mainNav: 0, seoLanding: 0, blog: 0, tool: 0, guide: 0, compress: 0, other: 0 };
  for (const file of htmlFiles) {
    const config = getPageConfig(file.name);
    stats[config.type]++;
  }

  console.log('   📊 Page type distribution:');
  console.log(`      - Main Navigation: ${stats.mainNav}`);
  console.log(`      - SEO Landing Pages: ${stats.seoLanding}`);
  console.log(`      - Blog Pages: ${stats.blog}`);
  console.log(`      - Tool Pages: ${stats.tool}`);
  console.log(`      - Guide Pages: ${stats.guide}`);
  console.log(`      - Compress Pages: ${stats.compress}`);
  console.log(`      - Other: ${stats.other}`);

  // 生成 sitemap.xml
  console.log('\n2️⃣  Generating sitemap.xml...');
  const sitemapXml = generateSitemapXml(htmlFiles);

  // 保存到项目根目录
  const outputPath = join(BASE, 'sitemap.xml');
  writeFileSync(outputPath, sitemapXml, 'utf-8');
  console.log(`   ✅ Saved to: ${outputPath}`);
  console.log(`   📄 Size: ${sitemapXml.length} bytes`);
  console.log(`   📝 Total URLs: ${htmlFiles.length}`);

  // 输出统计信息
  console.log('\n3️⃣  Priority distribution:');
  const priorityCount = { '0.9': 0, '0.8': 0, '0.7': 0, '0.6': 0, '0.5': 0 };
  for (const file of htmlFiles) {
    const config = getPageConfig(file.name);
    priorityCount[config.priority]++;
  }
  console.log(`      - Priority 0.9 (daily): ${priorityCount['0.9']} pages`);
  console.log(`      - Priority 0.8 (weekly): ${priorityCount['0.8']} pages`);
  console.log(`      - Priority 0.7 (weekly): ${priorityCount['0.7']} pages`);
  console.log(`      - Priority 0.6 (monthly): ${priorityCount['0.6']} pages`);
  console.log(`      - Priority 0.5 (monthly): ${priorityCount['0.5']} pages`);

  console.log('\n✅ Sitemap generation complete!');

  return outputPath;
}

// 导出函数供其他模块调用
export { main, generateSitemapXml, scanHtmlFiles, getPageConfig };

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
