/**
 * V7-Safe Sitemap Builder
 * 
 * 只读取 published 页面，不读取 drafts 页面
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const PUBLISHED_DIR = join(BASE, 'published', 'seo');

// 核心工具页
const CORE_PAGES = [
  'index.html',
  'compress.html',
  'merge.html',
  'split.html',
  'upload-ready.html',
  'services.html',
  'privacy.html',
  'terms.html',
  'about.html',
  'blog.html'
];

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getPriority(filename) {
  if (CORE_PAGES.includes(filename)) return '0.9';
  if (filename.includes('compress')) return '0.8';
  if (filename.startsWith('seo-')) return '0.6';
  return '0.5';
}

function getChangefreq(filename) {
  if (CORE_PAGES.includes(filename)) return 'daily';
  if (filename.startsWith('seo-')) return 'weekly';
  return 'monthly';
}

function main() {
  console.log('🗺️  V7-Safe Sitemap Builder Started\n');
  
  const urls = [];
  const baseUrl = 'https://pdftool.work';
  
  // 添加核心页面
  for (const page of CORE_PAGES) {
    const filepath = join(BASE, page);
    if (existsSync(filepath)) {
      const stat = statSync(filepath);
      const url = page === 'index.html' ? baseUrl + '/' : baseUrl + '/' + page;
      urls.push({
        loc: url,
        lastmod: stat.mtime.toISOString().split('T')[0],
        priority: getPriority(page),
        changefreq: getChangefreq(page)
      });
    }
  }
  
  // 添加 published SEO 页面
  if (existsSync(PUBLISHED_DIR)) {
    const publishedFiles = readdirSync(PUBLISHED_DIR).filter(f => f.endsWith('.html'));
    console.log(`📦 Found ${publishedFiles.length} published SEO pages`);
    
    for (const file of publishedFiles) {
      const filepath = join(PUBLISHED_DIR, file);
      const stat = statSync(filepath);
      urls.push({
        loc: baseUrl + '/published/seo/' + file,
        lastmod: stat.mtime.toISOString().split('T')[0],
        priority: '0.6',
        changefreq: 'weekly'
      });
    }
  } else {
    console.log('⚠️  published/seo/ directory not found');
  }
  
  // 生成 sitemap
  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];
  
  for (const url of urls) {
    xmlLines.push('  <url>');
    xmlLines.push(`    <loc>${escapeXml(url.loc)}</loc>`);
    xmlLines.push(`    <lastmod>${url.lastmod}</lastmod>`);
    xmlLines.push(`    <changefreq>${url.changefreq}</changefreq>`);
    xmlLines.push(`    <priority>${url.priority}</priority>`);
    xmlLines.push('  </url>');
  }
  
  xmlLines.push('</urlset>');
  
  const sitemap = xmlLines.join('\n');
  const sitemapPath = join(BASE, 'sitemap.xml');
  writeFileSync(sitemapPath, sitemap, 'utf-8');
  
  console.log(`\n✅ Sitemap generated: ${urls.length} URLs`);
  console.log(`📁 Output: sitemap.xml`);
  
  // 统计
  const byPriority = { '0.9': 0, '0.8': 0, '0.6': 0, '0.5': 0 };
  for (const u of urls) byPriority[u.priority]++;
  
  console.log('\n📊 Priority distribution:');
  console.log(`   Priority 0.9: ${byPriority['0.9']} pages`);
  console.log(`   Priority 0.8: ${byPriority['0.8']} pages`);
  console.log(`   Priority 0.6: ${byPriority['0.6']} pages`);
  console.log(`   Priority 0.5: ${byPriority['0.5']} pages`);
}

main();
