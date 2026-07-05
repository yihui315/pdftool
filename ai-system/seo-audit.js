/**
 * V7-Safe SEO Page Audit
 * 
 * 审计所有 SEO 页面并生成质量报告
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const REPORT_DIR = join(BASE, 'data');

// 评分规则
const SCORING = {
  unique_title: 20,
  unique_h1: 20,
  min_word_count: 20, // >= 700 中文字 or >= 500 英文词
  faq_count: 15, // 4+ FAQ
  upload_ready_link: 10,
  services_link: 10,
  privacy_link: 10,
  duplicate_title: -30,
  duplicate_h1: -30,
  highly_similar: -40,
  keyword_stuffing: -50
};

// 决策规则
function getDecision(score) {
  if (score >= 70) return 'keep';
  if (score >= 50) return 'merge';
  if (score >= 30) return 'noindex';
  return 'delete';
}

// 扫描 HTML 文件
function scanHtmlFiles(dir) {
  const files = [];
  function scan(currentDir) {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            if (!['node_modules', '.git', 'tests', 'ai', 'src', 'docs'].includes(entry)) {
              scan(fullPath);
            }
          } else if (extname(entry) === '.html' && entry.startsWith('seo-')) {
            files.push({ path: fullPath, name: entry });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
  scan(dir);
  return files;
}

// 简单内容哈希
function contentHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// 审计页面
function auditPage(file) {
  const content = readFileSync(file.path, 'utf-8');
  const relativePath = file.path.replace(BASE + '/', '');
  
  // 提取元素
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const faqMatches = content.match(/<details>/gi) || [];
  const uploadReadyLink = content.includes('upload-ready.html') || content.includes('upload-ready');
  const servicesLink = content.includes('services.html') || content.includes('services');
  const privacyLink = content.includes('privacy.html') || content.includes('privacy');
  
  // 计算正文词数
  const bodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
  const bodyText = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '';
  const wordCount = bodyText.trim().split(/\s+/).length;
  
  // 简单评分
  let score = 0;
  if (titleMatch) score += SCORING.unique_title;
  if (h1Match) score += SCORING.unique_h1;
  if (wordCount >= 500) score += SCORING.min_word_count;
  if (faqMatches.length >= 4) score += SCORING.faq_count;
  if (uploadReadyLink) score += SCORING.upload_ready_link;
  if (servicesLink) score += SCORING.services_link;
  if (privacyLink) score += SCORING.privacy_link;
  
  return {
    url: relativePath,
    title: titleMatch ? titleMatch[1].trim() : '',
    h1: h1Match ? h1Match[1].trim() : '',
    word_count: wordCount,
    faq_count: faqMatches.length,
    cta_count: (content.match(/<a[^>]*class="[^"]*btn[^"]*"[^>]*>/gi) || []).length,
    internal_link_count: (content.match(/<a[^>]*href="[^"]*\.html[^"]*"[^>]*>/gi) || []).length,
    has_upload_ready_link: uploadReadyLink,
    has_services_link: servicesLink,
    has_privacy_link: privacyLink,
    content_hash: contentHash(content),
    quality_score: score,
    decision: getDecision(score)
  };
}

// 主程序
function main() {
  console.log('📊 SEO Page Audit Started\n');
  
  const htmlFiles = scanHtmlFiles(BASE);
  console.log(`🔍 Found ${htmlFiles.length} SEO pages\n`);
  
  const auditResults = htmlFiles.map(auditPage);
  
  // 统计
  const stats = { keep: 0, merge: 0, noindex: 0, delete: 0 };
  for (const r of auditResults) {
    stats[r.decision]++;
  }
  
  console.log('📝 Processing pages...');
  console.log(`\n🎉 Audit Complete!`);
  console.log(`   Total pages: ${auditResults.length}`);
  console.log(`   Keep (>=70): ${stats.keep}`);
  console.log(`   Merge (50-69): ${stats.merge}`);
  console.log(`   Noindex (30-49): ${stats.noindex}`);
  console.log(`   Delete (<30): ${stats.delete}`);
  
  // 保存报告
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  const reportPath = join(REPORT_DIR, 'seo-page-audit.json');
  writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n📁 Report saved: ${reportPath}`);
  
  return auditResults;
}

main();
