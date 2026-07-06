#!/usr/bin/env node
/**
 * V6 Page Generator v2 - AI-powered SEO page generator
 * 改进：每个页面根据关键词类型生成差异化内容
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const KEYWORDS_FILE = join(BASE, 'data', 'top_keywords.json');

// ─── 导航 ──────────────────────────────────────────
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

// ─── 内容变体库 ──────────────────────────────────────

// WHY section - 不同类别的原因解释
const WHY_EXPLANATIONS = {
  pain: {
    title: '为什么会出现这个问题？',
    reasons: [
      { icon: '📄', title: '文件体积超出平台限制', desc: '各平台（签证、学校、招聘）都有明确的文件大小上限，超出即被拒绝。' },
      { icon: '🖼️', title: '高清图片/扫描件占空间', desc: '扫描仪或高清相机生成的PDF，每个页面占用大量存储空间。' },
      { icon: '🔤', title: '字体嵌入重复', desc: 'PDF中重复嵌入相同字体，导致文件体积进一步膨胀。' },
    ],
  },
  action: {
    title: '为什么需要这个工具？',
    reasons: [
      { icon: '⏰', title: '节省时间和精力', desc: '手动查找教程、下载软件、反复调试，非常耗时。' },
      { icon: '💰', title: '避免付费软件', desc: '专业PDF工具通常需要付费订阅，性价比不高。' },
      { icon: '🔒', title: '保护文件隐私', desc: '使用在线工具担心文件安全，本地处理更放心。' },
    ],
  },
  scenario: {
    title: '这个场景下为什么文件总是太大？',
    reasons: [
      { icon: '📋', title: '官方要求严格', desc: '签证、学校、招聘等平台有严格的大小限制，通常2MB以下。' },
      { icon: '📷', title: '原始文件质量高', desc: '高清扫描件、原始设计稿包含大量未压缩数据。' },
      { icon: '🗂️', title: '多文件合并后超标', desc: '多个文件合并后总体积超过平台限制。' },
    ],
  },
  tools: {
    title: '为什么需要专业工具处理？',
    reasons: [
      { icon: '⚡', title: '在线工具有限制', desc: '通用压缩工具无法针对PDF优化，效果差。' },
      { icon: '🎯', title: '需要保留关键内容', desc: '通用工具可能破坏图片清晰度或排版布局。' },
      { icon: '📊', title: '压缩效果可控制', desc: '专业工具可以平衡文件大小和内容质量。' },
    ],
  },
  content: {
    title: '为什么这个问题经常出现？',
    reasons: [
      { icon: '📱', title: '跨设备传输', desc: '手机、电脑、平板之间传输时容易遇到大小问题。' },
      { icon: '🌐', title: '平台兼容性问题', desc: '不同平台对PDF格式和大小的要求不一致。' },
      { icon: '📧', title: '邮件附件限制', desc: '邮件系统通常限制附件大小在10-25MB。' },
    ],
  },
};

// SOLUTION intro - 不同类别的解决方案引导语
const SOLUTION_INTRO = {
  pain: {
    title: '3步解决问题',
    subtitle: '只需几分钟，让你的文件符合要求',
  },
  action: {
    title: '3步完成操作',
    subtitle: '无需注册，打开浏览器即可使用',
  },
  scenario: {
    title: '3步达到平台要求',
    subtitle: '智能压缩到指定大小，确保一次提交成功',
  },
  tools: {
    title: '3步使用工具',
    subtitle: '专业级处理效果，保留文件原始质量',
  },
  content: {
    title: '3步搞定',
    subtitle: '浏览器本地处理，文件安全不外传',
  },
};

// FAQ answers - 根据场景定制回答
function generateFAQ(keyword, category, meta) {
  const lower = keyword.toLowerCase();
  const isVisa = /visa|签证/.test(lower);
  const isResume = /resume|简历|job|求职|招聘/.test(lower);
  const isSchool = /school|university|留学|申请|报名/.test(lower);
  const isContract = /contract|合同/.test(lower);
  const isCert = /certificate|证书|成绩单|毕业/.test(lower);
  const isExam = /exam|考试|报名/.test(lower);
  const isWechat = /wechat|微信/.test(lower);
  const isEmail = /email|邮件|附件/.test(lower);
  const isMerge = /merge|合并/.test(lower);
  const isSplit = /split|分割/.test(lower);
  const isCompress = /compress|压缩/.test(lower);
  const isUpload = /upload|上传/.test(lower);
  const isRotate = /rotate|旋转/.test(lower);
  const isUnlock = /unlock|解锁|密码/.test(lower);

  const faqs = [];

  // Q1: 是什么问题
  if (isVisa) faqs.push([`${keyword}是什么问题？`, `申请签证时，上传的PDF文件必须符合官方的大小要求（通常2MB以下）。超过限制会导致系统拒绝受理，需要重新调整后才能提交。`]);
  else if (isResume) faqs.push([`${keyword}是什么问题？`, `投递简历时，HR系统对附件大小有限制（通常5MB以下）。PDF包含高清图片或扫描件时很容易超标，导致简历投递失败。`]);
  else if (isSchool) faqs.push([`${keyword}是什么问题？`, `学校申请平台对材料大小有严格要求。超出限制会导致上传失败，影响申请材料的及时提交。`]);
  else if (isContract) faqs.push([`${keyword}是什么问题？`, `合同文件通常包含扫描件或设计图，导致文件过大无法通过审核或邮件发送。`]);
  else if (isCompress) faqs.push([`${keyword}是什么问题？`, `PDF文件包含高清图片、嵌入字体或扫描内容，体积较大，占用存储空间且传输困难。`]);
  else if (isMerge) faqs.push([`${keyword}是什么问题？`, `需要将多个PDF合并为一个文件时，如果分别上传太麻烦，直接合并又可能超出大小限制。`]);
  else if (isSplit) faqs.push([`${keyword}是什么问题？`, `PDF文件页数太多，需要拆分成多个文件，但手动拆分既费时又容易出错。`]);
  else if (isUpload) faqs.push([`${keyword}是什么问题？`, `上传文件时提示失败，通常是因为文件大小超过了平台限制，需要先压缩处理。`]);
  else faqs.push([`${keyword}是什么问题？`, `PDF文件体积超出平台限制，上传时被系统拒绝，需要调整文件大小后才能继续。`]);

  // Q2: 如何解决
  if (isVisa) faqs.push([`如何解决${keyword}？`, `使用pdftool.work的材料上传助手，智能压缩到目标大小，支持签证常见格式，确保一次提交成功。`]);
  else if (isResume) faqs.push([`如何解决${keyword}？`, `使用pdftool.work的简历优化工具，在压缩文件的同时保留排版和文字清晰度，让简历投递更顺畅。`]);
  else if (isSchool) faqs.push([`如何解决${keyword}？`, `使用pdftool.work的申请材料处理工具，批量处理多个文件，确保每个都符合学校要求的大小。`]);
  else if (isContract) faqs.push([`如何解决${keyword}？`, `使用pdftool.work的合同处理工具，智能识别并优化文件内容，在保持合同清晰可读的前提下减小体积。`]);
  else if (isCompress) faqs.push([`如何解决${keyword}？`, `使用pdftool.work的PDF压缩工具，上传后自动选择最优压缩方案，支持多种压缩级别可选。`]);
  else if (isMerge) faqs.push([`如何解决${keyword}？`, `使用pdftool.work的PDF合并工具，将多个文件合并为一个，支持调整页面顺序和删除不需要的页面。`]);
  else if (isSplit) faqs.push([`如何解决${keyword}？`, `使用pdftool.work的PDF分割工具，可以按页面范围或单页拆分，快速得到需要的那部分内容。`]);
  else faqs.push([`如何解决${keyword}？`, `使用pdftool.work免费在线处理。上传文件后，系统自动分析并应用最优处理方案，全程在浏览器本地完成。`]);

  // Q3: 安全吗
  faqs.push([`处理后文件安全吗？`, `完全安全。文件仅在浏览器本地处理，不会上传到任何服务器。处理完成后立即可以下载，关闭页面后文件自动从内存清除。`]);

  // Q4: 手机能用吗
  if (isVisa || isSchool) faqs.push([`手机能处理吗？`, `可以。在手机浏览器打开pdftool.work，材料上传助手针对移动端优化，随时随地处理文件。`]);
  else faqs.push([`手机能处理吗？`, `可以。在手机浏览器打开pdftool.work即可使用全部功能，无需下载App，支持主流移动浏览器。`]);

  // Q5: 收费吗
  faqs.push([`收费吗？`, `基础功能完全免费。如果自动工具无法满足特殊需求，可以选择人工处理服务（¥29起）。`]);

  return faqs;
}

// 推荐工具 - 根据关键词返回最相关的工具
function getRecommendedTools(keyword, category) {
  const lower = keyword.toLowerCase();
  const tools = [
    { href: 'upload-ready.html', icon: '📄', title: '材料上传助手', desc: '智能压缩到指定大小' },
    { href: 'compress.html', icon: '🗜️', title: 'PDF压缩工具', desc: '多种压缩级别可选' },
    { href: 'merge.html', icon: '📑', title: 'PDF合并工具', desc: '合并多个文件为一个' },
    { href: 'split.html', icon: '✂️', title: 'PDF分割工具', desc: '按需拆分页面' },
    { href: 'pdf-rotate.html', icon: '🔄', title: 'PDF旋转工具', desc: '调整页面方向' },
    { href: 'pdf-unlock.html', icon: '🔓', title: 'PDF解锁工具', desc: '移除密码保护' },
    { href: 'pdf-to-jpg.html', icon: '🖼️', title: 'PDF转图片', desc: '导出为图片格式' },
    { href: 'services.html', icon: '💼', title: '人工处理服务', desc: '专业人员帮您处理' },
  ];

  let primary = 'upload-ready.html';
  if (/compress|压缩/.test(lower)) primary = 'compress.html';
  else if (/merge|合并/.test(lower)) primary = 'merge.html';
  else if (/split|分割/.test(lower)) primary = 'split.html';
  else if (/rotate|旋转/.test(lower)) primary = 'pdf-rotate.html';
  else if (/unlock|密码/.test(lower)) primary = 'pdf-unlock.html';
  else if (/convert|转.*图|图片/.test(lower)) primary = 'pdf-to-jpg.html';

  // Sort: primary first, then others
  const sorted = tools.sort((a, b) => {
    if (a.href === primary) return -1;
    if (b.href === primary) return 1;
    return 0;
  });

  return sorted.slice(0, 4); // Return top 4 most relevant tools
}

// ─── URL slug ──────────────────────────────────────
function slugify(text) {
  return text.toLowerCase()
    .replace(/[\s,]+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

// ─── 推断元数据 ─────────────────────────────────────
function inferMeta(keyword, category) {
  const lower = keyword.toLowerCase();

  let pain = '';
  if (/too.?large|太大/.test(lower)) pain = '文件体积太大，无法满足平台限制';
  else if (/upload.?fail|上传失败/.test(lower)) pain = '上传时遇到技术问题导致提交失败';
  else if (/cannot|无法/.test(lower)) pain = '操作被限制，无法完成预期任务';
  else if (/compress|压缩/.test(lower)) pain = '文件体积占用过多存储和传输资源';
  else pain = 'PDF文件使用过程中遇到技术障碍';

  let solution = '使用pdftool.work免费在线处理，全程浏览器本地完成';

  let tool = '材料上传助手';
  if (/compress|压缩/.test(lower)) tool = 'PDF压缩工具';
  else if (/merge|合并/.test(lower)) tool = 'PDF合并工具';
  else if (/split|分割/.test(lower)) tool = 'PDF分割工具';
  else if (/rotate|旋转/.test(lower)) tool = 'PDF旋转工具';
  else if (/unlock|解锁/.test(lower)) tool = 'PDF解锁工具';

  let cta = '立即处理';
  if (/visa|签证/.test(lower)) cta = '处理签证材料';
  else if (/resume|简历|job|求职/.test(lower)) cta = '优化简历PDF';
  else if (/school|university|留学/.test(lower)) cta = '处理申请材料';
  else if (/contract|合同/.test(lower)) cta = '处理合同文件';
  else if (/compress|压缩/.test(lower)) cta = '压缩PDF文件';
  else if (/merge|合并/.test(lower)) cta = '合并PDF文件';
  else if (/split|分割/.test(lower)) cta = '分割PDF文件';

  return { pain, solution, tool, cta };
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
  const meta = inferMeta(keyword, category);
  const faqs = generateFAQ(keyword, category, meta);
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(keyword);
  const filename = `seo-${category}-${slug}.html`;

  const title = `${keyword}？免费在线解决方法 | pdftool.work`;
  const description = `免费在线处理${keyword}问题。${meta.solution}，无需注册，快速、安全、免费。`;

  // Get dynamic content based on category
  const whyData = WHY_EXPLANATIONS[category] || WHY_EXPLANATIONS['content'];
  const solData = SOLUTION_INTRO[category] || SOLUTION_INTRO['content'];
  const recommendedTools = getRecommendedTools(keyword, category);

  // Build FAQ items
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

  // Build tool cards
  const toolCards = recommendedTools.map(t => `
<a href="${t.href}" class="card hover:shadow-card-hover transition-shadow cursor-pointer block">
<h3 class="font-semibold text-lg">${t.icon} ${t.title}</h3>
<p class="text-slate-600 text-sm mt-2">${t.desc}</p><span class="tool-link mt-3">立即使用 →</span>
</a>`).join('\n');

  // Build why section cards
  const whyCards = whyData.reasons.map(r => `
<div class="card">
<h3 class="font-semibold text-lg mb-2">${r.icon} ${r.title}</h3>
<p class="text-slate-600 text-sm">${r.desc}</p>
</div>`).join('\n');

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
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${title}",
  "description": "${description}",
  "datePublished": "${today}",
  "author": { "@type": "WebSite", "name": "pdftool.work" }
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
<div class="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-20">
<div class="max-w-3xl">
<h1 class="text-4xl font-semibold text-slate-950 sm:text-5xl">${keyword}？</h1>
<p class="mt-6 text-lg text-slate-600">${description}</p>
<div class="mt-8 flex flex-col gap-3 sm:flex-row">
<a class="btn btn-primary btn-lg" href="upload-ready.html">${meta.cta} →</a>
<a class="btn btn-quiet btn-lg" href="${recommendedTools[0].href}">查看${recommendedTools[0].title}</a>
</div>
</div>
</div>
</section>

<section class="section">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="section-heading"><h2>${whyData.title}</h2></div>
<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
${whyCards}
</div>
</div>
</section>

<section class="bg-white py-16">
<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
<div class="text-center mb-10">
<h2 class="text-3xl font-semibold text-slate-950">${solData.title}</h2>
<p class="mt-2 text-slate-500">${solData.subtitle}</p>
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
<a href="${recommendedTools[0].href}" class="btn btn-primary">立即开始 →</a>
</div>
</div>
</section>

<section class="section">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="section-heading"><h2>推荐工具</h2></div>
<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
${toolCards}
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
  console.log('🤖 V6 Page Generator v2 - 差异化内容版\n');

  if (!existsSync(KEYWORDS_FILE)) {
    console.log('❌ top_keywords.json not found. Run keyword-engine.js first.');
    process.exit(1);
  }

  const keywords = JSON.parse(readFileSync(KEYWORDS_FILE, 'utf-8'));
  console.log(`📦 读取关键词: ${keywords.length}个\n`);

  const existing = new Set(
    readdirSync(BASE)
      .filter(f => f.startsWith('seo-') && f.endsWith('.html'))
  );

  const created = [];
  const skipped = [];

  for (const kwObj of keywords) {
    const { filename } = generatePage(kwObj);

    if (existing.has(filename)) {
      skipped.push(filename);
      continue;
    }

    const { html } = generatePage(kwObj);
    writeFileSync(join(BASE, filename), html, 'utf-8');
    created.push(filename);
  }

  console.log(`✅ 新生成: ${created.length}个页面`);
  console.log(`⏭️  跳过(已存在): ${skipped.length}个\n`);

  if (created.length > 0) {
    console.log('🏆 本次新增:');
    created.forEach(f => console.log(`  • ${f}`));
  }
}

main();
