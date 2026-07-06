/**
 * V7-Safe Keyword Source
 *
 * 关键词来源 - 第一阶段只读取 keyword-seeds.json
 * 后续可接入 Search Console 查询词
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const KEYWORD_SEEDS_FILE = join(BASE, 'data', 'keyword-seeds.json');

function loadKeywordSeeds() {
  if (!existsSync(KEYWORD_SEEDS_FILE)) {
    console.log('⚠️  keyword-seeds.json not found, using defaults');
    return [
      'pdf too large upload failed',
      'compress pdf to 200kb',
      'pdf file too big for email',
      'visa pdf size too large',
      'school application pdf too big'
    ];
  }

  try {
    const data = JSON.parse(readFileSync(KEYWORD_SEEDS_FILE, 'utf-8'));
    return Array.isArray(data) ? data : data.keywords || [];
  } catch (e) {
    console.log('⚠️  Error reading keyword-seeds.json:', e.message);
    return [];
  }
}

function getKeywords() {
  const seeds = loadKeywordSeeds();
  console.log(`📦 Loaded ${seeds.length} keyword seeds`);
  return seeds;
}

export { getKeywords, loadKeywordSeeds };
