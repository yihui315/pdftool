/**
 * V7-Safe AdSense Policy Checker
 * 
 * 功能:
 * 1. 扫描所有 HTML 页面
 * 2. 检查违规内容
 * 3. 输出报告到 reports/adsense-policy-report.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const REPORTS_DIR = join(BASE, 'reports');

// 违规短语
const FORBIDDEN_PHRASES = [
  '点击广告',
  '点一下广告支持',
  'click ads',
  'support us by clicking',
  'sponsor click',
  '支持本站请点广告',
  '资源推荐',
  '推荐工具'
];

// 合规的广告标题
const ALLOWED_AD_LABELS = ['广告', 'Advertisement', 'Sponsored Links'];

// 报告结果
const report = {
  timestamp: new Date().toISOString(),
  total_pages_checked: 0,
  violations: [],
  pages_with_issues: 0,
  ad_placement_issues: [],
  status: 'pass'
};

console.log('🔍 AdSense Policy Check Started\n');

// 扫描 HTML 文件
function scanHtmlFiles(dir, files = []) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        const stat = readFileSync.statSync(fullPath);
        if (stat.isDirectory() && !['node_modules', '.git', 'tests', 'ai', 'src', 'docs'].includes(entry)) {
          scanHtmlFiles(fullPath, files);
        } else if (entry.endsWith('.html')) {
          files.push(fullPath);
        }
      } catch (e) {
        // 忽略访问错误
      }
    }
  } catch (e) {
    // 忽略目录错误
  }
  return files;
}

// 检查页面
function checkPage(filePath) {
  const issues = [];
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = filePath.replace(BASE + '/', '');
  
  // 检查违规短语
  for (const phrase of FORBIDDEN_PHRASES) {
    if (content.includes(phrase)) {
      issues.push({
        type: 'forbidden_phrase',
        phrase,
        file: relativePath
      });
    }
  }
  
  // 检查广告标签
  const adLabelMatches = content.match(/<(?:div|p|span)[^>]*class="[^"]*ad[^"]*"[^>]*>.*?<\/(?:div|p|span)>/gi) || [];
  for (const match of adLabelMatches) {
    const hasCompliantLabel = ALLOWED_AD_LABELS.some(label => match.includes(label));
    const hasMisleadingLabel = ['资源', '推荐工具', '赞助商'].some(label => match.includes(label));
    
    if (hasMisleadingLabel && !hasCompliantLabel) {
      issues.push({
        type: 'misleading_ad_label',
        content: match.substring(0, 100),
        file: relativePath
      });
    }
  }
  
  // 检查广告附近是否有按钮
  const adContainerPattern = /<ins[^>]*class="[^"]*adsbygoogle[^"]*"[^>]*>.*?<\/ins>/gs;
  const buttons = ['上传', '下载', '开始压缩', 'upload', 'download', 'start'];
  let adMatch;
  while ((adMatch = adContainerPattern.exec(content)) !== null) {
    const adEnd = adContainerPattern.lastIndex;
    const afterAd = content.substring(adEnd, adEnd + 300);
    
    for (const button of buttons) {
      if (afterAd.includes(button)) {
        issues.push({
          type: 'ad_near_button',
          button,
          file: relativePath
        });
      }
    }
  }
  
  // 检查自动刷新广告
  if (/auto-refresh.*ads|ads.*auto-refresh/i.test(content)) {
    issues.push({
      type: 'auto_refresh_ads',
      file: relativePath
    });
  }
  
  return issues;
}

// 执行扫描
const htmlFiles = scanHtmlFiles(BASE);
report.total_pages_checked = htmlFiles.length;

for (const file of htmlFiles) {
  const issues = checkPage(file);
  if (issues.length > 0) {
    report.pages_with_issues++;
    report.violations.push(...issues);
  }
}

report.status = report.violations.length === 0 ? 'pass' : 'fail';

// 输出结果
console.log(`📊 Pages checked: ${report.total_pages_checked}`);
console.log(`✅ Violations found: ${report.violations.length}`);
console.log(`📁 Pages with issues: ${report.pages_with_issues}\n`);

if (report.violations.length > 0) {
  console.log('⚠️  Issues found:');
  for (const v of report.violations.slice(0, 5)) {
    console.log(`   - [${v.type}] ${v.file}: ${v.phrase || v.content?.substring(0, 50) || 'N/A'}`);
  }
} else {
  console.log('✅ All pages passed AdSense policy check!');
}

// 确保 reports 目录存在
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

// 写入报告
const reportPath = join(REPORTS_DIR, 'adsense-policy-report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('\n📁 Report saved:', reportPath);
