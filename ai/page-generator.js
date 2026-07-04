#!/usr/bin/env node
/**
 * V6 Page Generator - AI-powered SEO page generator
 * 
 * Phase 2: 读取 top_keywords.json → 生成SEO页面 → 输出到项目根目录
 * 
 * 用法: node ai/page-generator.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const KEYWORDS_FILE = join(BASE, 'data', 'top_keywords.json');

// ─── 模板 ──────────────────────────────────────────
const NAV = `<header class="bg-white shadow-soft sticky top-0 z-50">
<nav class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="flex h-16 items-center justify-between">
<a class="flex items-center gap-2 text-xl font-semibold text-primary" href="index.html">
<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
pdftool.work
</a>
<div class="hidden xl:flex items-center gap-1">
<a class="mobile-nav-link" href="upload-ready.html">材料上传助手</a>
<a class="mobile-nav-link" href="compress.html">PDF压缩</a>
<a class="mobile-nav-link" href="merge.html">PDF合并</a>
<a class="mobile-nav-link" href="split.html">PDF分割</a>
<a class="mobile-nav-link" href="pdf-tools.html">工具箱</a>
<a class="mobile-nav-link" href="services.html">人工服务</a>
</div>
</div>
</nav>
</header>`;

const FOOTER = `<footer class="bg-slate-950 text-slate-400 py-12 mt-auto">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="text-center text-sm">
<p>© 2026 pdftool.work — 免费在线PDF工具</p>
</div>
</div>
</footer>`;

// ─── URL-safe slug ─────────────────────────────────
function slugify(text) {
  return text.toLowerCase()
    .replace(/[\s,]+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

// ─── 推断页面元数据 ─────────────────────────────────
function inferMeta(keyword, category) {
  const lower = keyword.toLowerCase();
  
  // 推断痛点描述
  let pain = '';
  if (/too.?large|太大/.test(lower)) pain = '文件体积太大，无法满足平台限制';
  else if (/upload.?fail|上传失败/.test(lower)) pain = '上传时遇到技术问题导致提交失败';
  else if (/cannot|无法/.test(lower)) pain = '操作被限制，无法完成预期任务';
  else if (/compress|压缩/.test(lower)) pain = '文件体积占用过多存储和传输资源';
  else pain = 'PDF文件使用过程中遇到技术障碍';
  
  // 推断解决方案
  let solution = '使用pdftool.work免费在线处理，全程浏览器本地完成';
  
  // 推断工具名
  let tool = '材料上传助手';
  if (/compress|压缩/.test(lower)) tool = 'PDF压缩工具';
  else if (/merge|合并/.test(lower)) tool = 'PDF合并工具';
  else if (/split|分割/.test(lower)) tool = 'PDF分割工具';
  else if (/rotate|旋转/.test(lower)) tool = 'PDF旋转工具';
  else if (/unlock|解锁/.test(lower)) tool = 'PDF解锁工具';
  else if (/convert|转换/.test(lower)) tool = '格式转换工具';
  
  // 推断CTA
  let cta = '立即处理';
  if (/visa|签证/.test(lower)) cta = '处理签证材料';
  else if (/resume|简历|job|求职/.test(lower)) cta = '优化简历PDF';
  else if (/school|university|留学/.test(lower)) cta = '处理申请材料';
  else if (/contract|合同/.test(lower)) cta = '处理合同文件';
  
  return { pain, solution, tool, cta };
}

// ─── 生成FAQ ───────────────────────────────────────
function generateFAQ(keyword) {
  const lower = keyword.toLowerCase();
  
  const faqs = [
    [`${keyword}是什么问题？`, `在日常办公和学习中，PDF文件因为包含高清图片、扫描件或嵌入字体，导致体积过大，超出平台上传限制。`],
    [`如何解决${keyword}？`, `使用pdftool.work免费在线处理。上传文件后选择对应工具，全程在浏览器本地完成，无需等待上传下载。`],
    [`处理后文件安全吗？`, `完全安全。文件仅在浏览器本地处理，不会上传到任何服务器。关闭页面后文件自动从内存清除。`],
    [`手机能处理吗？`, `可以。在手机浏览器打开pdftool.work即可使用全部功能，无需下载App。`],
    [`收费吗？`, `基础功能完全免费。如果自动工具无法满足需求，可以选择人工处理服务（¥29起）。`],
  ];
  
  return faqs;
}

// ─── 推断类别 ───────────────────────────────────────
function inferCategory(keyword) {
  const lower = keyword.toLowerCase();
  if (/pain|太大|失败|cannot|无法|too.?large|upload.?fail/.test(lower)) return 'pain';
  if (/compress|reduce|how.*to/.test(lower)) return 'action';
  if (/visa|job|resume|school|university|contract|certificate|exam|wechat|email/.test(lower)) return 'scenario';
  if (/merge|split|rotate|convert|unlock/.test(lower)) return 'tools';
  return 'content';
}

// ─── 生成SEO页面 ────────────────────────────────────
function generatePage(kwObj) {
  const { keyword } = kwObj;
  const category = inferCategory(keyword);
  const { pain, solution, tool, cta } = inferMeta(keyword, category);
  const faqs = generateFAQ(keyword);
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(keyword);
  const filename = `seo-${category}-${slug}.html`;
  
  const title = `${keyword}？免费在线解决方法 | pdftool.work`;
  const description = `免费在线处理${keyword}问题。${solution}，无需注册，快速、安全、免费。`;
  
  const faqItems = faqs.map(([q, a]) => `
    <div class="card FAQItem">
      <h3 class="faq-q text-lg font-medium cursor-pointer">${q}</h3>
      <div class="faq-a text-slate-600 text-sm leading-relaxed hidden">${a}</div>
    </div>`).join('\n');
  
  const schemaFAQ = faqs.map(([q, a]) => `,
    {
      "@type": "Question",
      "name": "${q}",
      "acceptedAnswer": { "@type": "Answer", "text": "${a}" }
    }`).join('\n');
  
  return {
    filename,
    html: `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3GQPKP7FYH"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','G-3GQPKP7FYH');
</script>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<meta name="description" content="${description}"/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="https://pdftool.work/${filename}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${description}"/>
<meta property="og:url" content="https://pdftool.work/${filename}"/>
<link rel="stylesheet" href="assets/css/tailwind.min.css"/>
<link rel="stylesheet" href="assets/css/styles.css"/>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2913395948188969" crossorigin="anonymous"></script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [${schemaFAQ}
  ]
}
</script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans">
${NAV}
<main>
<section class="border-b border-slate-100" data-ad-container>
<div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
<ins class="adsbygoogle ad-unit" style="display:block" data-ad-client="ca-pub-2913395948188969" data-ad-slot="6363231932" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>
</section>

<section class="hero-surface">
<div class="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-20">
<div class="max-w-3xl">
<h1 class="text-4xl font-semibold text-slate-950 sm:text-5xl">${keyword}？</h1>
<p class="mt-6 text-lg text-slate-600">${description}</p>
<div class="mt-8 flex flex-col gap-3 sm:flex-row">
<a class="btn btn-primary btn-lg" href="upload-ready.html">${cta} →</a>
<a class="btn btn-quiet btn-lg" href="compress.html">查看压缩工具</a>
</div>
</div>
</div>
</section>

<section class="section">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="section-heading"><h2>为什么会出现这个问题？</h2></div>
<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
<div class="card">
<h3 class="font-semibold text-lg mb-2">📄 文件体积过大</h3>
<p class="text-slate-600 text-sm">PDF包含高清图片、扫描件或嵌入字体，导致文件体积超出平台限制。</p>
</div>
<div class="card">
<h3 class="font-semibold text-lg mb-2">🖼️ 图片分辨率过高</h3>
<p class="text-slate-600 text-sm">扫描仪或高清相机生成的PDF，每个页面占用大量存储空间。</p>
</div>
<div class="card">
<h3 class="font-semibold text-lg mb-2">🔤 字体嵌入重复</h3>
<p class="text-slate-600 text-sm">PDF中重复嵌入相同字体，文件体积进一步膨胀。</p>
</div>
</div>
</div>
</section>

<section class="bg-white py-16">
<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
<div class="text-center mb-10">
<h2 class="text-3xl font-semibold text-slate-950">3步解决问题</h2>
</div>
<div class="grid gap-8 md:grid-cols-3">
<div class="text-center">
<div class="text-4xl mb-4">📤</div>
<h3 class="text-xl font-semibold mb-2">上传文件</h3>
<p class="text-slate-600 text-sm">点击按钮上传PDF，浏览器本地处理，无需等待。</p>
</div>
<div class="text-center">
<div class="text-4xl mb-4">⚡</div>
<h3 class="text-xl font-semibold mb-2">智能处理</h3>
<p class="text-slate-600 text-sm">系统自动分析并应用最优处理方案。</p>
</div>
<div class="text-center">
<div class="text-4xl mb-4">✅</div>
<h3 class="text-xl font-semibold mb-2">下载使用</h3>
<p class="text-slate-600 text-sm">处理完成直接下载，无需注册。</p>
</div>
</div>
<div class="mt-8 text-center">
<a href="upload-ready.html" class="btn btn-primary">立即开始 →</a>
</div>
</div>
</section>

<section class="section">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="section-heading"><h2>推荐工具</h2></div>
<div class="mt-10 grid gap-6 sm:grid-cols-3">
<a href="upload-ready.html" class="card hover:shadow-card-hover transition-shadow cursor-pointer block">
<h3 class="font-semibold text-lg">📄 材料上传助手</h3>
<p class="text-slate-600 text-sm mt-2">智能压缩到指定大小</p><span class="tool-link mt-3">立即使用 →</span>
</a>
<a href="compress.html" class="card hover:shadow-card-hover transition-shadow cursor-pointer block">
<h3 class="font-semibold text-lg">🗜️ PDF压缩工具</h3>
<p class="text-slate-600 text-sm mt-2">多种压缩级别可选</p><span class="tool-link mt-3">立即使用 →</span>
</a>
<a href="services.html" class="card hover:shadow-card-hover transition-shadow cursor-pointer block">
<h3 class="font-semibold text-lg">💼 人工处理服务</h3>
<p class="text-slate-600 text-sm mt-2">自动工具无法处理？专业人员帮您</p><span class="tool-link mt-3">了解详情 →</span>
</a>
</div>
</div>
</section>

<section class="mx-auto max-w-7xl px-4 py-6" data-ad-container>
<ins class="adsbygoogle ad-unit" style="display:block" data-ad-client="ca-pub-2913395948188969" data-ad-slot="6363231932" data-ad-format="auto" data-full-width-responsive="true"></ins>
</section>

<section class="section bg-slate-50">
<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
<div class="section-heading"><h2>常见问题</h2></div>
<div class="mt-8 space-y-4">${faqItems}
</div>
</div>
</section>

<div class="max-w-4xl mx-auto px-4 pb-8">
<div class="p-4 bg-slate-50 rounded-lg">
<p class="text-sm text-slate-600 mb-2">相关工具：</p>
<div class="flex flex-wrap gap-3">
<a href="upload-ready.html" class="text-primary hover:underline text-sm">📄 材料上传助手</a>
<a href="compress.html" class="text-primary hover:underline text-sm">🗜️ PDF压缩</a>
<a href="merge.html" class="text-primary hover:underline text-sm">📑 PDF合并</a>
<a href="pdf-tools.html" class="text-primary hover:underline text-sm">🧰 更多工具</a>
<a href="services.html" class="text-primary hover:underline text-sm">💼 人工服务</a>
</div>
</div>
</div>
</main>
${FOOTER}
<script>
document.addEventListener('DOMContentLoaded',function(){
[].forEach.call(document.querySelectorAll('.FAQItem'),function(item){
var q=item.querySelector('.faq-q');
var a=item.querySelector('.faq-a');
if(q&&a){q.addEventListener('click',function(){a.classList.toggle('hidden');});q.style.cursor='pointer';}
});
});
</script>
</body>
</html>`
  };
}

// ─── 主程序 ────────────────────────────────────────
function main() {
  console.log('🤖 V6 Page Generator - Phase 2\n');
  
  if (!existsSync(KEYWORDS_FILE)) {
    console.log('❌ top_keywords.json not found. Run keyword-engine.js first.');
    process.exit(1);
  }
  
  const keywords = JSON.parse(readFileSync(KEYWORDS_FILE, 'utf-8'));
  console.log(`📦 读取关键词: ${keywords.length}个\n`);
  
  // 检查已存在的页面
  const existing = new Set(
    readdirSync(BASE)
      .filter(f => f.startsWith('seo-') && f.endsWith('.html'))
  );
  
  const created = [];
  const skipped = [];
  
  for (const kwObj of keywords) {
    const { filename } = generatePage(kwObj);
    
    // 跳过已存在
    if (existing.has(filename)) {
      skipped.push(filename);
      continue;
    }
    
    const { html } = generatePage(kwObj);
    writeFileSync(join(BASE, filename), html, 'utf-8');
    created.push({ filename, keyword: kwObj.keyword, score: kwObj.score });
  }
  
  console.log(`✅ 新生成: ${created.length}个页面`);
  console.log(`⏭️  跳过(已存在): ${skipped.length}个\n`);
  
  if (created.length > 0) {
    console.log('🏆 本次新增:');
    created.slice(0, 15).forEach(p => {
      console.log(`  [${p.score}分] ${p.filename}`);
    });
    if (created.length > 15) console.log(`  ... 还有${created.length - 15}个`);
  }
  
  return { created, skipped };
}

main();
