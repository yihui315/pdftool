/**
 * V7.1 Sitemap Builder - 简化版sitemap生成器
 * 
 * 用法: node ai-system/sitemap-builder.js
 */

const fs = require('fs');
const path = require('path');
const { log, success, error } = require('./utils');

// 扫描目录
function scanDir(dir, baseUrl) {
  const results = [];
  
  function scan(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir);
      
      entries.forEach(entry => {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 跳过特定目录
          if (!['node_modules', '.git', 'tests', 'ai', 'src', 'docs'].includes(entry)) {
            scan(fullPath);
          }
        } else if (entry.endsWith('.html')) {
          const relativePath = path.relative(dir, fullPath);
          const url = relativePath === 'index.html' 
            ? baseUrl + '/' 
            : baseUrl + '/' + relativePath.replace(/\\/g, '/');
          
          results.push({
            loc: url,
            lastmod: stat.mtime.toISOString().split('T')[0],
            priority: getPriority(entry, relativePath),
            changefreq: getChangefreq(entry, relativePath)
          });
        }
      });
    } catch (e) {
      // 忽略访问错误
    }
  }
  
  scan(dir);
  return results;
}

// 根据文件类型确定优先级
function getPriority(filename, relativePath) {
  // 主导航页 - 高优先级
  const mainNavPages = ['index.html', 'compress.html', 'merge.html', 'split.html', 'upload-ready.html'];
  if (mainNavPages.includes(filename)) return '0.9';
  
  // 工具页 - 最高
  if (['compress.html', 'merge.html', 'split.html'].some(p => filename.includes(p))) return '0.9';
  
  // SEO自动生成页 - 中等
  if (relativePath.includes('seo-pages/auto') || relativePath.includes('seo-')) return '0.6';
  
  // 博客页
  if (filename.includes('blog-')) return '0.7';
  
  // 其他页面 - 默认
  return '0.5';
}

// 根据文件类型确定更新频率
function getChangefreq(filename, relativePath) {
  const mainNavPages = ['index.html', 'compress.html', 'merge.html'];
  if (mainNavPages.includes(filename)) return 'daily';
  
  if (filename.includes('seo-') || relativePath.includes('seo-pages/auto')) return 'weekly';
  if (filename.includes('blog-')) return 'weekly';
  
  return 'monthly';
}

// 生成XML
function generateSitemap(urls) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];
  
  urls.forEach(u => {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(u.loc)}</loc>`);
    lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    lines.push(`    <priority>${u.priority}</priority>`);
    lines.push('  </url>');
  });
  
  lines.push('</urlset>');
  return lines.join('\n');
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 主程序
function main() {
  log('Starting sitemap builder...');
  
  const baseDir = path.join(__dirname, '..');
  const baseUrl = 'https://pdftool.work';
  const outputPath = path.join(baseDir, 'sitemap.xml');
  
  // 扫描HTML文件
  const urls = scanDir(baseDir, baseUrl);
  
  if (urls.length === 0) {
    error('No HTML files found');
    process.exit(1);
  }
  
  // 生成sitemap
  const sitemap = generateSitemap(urls);
  
  // 写入文件
  fs.writeFileSync(outputPath, sitemap, 'utf-8');
  
  // 统计
  const byPriority = { '0.9': 0, '0.8': 0, '0.7': 0, '0.6': 0, '0.5': 0 };
  urls.forEach(u => byPriority[u.priority]++);
  
  success(`Sitemap generated: ${urls.length} URLs`);
  console.log('\n📊 Priority distribution:');
  console.log(`  Priority 0.9 (daily):  ${byPriority['0.9']} pages`);
  console.log(`  Priority 0.7 (weekly): ${byPriority['0.7']} pages`);
  console.log(`  Priority 0.6 (weekly): ${byPriority['0.6']} pages`);
  console.log(`  Priority 0.5 (monthly):${byPriority['0.5']} pages`);
  console.log(`\n📁 Output: sitemap.xml (${sitemap.length} bytes)`);
}

main();
