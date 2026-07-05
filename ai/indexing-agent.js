#!/usr/bin/env node
/**
 * V6 Indexing Agent - 自动提交URL到搜索引擎
 * 
 * Phase 4: 从sitemap提取新URL → 提交到IndexNow + Google
 * 
 * 用法: node ai/indexing-agent.js
 */

import { readFileSync } from 'fs';
import https from 'https';
import http from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const INDEXNOW_HOST = 'pdftool.work';
const SITEMAP_URL = 'https://pdftool.work/sitemap.xml';

if (!INDEXNOW_KEY) {
  console.error('❌ INDEXNOW_KEY environment variable is not set.');
  console.error('   Please set it before running: export INDEXNOW_KEY="your-key"');
  process.exit(1);
}

function httpGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function submitIndexNow(urls) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      urlList: urls,
    });
    
    const options = {
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    };
    
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('🔍 V6 Indexing Agent - Phase 4\n');
  
  // Step 1: 获取sitemap
  console.log('1️⃣ Fetching sitemap...');
  let sitemapBody;
  try {
    const res = await httpGet(SITEMAP_URL);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    sitemapBody = res.body;
    const urlCount = (sitemapBody.match(/<loc>/g) || []).length;
    console.log(`✅ Fetched sitemap: ${urlCount} URLs`);
  } catch(e) {
    console.log(`⚠️  Fetch sitemap failed: ${e.message}, using local file`);
    try {
      sitemapBody = readFileSync(join(BASE, 'sitemap.xml'), 'utf-8');
    } catch(e2) {
      console.log('❌ Cannot get sitemap at all');
      process.exit(1);
    }
  }
  
  // Step 2: 提取所有URL
  const locMatches = [...sitemapBody.matchAll(/<loc>(.*?)<\/loc>/g)];
  const allUrls = locMatches.map(m => m[1]);
  console.log(`📦 Total URLs in sitemap: ${allUrls.length}\n`);
  
  // Step 3: 分类URL
  const newUrls = allUrls.filter(u => 
    u.includes('seo-action') || u.includes('seo-scenario') || 
    u.includes('seo-pain') || u.includes('seo-content') ||
    u.includes('seo-tools') || u.includes('guide-') ||
    u.includes('/en/')
  );
  
  console.log(`🎯 New SEO URLs to submit: ${newUrls.length}`);
  
  if (newUrls.length === 0) {
    console.log('✅ All URLs already submitted previously');
    return;
  }
  
  // Step 4: 分批提交IndexNow
  const BATCH = 50;
  console.log('\n2️⃣ Submitting to IndexNow...\n');
  
  const batches = [];
  for (let i = 0; i < newUrls.length; i += BATCH) {
    batches.push(newUrls.slice(i, i + BATCH));
  }
  
  let successCount = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const result = await submitIndexNow(batch);
      if (result.status === 200 || result.status === 202) {
        successCount += batch.length;
        console.log(`  Batch ${i+1}/${batches.length}: ✅ ${batch.length} URLs (HTTP ${result.status})`);
      } else {
        console.log(`  Batch ${i+1}/${batches.length}: ❌ HTTP ${result.status} - ${result.body}`);
      }
    } catch(e) {
      console.log(`  Batch ${i+1}/${batches.length}: ❌ ${e.message}`);
    }
  }
  
  console.log(`\n🎉 Indexing Agent 完成！`);
  console.log(`✅ 成功提交: ${successCount}/${newUrls.length} URLs`);
  console.log(`\n💡 注意: Google通常在24-48小时内处理IndexNow提交`);
  console.log(`   Bing通过IndexNow自动同步`);
  console.log(`   如需手动提交，请访问:`);
  console.log(`   - Google: https://search.google.com/search-console`);
  console.log(`   - Bing: https://www.bing.com/webmaster`);
  
  return { submitted: successCount, total: newUrls.length };
}

main().catch(console.error);
