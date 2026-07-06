/**
 * V7.1 Keyword Engine - 简化版关键词生成器
 *
 * 用法: node ai-system/keyword-engine.js
 */

const fs = require('fs');
const path = require('path');
const { log, success, error } = require('./utils');

// 种子关键词库
const baseKeywords = [
  // 高意图场景 - 上传失败
  'pdf too large upload failed',
  'pdf cannot upload to website',
  'file size too large upload error',
  'pdf upload failed due to size limit',

  // 压缩场景
  'compress pdf to 200kb',
  'compress pdf to 500kb',
  'compress pdf to 1mb online free',
  'pdf compression without quality loss',
  'reduce pdf file size online free',

  // 邮件附件场景
  'pdf file too big for email attachment',
  'pdf too large for gmail',
  'compress pdf for email free',

  // 签证场景
  'visa pdf size too large',
  'schengen visa pdf size limit',
  'us visa application pdf too big',
  'visa application file too large',

  // 学校申请场景
  'school application pdf too big',
  'university application pdf size limit',
  'college admission pdf too large',
  'study abroad application pdf too big',

  // 简历场景
  'resume pdf too large',
  'job application pdf too big',
  'cv pdf size limit',
  'recruitment pdf upload failed',

  // 合同场景
  'contract pdf too large to send',
  'agreement pdf file size limit',
  'legal document pdf too big',

  // 考试报名场景
  'exam registration pdf too large',
  'test registration file size limit',
  'enrollment pdf upload failed',

  // 微信/移动端场景
  'pdf too large for wechat',
  'pdf too large for mobile upload',
  'compress pdf for phone',

  // 通用问题
  'how to reduce pdf file size',
  'why is my pdf file so large',
  'pdf file size limit by platform'
];

// 简单评分模型
function score(keyword) {
  let s = 0;
  const lower = keyword.toLowerCase();

  // 基础词权重
  if (lower.includes('pdf')) s += 2;
  if (lower.includes('compress')) s += 5;
  if (lower.includes('reduce')) s += 4;

  // 高意图词权重
  if (lower.includes('upload')) s += 5;
  if (lower.includes('upload failed')) s += 6;
  if (lower.includes('cannot upload')) s += 6;
  if (lower.includes('too large')) s += 5;
  if (lower.includes('too big')) s += 5;

  // 场景词权重
  if (lower.includes('visa')) s += 5;
  if (lower.includes('school')) s += 5;
  if (lower.includes('university')) s += 5;
  if (lower.includes('resume')) s += 5;
  if (lower.includes('job')) s += 4;
  if (lower.includes('contract')) s += 4;
  if (lower.includes('exam')) s += 4;
  if (lower.includes('wechat')) s += 4;
  if (lower.includes('email')) s += 3;

  // 免费词加分
  if (lower.includes('free')) s += 2;
  if (lower.includes('online')) s += 1;

  // 问句形式加分
  if (lower.startsWith('how') || lower.startsWith('why') || lower.startsWith('what')) {
    s += 2;
  }

  return s;
}

// 主程序
function main() {
  log('Starting keyword engine...');

  // 评分并排序
  const ranked = baseKeywords
    .map(kw => ({
      kw,
      score: score(kw),
      slug: slugify(kw)
    }))
    .sort((a, b) => b.score - a.score);

  // 输出到 data/keywords.json
  const outputPath = path.join(__dirname, '..', 'data', 'keywords.json');

  try {
    fs.writeFileSync(outputPath, JSON.stringify(ranked, null, 2));
    success(`Generated ${ranked.length} keywords → data/keywords.json`);

    // 显示 Top 10
    console.log('\n🏆 Top 10 Keywords:');
    ranked.slice(0, 10).forEach((k, i) => {
      console.log(`  ${i+1}. [${k.score}分] ${k.kw}`);
    });

  } catch (e) {
    error(`Failed to write keywords.json: ${e.message}`);
    process.exit(1);
  }
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

main();
