/**
 * V7-Safe Quality Gate
 * 
 * 审核 drafts 页面，只有 quality_score >= 80 才移动到 published/seo/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const DRAFTS_DIR = join(BASE, 'drafts', 'seo');
const PUBLISHED_DIR = join(BASE, 'published', 'seo');
const GATE_THRESHOLD = 80;

// 确保目录存在
if (!existsSync(PUBLISHED_DIR)) {
  mkdirSync(PUBLISHED_DIR, { recursive: true });
}

// 评分函数
function scorePage(content) {
  let score = 0;
  
  // 有 title
  if (/<title>.*?<\/title>/i.test(content)) score += 20;
  
  // 有 H1
  if (/<h1[^>]*>.*?<\/h1>/i.test(content)) score += 20;
  
  // 正文词数 >= 500
  const bodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
  const bodyText = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, ' ') : '';
  const wordCount = bodyText.trim().split(/\s+/).length;
  if (wordCount >= 500) score += 20;
  
  // FAQ >= 4
  const faqCount = (content.match(/<details>/gi) || []).length;
  if (faqCount >= 4) score += 15;
  
  // 有 upload-ready 链接
  if (content.includes('upload-ready')) score += 10;
  
  // 有 services 链接
  if (content.includes('services')) score += 10;
  
  // 有 privacy 链接
  if (content.includes('privacy')) score += 10;
  
  return score;
}

function main() {
  console.log('🚪 V7-Safe Quality Gate Started\n');
  console.log(`🎯 Gate threshold: ${GATE_THRESHOLD}\n`);
  
  if (!existsSync(DRAFTS_DIR)) {
    console.log('⚠️  drafts/seo/ directory not found');
    console.log('💡 Run page-drafter.js first');
    return;
  }
  
  const drafts = readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.html'));
  
  if (drafts.length === 0) {
    console.log('⚠️  No draft pages found');
    return;
  }
  
  console.log(`📦 Found ${drafts.length} draft pages\n`);
  
  let published = 0;
  let rejected = 0;
  
  for (const draft of drafts) {
    const draftPath = join(DRAFTS_DIR, draft);
    const content = readFileSync(draftPath, 'utf-8');
    const score = scorePage(content);
    
    if (score >= GATE_THRESHOLD) {
      const publishedPath = join(PUBLISHED_DIR, draft);
      renameSync(draftPath, publishedPath);
      published++;
      console.log(`   ✅ ${draft} (score: ${score}) → published`);
    } else {
      rejected++;
      console.log(`   ❌ ${draft} (score: ${score}) - below threshold`);
    }
  }
  
  console.log(`\n✅ Quality gate complete:`);
  console.log(`   Published: ${published}`);
  console.log(`   Rejected: ${rejected}`);
  console.log(`\n📁 Published pages: published/seo/`);
}

main();
