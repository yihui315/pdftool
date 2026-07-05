/**
 * V7.1 Page Generator - 简化版SEO页面生成器
 * 
 * 用法: node ai-system/page-generator.js
 */

const fs = require('fs');
const path = require('path');
const { log, success, error } = require('./utils');

// 读取关键词
const keywordsPath = path.join(__dirname, '..', 'data', 'keywords.json');

function loadKeywords() {
  try {
    return JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
  } catch (e) {
    error(`Cannot load keywords.json: ${e.message}`);
    error('Please run keyword-engine.js first');
    process.exit(1);
  }
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

// SEO页面模板
function pageTemplate(keyword) {
  const today = new Date().toISOString().split('T')[0];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${keyword.kw} - Free PDF Tool | pdftool.work</title>
<meta name="description" content="Free online tool to fix ${keyword.kw}. No upload required, process locally in browser.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://pdftool.work/${keyword.slug}.html">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3GQPKP7FYH"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-3GQPKP7FYH');
</script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
.container { max-width: 900px; margin: 0 auto; padding: 20px; }
header { background: #fff; padding: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
header h1 { color: #2563eb; }
main { background: #fff; padding: 40px 20px; margin: 20px 0; border-radius: 8px; }
h1 { font-size: 2rem; margin-bottom: 20px; color: #1e40af; }
h2 { font-size: 1.5rem; margin: 30px 0 15px; color: #1e40af; }
p { margin-bottom: 15px; }
.tool-box { background: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
.tool-box a { display: inline-block; background: #2563eb; color: #fff; padding: 15px 40px; border-radius: 6px; text-decoration: none; font-size: 1.2rem; font-weight: 600; }
.tool-box a:hover { background: #1d4ed8; }
.why-box { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
.steps { counter-reset: step; }
.steps li { list-style: none; padding: 10px 0; position: relative; padding-left: 40px; }
.steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; width: 28px; height: 28px; background: #2563eb; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; }
.faq details { margin: 10px 0; padding: 10px; background: #f8fafc; border-radius: 4px; cursor: pointer; }
.faq summary { font-weight: 600; cursor: pointer; }
.related { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px; }
.related a { background: #e0e7ff; color: #3730a3; padding: 10px 20px; border-radius: 20px; text-decoration: none; font-size: 0.9rem; }
.related a:hover { background: #c7d2fe; }
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
<h1>${keyword.kw}</h1>

<div class="tool-box">
<p><strong>Free online tool to solve this problem</strong></p>
<a href="/upload-ready.html">Fix Now - It's Free →</a>
</div>

<h2>Why Does This Happen?</h2>
<div class="why-box">
<p>Large PDF files cause upload failures because platforms have strict file size limits. Common limits:</p>
<ul>
<li><strong>Visa/Immigration:</strong> Usually 2MB max</li>
<li><strong>Schools/Universities:</strong> Usually 5-10MB</li>
<li><strong>Job Portals:</strong> Usually 1-5MB</li>
<li><strong>Email Attachments:</strong> Usually 10-25MB</li>
</ul>
</div>

<h2>How to Fix It (3 Steps)</h2>
<ol class="steps">
<li><strong>Upload your PDF file</strong> - Drag & drop or click to select</li>
<li><strong>Auto-compress</strong> - Our tool automatically optimizes file size</li>
<li><strong>Download result</strong> - Get your compressed PDF instantly</li>
</ol>

<h2>Frequently Asked Questions</h2>
<div class="faq">
<details>
<summary>Is this completely free?</summary>
<p>Yes, basic compression is completely free with no limits.</p>
</details>
<details>
<summary>Is my file safe?</summary>
<p>Yes! All processing happens in your browser. Files never leave your device.</p>
</details>
<details>
<summary>What quality can I expect?</summary>
<p>You can choose compression level. "Strong" mode may reduce quality slightly but ensures smallest file size.</p>
</details>
<details>
<summary>What file formats are supported?</summary>
<p>Currently supports PDF files up to 100MB.</p>
</details>
</div>

<h2>Related Tools</h2>
<div class="related">
<a href="/compress.html">PDF Compress</a>
<a href="/merge.html">PDF Merge</a>
<a href="/split.html">PDF Split</a>
<a href="/upload-ready.html">Material Upload Helper</a>
<a href="/services.html">Get Help</a>
</div>
</main>

<footer>
<p>© ${new Date().getFullYear()} pdftool.work - Free online PDF tools</p>
</footer>

<script>
// Simple FAQ accordion
document.querySelectorAll('.faq details').forEach(detail => {
  detail.addEventListener('toggle', () => {
    if (detail.open) {
      document.querySelectorAll('.faq details[open]').forEach(d => {
        if (d !== detail) d.open = false;
      });
    }
  });
});
</script>
</body>
</html>`;
}

// 主程序
function main() {
  log('Starting page generator...');
  
  const keywords = loadKeywords();
  const outputDir = path.join(__dirname, '..', 'seo-pages', 'auto');
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 统计
  let created = 0;
  let skipped = 0;
  
  keywords.forEach(keyword => {
    const filename = `${keyword.slug}.html`;
    const filepath = path.join(outputDir, filename);
    
    // 检查是否已存在
    if (fs.existsSync(filepath)) {
      skipped++;
      return;
    }
    
    // 生成页面
    fs.writeFileSync(filepath, pageTemplate(keyword));
    created++;
  });
  
  success(`Pages generated: ${created} new, ${skipped} skipped`);
  console.log(`📁 Output: seo-pages/auto/ (${keywords.length} keywords)`);
}

main();
