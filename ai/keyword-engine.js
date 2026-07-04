#!/usr/bin/env node
/**
 * V6 Keyword Engine - AI-powered keyword discovery & scoring
 * 
 * Phase 1: 从多渠道获取关键词 → 评分 → 输出 top_keywords.json
 * 
 * 用法: node ai/keyword-engine.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const DATA_DIR = join(BASE, 'data');
const KEYWORDS_FILE = join(DATA_DIR, 'top_keywords.json');
const SEO_KEYWORDS_FILE = join(BASE, 'seo', 'keywords.json');

// ─── 评分权重 ───────────────────────────────────────
const INTENT_WEIGHTS = {
  // 高商业意图 (money keywords)
  'compress': 3, 'compression': 3, 'reduce': 2, 'smaller': 2,
  'upload': 4, 'upload-failed': 5, 'too-large': 4, 'file-size': 3,
  'email-attachment': 3, 'send': 2, 'submit': 3, 'submit-failed': 5,
  'visa': 5, '签证': 5, 'immigration': 5,
  'job': 4, 'resume': 4, '简历': 4, '求职': 4,
  'school': 4, 'university': 4, '留学': 5, '申请': 3,
  'contract': 4, '合同': 4, '协议': 3,
  'certificate': 3, '证书': 3, '证件照': 4,
  'bank-statement': 4, '流水': 4, '证明': 3,
  '身份证': 4, 'passport': 4, '护照': 4,
  'business': 3, '企业': 3, 'oa': 3,
  'exam': 4, '考试': 4, '报名': 3, 'registration': 3,
  'wechat': 3, '微信': 3, 'attachment': 3,
  'failed': 4, 'error': 3, 'cannot': 4, '无法': 4,
  '免费': 1, 'free': 1, 'online': 1,
  'merge': 3, 'split': 3, 'combine': 3, '合并': 3, '分割': 3,
  'rotate': 2, 'unlock': 4, '解锁': 4, 'password': 4,
  'convert': 3, '转换': 3, 'jpg': 3, 'image': 2,
};

// ─── 场景分类权重 ───────────────────────────────────
const CATEGORY_WEIGHTS = {
  'pain': 5,      // 问题型关键词 - 最高价值
  'action': 4,     // 行动型关键词 - 高价值
  'scenario': 4,   // 场景型关键词 - 高价值
  'content': 2,    // 内容型关键词 - 中等
  'tools': 2,      // 工具型关键词 - 中等
};

// ─── Google Suggest 模拟扩展 ──────────────────────
const SUGGEST_PATTERNS = [
  // 压缩场景
  ['pdf', 'too', 'large'],           ['compress', 'pdf', 'online'],
  ['pdf', 'size', 'reduce'],          ['pdf', 'file', 'small'],
  ['pdf', 'compress', 'kb'],          ['pdf', 'smaller', 'file'],
  ['pdf', 'reduce', 'mb'],            ['pdf', 'compress', 'without', 'quality'],
  // 上传失败
  ['pdf', 'upload', 'failed'],         ['pdf', 'cannot', 'upload'],
  ['pdf', 'file', 'too', 'big'],       ['pdf', 'too', 'large', 'email'],
  ['pdf', 'size', 'limit'],            ['pdf', 'exceeds', 'upload', 'limit'],
  // 签证
  ['visa', 'pdf', 'size'],             ['visa', 'application', 'pdf'],
  ['schengen', 'visa', 'pdf'],         ['us', 'visa', 'pdf', 'format'],
  // 学校申请
  ['university', 'application', 'pdf'], ['school', 'pdf', 'submit'],
  ['college', 'admission', 'pdf'],      ['study', 'abroad', 'pdf'],
  // 简历求职
  ['resume', 'pdf', 'too', 'large'],   ['job', 'application', 'pdf'],
  ['cv', 'pdf', 'compress'],           ['recruitment', 'pdf', 'upload'],
  // 合同文件
  ['contract', 'pdf', 'compress'],     ['agreement', 'pdf', 'size'],
  ['legal', 'document', 'pdf'],         ['pdf', 'legal', 'file', 'small'],
  // 证件材料
  ['id', 'card', 'pdf', 'scan'],       ['passport', 'pdf', 'scan'],
  ['certificate', 'pdf', 'compress'],  ['bank', 'statement', 'pdf'],
  // 微信/邮件附件
  ['pdf', 'wechat', 'too', 'large'],   ['pdf', 'email', 'attachment', 'limit'],
  ['pdf', 'attachment', 'send'],       ['pdf', 'cannot', 'attach', 'email'],
  // 考试报名
  ['exam', 'registration', 'pdf'],     ['test', 'pdf', 'upload'],
  ['registration', 'pdf', 'size'],     ['enrollment', 'pdf', 'submit'],
  // PDF工具类
  ['merge', 'pdf', 'online'],          ['split', 'pdf', 'pages'],
  ['pdf', 'rotate', 'online'],         ['pdf', 'unlock', 'online'],
  ['pdf', 'to', 'jpg', 'online'],       ['jpg', 'to', 'pdf', 'online'],
];

// ─── 从现有keywords.json加载 ────────────────────────
function loadExistingKeywords() {
  const existing = [];
  if (existsSync(SEO_KEYWORDS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(SEO_KEYWORDS_FILE, 'utf-8'));
      for (const [category, words] of Object.entries(data)) {
        for (const word of words) {
          existing.push({ word, category });
        }
      }
    } catch(e) {
      console.log('⚠️  读取keywords.json失败:', e.message);
    }
  }
  return existing;
}

// ─── 评分函数 ──────────────────────────────────────
function scoreKeyword(keyword, category) {
  const lower = keyword.toLowerCase();
  let score = 0;
  
  // 类别基础分
  const catWeight = CATEGORY_WEIGHTS[category] || 2;
  score += catWeight;
  
  // 意图词匹配
  for (const [intent, weight] of Object.entries(INTENT_WEIGHTS)) {
    if (lower.includes(intent)) {
      score += weight;
    }
  }
  
  // 中文关键词检测
  const chineseMatch = lower.match(/[\u4e00-\u9fff]+/g);
  if (chineseMatch) {
    const chinese = chineseMatch.join('');
    for (const [intent, weight] of Object.entries(INTENT_WEIGHTS)) {
      if (chinese.includes(intent)) {
        score += weight;
      }
    }
    // 中文额外分数
    score += 2;
  }
  
  // 长度惩罚（太长或太短）
  const wordCount = lower.split(/\s+/).length;
  if (wordCount > 8) score -= 2;
  if (wordCount < 2) score -= 1;
  
  // 已存在惩罚（避免重复）
  const existing = loadExistingKeywords();
  const alreadyExists = existing.some(e => e.word === keyword);
  if (alreadyExists) score -= 10;
  
  return Math.max(1, Math.min(score, 15)); // 1-15分
}

// ─── 生成建议词 ─────────────────────────────────────
function generateSuggestions() {
  const suggestions = [];
  for (const pattern of SUGGEST_PATTERNS) {
    // 直接组合
    const kw = pattern.join(' ');
    suggestions.push(kw);
    
    // 加上数字后缀（容量）
    if (pattern.includes('compress') || pattern.includes('reduce') || pattern.includes('size')) {
      for (const size of ['200kb', '500kb', '1mb', '2mb']) {
        suggestions.push(`${kw} ${size}`);
      }
    }
    
    // 加 how/why/what
    if (pattern.length <= 3) {
      suggestions.push(`how to ${kw}`);
      suggestions.push(`why is ${kw}`);
      suggestions.push(`what is ${kw}`);
    }
  }
  
  // 中文扩展
  const chinesePatterns = [
    ['PDF', '太大', '上传'], ['PDF', '压缩', '免费'], ['PDF', '合并', '在线'],
    ['PDF', '分割', '工具'], ['PDF', '太大', '邮件'], ['PDF', '太大', '微信'],
    ['PDF', '太大', '签证'], ['PDF', '太大', '学校'], ['PDF', '太大', '简历'],
    ['PDF', '太大', '合同'], ['PDF', '太大', '报名'], ['PDF', '太大', '考试'],
    ['PDF', '转', '图片'], ['图片', '转', 'PDF'],
  ];
  for (const p of chinesePatterns) {
    suggestions.push(p.join(''));
    suggestions.push(p.slice(0,2).join('')); // 前2个
  }
  
  return [...new Set(suggestions)]; // 去重
}

// ─── 主程序 ────────────────────────────────────────
function main() {
  console.log('🔍 V6 Keyword Engine - Phase 1\n');
  
  // 1. 加载现有词
  const existing = loadExistingKeywords();
  console.log(`📦 已有关键词: ${existing.length}个`);
  
  // 2. 生成新候选词
  const suggestions = generateSuggestions();
  console.log(`💡 生成候选词: ${suggestions.length}个`);
  
  // 3. 对所有词评分
  const allKeywords = [];
  
  // 添加现有词
  for (const { word, category } of existing) {
    allKeywords.push({
      keyword: word,
      category,
      score: scoreKeyword(word, category),
      source: 'existing'
    });
  }
  
  // 添加新候选词
  for (const keyword of suggestions) {
    // 推断类别
    let category = 'content';
    const lower = keyword.toLowerCase();
    if (/pain|太大|失败|cannot|upload.*fail|too.*large/.test(lower)) category = 'pain';
    else if (/compress|reduce|how.*to/.test(lower)) category = 'action';
    else if (/visa|job|resume|school|university|contract|certificate|exam|wechat|email/.test(lower)) category = 'scenario';
    else if (/merge|split|rotate|convert|unlock/.test(lower)) category = 'tools';
    
    allKeywords.push({
      keyword,
      category,
      score: scoreKeyword(keyword, category),
      source: 'ai-generated'
    });
  }
  
  // 4. 排序去重
  allKeywords.sort((a, b) => b.score - a.score);
  
  const seen = new Set();
  const unique = allKeywords.filter(k => {
    const key = k.keyword.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // 5. 取Top 50
  const top50 = unique.slice(0, 50);
  
  // 6. 分类统计
  const byCategory = {};
  for (const k of top50) {
    if (!byCategory[k.category]) byCategory[k.category] = [];
    byCategory[k.category].push(k);
  }
  
  // 7. 保存
  writeFileSync(KEYWORDS_FILE, JSON.stringify(top50, null, 2), 'utf-8');
  
  // 8. 输出报告
  console.log(`\n✅ 生成 top_keywords.json (${top50.length}个高价值关键词)\n`);
  console.log('📊 分数分布:');
  for (const [cat, items] of Object.entries(byCategory)) {
    const avg = (items.reduce((s, i) => s + i.score, 0) / items.length).toFixed(1);
    console.log(`  ${cat}: ${items.length}个 (平均分 ${avg})`);
  }
  
  console.log('\n🏆 Top 20 关键词:');
  top50.slice(0, 20).forEach((k, i) => {
    console.log(`  ${i+1}. [${k.score}分] ${k.keyword} (${k.source})`);
  });
  
  return top50;
}

main();
