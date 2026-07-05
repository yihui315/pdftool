/**
 * V7-Safe Page Drafter
 * 
 * 只生成 drafts/seo/*.html，不直接发布到根目录
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const DRAFTS_DIR = join(BASE, 'drafts', 'seo');
const KEYWORD_SEEDS_FILE = join(BASE, 'data', 'keyword-seeds.json');

// 确保目录存在
if (!existsSync(DRAFTS_DIR)) {
  mkdirSync(DRAFTS_DIR, { recursive: true });
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function generatePage(keyword) {
  const slug = slugify(keyword);
  const filename = `${slug}.html`;
  
  const template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${keyword} - Free PDF Tool | pdftool.work</title>
<meta name="description" content="Free online tool to fix ${keyword}. Browser-based processing, no upload required.">
<meta name="robots" content="index, follow">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3GQPKP7FYH"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-3GQPKP7FYH');
</script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 900px; margin: 0 auto; padding: 20px; }
header { background: #fff; padding: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
h1 { font-size: 2rem; color: #1e40af; margin-bottom: 20px; }
.card { background: #fff; padding: 30px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.btn { display: inline-block; background: #2563eb; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; }
.btn:hover { background: #1d4ed8; }
.faq details { margin: 10px 0; padding: 10px; background: #f8fafc; border-radius: 4px; }
.faq summary { font-weight: 600; cursor: pointer; }
.related { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
.related a { background: #e0e7ff; color: #3730a3; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-size: 0.9rem; }
footer { text-align: center; padding: 20px; color: #666; font-size: 0.9rem; }
</style>
</head>
<body>
<header>
<div class="container">
<h1>📄 pdftool.work - Free PDF Tool</h1>
</div>
</header>

<main class="container">
<div class="card">
<h1>${keyword}</h1>
<p>Free online tool to solve: <strong>${keyword}</strong></p>
<div style="margin: 30px 0;">
<a href="/upload-ready.html" class="btn">Try Now - It's Free →</a>
</div>
</div>

<div class="card">
<h2>Why Does This Happen?</h2>
<p>Large PDF files cause upload failures because platforms have strict file size limits. Common limits: Visa (2MB), Schools (5-10MB), Job portals (1-5MB).</p>
</div>

<div class="card">
<h2>How to Fix It (3 Steps)</h2>
<ol>
<li><strong>Upload your PDF file</strong> - Drag & drop or click to select</li>
<li><strong>Auto-compress</strong> - Our tool automatically optimizes file size</li>
<li><strong>Download result</strong> - Get your compressed PDF instantly</li>
</ol>
</div>

<div class="card">
<h2>Frequently Asked Questions</h2>
<div class="faq">
<details><summary>Is this completely free?</summary><p>Yes, basic compression is completely free.</p></details>
<details><summary>Is my file safe?</summary><p>Yes! All processing happens in your browser. Files never leave your device.</p></details>
<details><summary>What quality can I expect?</summary><p>You can choose compression level. "Strong" mode ensures smallest file size.</p></details>
</div>
</div>

<div class="card">
<h2>Related Tools</h2>
<div class="related">
<a href="/compress.html">PDF Compress</a>
<a href="/merge.html">PDF Merge</a>
<a href="/split.html">PDF Split</a>
<a href="/upload-ready.html">Material Upload Helper</a>
<a href="/services.html">Get Help</a>
<a href="/privacy.html">Privacy Policy</a>
</div>
</div>
</main>

<footer>
<p>© ${new Date().getFullYear()} pdftool.work - Free online PDF tools</p>
</footer>
</body>
</html>`;
  
  return { filename, content: template };
}

function main() {
  console.log('📝 V7-Safe Page Drafter Started\n');
  
  // 读取关键词
  let keywords = [];
  if (existsSync(KEYWORD_SEEDS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(KEYWORD_SEEDS_FILE, 'utf-8'));
      keywords = Array.isArray(data) ? data : data.keywords || [];
    } catch (e) {
      console.log('⚠️  Error reading keyword-seeds.json:', e.message);
    }
  }
  
  if (keywords.length === 0) {
    console.log('⚠️  No keywords found in keyword-seeds.json');
    console.log('💡 Add keywords to data/keyword-seeds.json');
    return;
  }
  
  console.log(`📦 Found ${keywords.length} keywords\n`);
  
  let created = 0;
  for (const keyword of keywords) {
    const { filename, content } = generatePage(keyword);
    const filepath = join(DRAFTS_DIR, filename);
    
    if (!existsSync(filepath)) {
      writeFileSync(filepath, content);
      created++;
      console.log(`   + ${filename}`);
    }
  }
  
  console.log(`\n✅ Drafts generated: ${created} new pages`);
  console.log(`📁 Output: drafts/seo/`);
  console.log('\n💡 Next: Run quality-gate.js to review and publish');
}

main();
