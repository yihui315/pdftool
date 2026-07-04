#!/usr/bin/env python3
"""
V3 SEO Page Generator
自动读取 keywords.json，生成SEO落地页，更新sitemap
用法: python3 scripts/generate_seo_pages.py
"""
import os, json, re
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
SEO_DIR = BASE_DIR
KEYWORDS_FILE = os.path.join(SEO_DIR, "seo", "keywords.json")
SITEMAP_FILE = os.path.join(BASE_DIR, "sitemap.xml")

# 参考模板
TEMPLATE_FILE = os.path.join(BASE_DIR, "pdf-too-large-upload-failed.html")

NAV = '''<header class="bg-white shadow-soft sticky top-0 z-50">
<nav class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="主导航">
<div class="flex h-16 items-center justify-between">
<a class="flex items-center gap-2 text-xl font-semibold text-primary" href="index.html">
<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
pdftool.work
</a>
<div class="hidden xl:flex items-center gap-1">
<a class="mobile-nav-link" href="upload-ready.html">材料上传助手</a>
<a class="mobile-nav-link" href="merge.html">PDF合并</a>
<a class="mobile-nav-link" href="split.html">PDF分割</a>
<a class="mobile-nav-link" href="manage.html">页面管理</a>
<a class="mobile-nav-link" href="compress.html">PDF压缩</a>
<a class="mobile-nav-link" href="pdf-to-jpg.html">PDF转图片</a>
<a class="mobile-nav-link" href="jpg-to-pdf.html">图片转PDF</a>
<a class="mobile-nav-link" href="pdf-rotate.html">PDF旋转</a>
<a class="mobile-nav-link" href="pdf-unlock.html">PDF解锁</a>
<a class="mobile-nav-link" href="about.html">关于我们</a>
</div>
<button class="xl:hidden p-2 rounded-lg hover:bg-slate-100" aria-label="打开导航菜单" data-menu-toggle aria-expanded="false" aria-controls="mobile-menu">
<svg class="h-5 w-5 menu-open" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
<svg class="hidden h-5 w-5 menu-close" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
</button>
</div>
<div id="mobile-menu" class="hidden border-t border-slate-200 bg-white px-4 py-4 shadow-soft xl:hidden">
<div class="mx-auto grid max-w-7xl gap-2">
<a class="mobile-nav-link" href="index.html">首页</a>
<a class="mobile-nav-link" href="upload-ready.html">材料上传助手</a>
<a class="mobile-nav-link" href="merge.html">PDF合并</a>
<a class="mobile-nav-link" href="split.html">PDF分割</a>
<a class="mobile-nav-link" href="manage.html">页面管理</a>
<a class="mobile-nav-link" href="compress.html">PDF压缩</a>
<a class="mobile-nav-link" href="pdf-to-jpg.html">PDF转图片</a>
<a class="mobile-nav-link" href="jpg-to-pdf.html">图片转PDF</a>
<a class="mobile-nav-link" href="pdf-rotate.html">PDF旋转</a>
<a class="mobile-nav-link" href="pdf-unlock.html">PDF解锁</a>
<a class="mobile-nav-link" href="about.html">关于我们</a>
</div>
</div>
</nav>
</header>'''

FOOTER = '''<footer class="bg-slate-950 text-slate-400 py-12 mt-auto">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
<div>
<div class="flex items-center gap-2 text-white font-semibold mb-4">
<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
pdftool.work
</div>
<p class="text-sm">免费在线PDF工具，无需上传，保护隐私。</p>
</div>
<div>
<h3 class="text-white font-semibold mb-4">工具</h3>
<ul class="space-y-2 text-sm">
<li><a class="hover:text-white transition-colors" href="upload-ready.html">材料上传助手</a></li>
<li><a class="hover:text-white transition-colors" href="merge.html">PDF合并</a></li>
<li><a class="hover:text-white transition-colors" href="compress.html">PDF压缩</a></li>
</ul>
</div>
<div>
<h3 class="text-white font-semibold mb-4">资源</h3>
<ul class="space-y-2 text-sm">
<li><a class="hover:text-white transition-colors" href="blog.html">PDF教程</a></li>
<li><a class="hover:text-white transition-colors" href="pdf-tools.html">工具箱</a></li>
<li><a class="hover:text-white transition-colors" href="services.html">人工服务</a></li>
</ul>
</div>
<div>
<h3 class="text-white font-semibold mb-4">关于</h3>
<ul class="space-y-2 text-sm">
<li><a class="hover:text-white transition-colors" href="about.html">关于我们</a></li>
<li><a class="hover:text-white transition-colors" href="privacy.html">隐私政策</a></li>
</ul>
</div>
</div>
<div class="border-t border-slate-800 mt-8 pt-8 text-sm text-center">
<p>© 2026 pdftool.work — 免费在线PDF工具</p>
</div>
</div>
</footer>'''

JS = '''<script src="assets/js/upload-ready.js" type="module"></script>
<script>
document.addEventListener('DOMContentLoaded',function(){
var menuToggle=document.querySelector('[data-menu-toggle]');
var mobileMenu=document.getElementById('mobile-menu');
if(menuToggle&&mobileMenu){
menuToggle.addEventListener('click',function(){
var isOpen=mobileMenu.classList.toggle('hidden');
menuToggle.querySelectorAll('svg').forEach(function(s){s.classList.toggle('hidden');});
menuToggle.setAttribute('aria-expanded',!isOpen);
});
}
[].forEach.call(document.querySelectorAll('.FAQItem'),function(item){
var q=item.querySelector('.faq-q');
var a=item.querySelector('.faq-a');
if(q&&a){q.addEventListener('click',function(){a.classList.toggle('hidden');});q.style.cursor='pointer';}
});
});
</script>
</body>
</html>'''


def slugify(text):
    """中文关键词转URL slug"""
    # 移除非中文内容，转拼音或直接用拼音+数字组合
    text = re.sub(r'[^\w\u4e00-\u9fff]+', '-', text)
    text = re.sub(r'-+', '-', text).strip('-')
    return text[:40] + '.html'


def generate_faq_block(faqs):
    """生成FAQ HTML块"""
    items = []
    for i, (q, a) in enumerate(faqs, 1):
        items.append(f'''<div class="card FAQItem">
<h3 class="faq-q text-lg font-medium">{q}</h3>
<div class="faq-a text-slate-600 text-sm leading-relaxed hidden">{a}</div>
</div>''')
    return '\n'.join(items)


def generate_page(keyword, category, out_filename):
    """为一个关键词生成SEO页面"""
    today = date.today().isoformat()

    faqs = [
        (f"{keyword}是什么？", f"{keyword}是指PDF文件在日常使用中遇到的常见问题。pdftool.work提供免费在线工具，帮助用户快速解决这类问题，无需下载软件，浏览器即可处理。"),
        (f"如何解决{keyword}？", f"访问pdftool.work，使用免费在线工具处理。只需上传文件，系统会自动分析并提供最佳解决方案，全程在浏览器本地完成，文件不会上传到服务器。"),
        (f"{keyword}会影响文件质量吗？", f"pdftool.work采用智能压缩算法，在保证可读性的前提下减小文件体积。压缩后的PDF文字清晰、排版完整，满足大多数使用场景的需求。"),
        (f"手机能处理{keyword}吗？", f"可以。在手机浏览器打开pdftool.work即可使用所有功能，无需下载App。整个处理过程在本地完成，不消耗手机存储空间。"),
        (f"处理需要收费吗？", f"pdftool.work完全免费使用，不限文件大小和使用次数。如果自动工具无法满足需求，还可以选择人工处理服务（¥29起）。"),
    ]

    title = f"{keyword}？免费在线解决方案 | pdftool.work"
    description = f"免费在线处理{keyword}，无需上传软件。pdftool.work提供浏览器端PDF处理工具，支持多种场景，隐私安全，操作简单。"

    html = f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3GQPKP7FYH"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}
gtag('js',new Date());gtag('config','G-3GQPKP7FYH');
</script>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin/>
<link rel="preconnect" href="https://www.google-analytics.com" crossorigin/>
<title>{title}</title>
<meta name="description" content="{description}"/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="https://pdftool.work/{out_filename}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="{title}"/>
<meta property="og:description" content="{description}"/>
<meta property="og:url" content="https://pdftool.work/{out_filename}"/>
<link rel="stylesheet" href="assets/css/tailwind.min.css"/>
<link rel="stylesheet" href="assets/css/styles.css"/>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2913395948188969" crossorigin="anonymous"></script>
<script type="application/ld+json">
{{
  "@context":"https://schema.org",
  "@type":"FAQPage",
  "mainEntity":[
    {{"@type":"Question","name":"{faqs[0][0]}","acceptedAnswer":{{"@type":"Answer","text":"{faqs[0][1]}"}}}},
    {{"@type":"Question","name":"{faqs[1][0]}","acceptedAnswer":{{"@type":"Answer","text":"{faqs[1][1]}"}}}},
    {{"@type":"Question","name":"{faqs[2][0]}","acceptedAnswer":{{"@type":"Answer","text":"{faqs[2][1]}"}}}},
    {{"@type":"Question","name":"{faqs[3][0]}","acceptedAnswer":{{"@type":"Answer","text":"{faqs[3][1]}"}}}},
    {{"@type":"Question","name":"{faqs[4][0]}","acceptedAnswer":{{"@type":"Answer","text":"{faqs[4][1]}"}}}}
  ]
}}
</script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans">
{NAV}
<main id="main">
<section class="border-b border-slate-100" data-ad-container>
<div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8" aria-label="顶部广告位">
<ins class="adsbygoogle ad-unit" style="display:block" data-ad-client="ca-pub-2913395948188969" data-ad-slot="6363231932" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>
</section>
<section class="hero-surface">
<div class="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-20">
<div class="max-w-3xl">
<h1 class="text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-5xl">
{keyword}？
</h1>
<p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
免费在线处理{keyword}问题。pdftool.work提供无需上传的浏览器端工具，快速、安全、免费，帮助您解决日常工作和生活中的PDF难题。
</p>
<div class="mt-8 flex flex-col gap-3 sm:flex-row">
<a class="btn btn-primary btn-lg" href="upload-ready.html">
免费处理{keyword.split('太')[-1] if '太' in keyword else keyword}
<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
</a>
<a class="btn btn-quiet btn-lg" href="compress.html">
查看所有工具
</a>
</div>
</div>
</div>
</section>
<section class="section">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="section-heading">
<h2>为什么会出现这个问题？</h2>
<p>了解{keyword}的常见原因</p>
</div>
<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
<div class="card">
<h3 class="font-semibold text-lg mb-2">📄 文件体积过大</h3>
<p class="text-slate-600 text-sm">PDF包含高清图片、扫描件或嵌入字体，导致文件体积过大，超出平台限制。</p>
</div>
<div class="card">
<h3 class="font-semibold text-lg mb-2">🖼️ 图片分辨率过高</h3>
<p class="text-slate-600 text-sm">直接从扫描仪或高清相机生成的PDF，每个页面占用大量存储空间。</p>
</div>
<div class="card">
<h3 class="font-semibold text-lg mb-2">🔤 字体嵌入重复</h3>
<p class="text-slate-600 text-sm">PDF中重复嵌入相同字体，或者使用了体积较大的中文字体包。</p>
</div>
</div>
</div>
</section>
<section class="bg-white py-16">
<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
<div class="text-center mb-10">
<h2 class="text-3xl font-semibold text-slate-950">如何快速解决？</h2>
<p class="mt-4 text-lg text-slate-600">只需3步，轻松搞定</p>
</div>
<div class="grid gap-8 md:grid-cols-3">
<div class="text-center">
<div class="text-4xl mb-4">📤</div>
<h3 class="text-xl font-semibold mb-2">上传文件</h3>
<p class="text-slate-600 text-sm">点击按钮上传PDF文件，浏览器本地处理，无需等待上传。</p>
</div>
<div class="text-center">
<div class="text-4xl mb-4">⚡</div>
<h3 class="text-xl font-semibold mb-2">自动处理</h3>
<p class="text-slate-600 text-sm">系统智能分析文件内容，自动选择最佳处理方案。</p>
</div>
<div class="text-center">
<div class="text-4xl mb-4">✅</div>
<h3 class="text-xl font-semibold mb-2">下载使用</h3>
<p class="text-slate-600 text-sm">处理完成后直接下载，立即可用，无需注册账号。</p>
</div>
</div>
<div class="mt-8 text-center">
<a href="upload-ready.html" class="btn btn-primary">立即开始处理 →</a>
</div>
</div>
</section>
<section class="section">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="section-heading">
<h2>推荐工具</h2>
<p>根据您的需求选择合适的工具</p>
</div>
<div class="mt-10 grid gap-6 sm:grid-cols-3">
<a href="upload-ready.html" class="card hover:shadow-card-hover transition-shadow cursor-pointer block">
<h3 class="font-semibold text-lg">📄 材料上传助手</h3>
<p class="text-slate-600 text-sm mt-2">智能压缩到指定大小，适合上传限制场景</p>
<span class="tool-link mt-3">立即使用 →</span>
</a>
<a href="compress.html" class="card hover:shadow-card-hover transition-shadow cursor-pointer block">
<h3 class="font-semibold text-lg">🗜️ PDF压缩工具</h3>
<p class="text-slate-600 text-sm mt-2">多种压缩级别可选，平衡文件大小和画质</p>
<span class="tool-link mt-3">立即使用 →</span>
</a>
<a href="services.html" class="card hover:shadow-card-hover transition-shadow cursor-pointer block">
<h3 class="font-semibold text-lg">💼 人工处理服务</h3>
<p class="text-slate-600 text-sm mt-2">自动工具无法处理？专业人员帮您解决</p>
<span class="tool-link mt-3">了解详情 →</span>
</a>
</div>
</div>
</section>
<section class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" aria-label="广告位" data-ad-container>
<ins class="adsbygoogle ad-unit" style="display:block" data-ad-client="ca-pub-2913395948188969" data-ad-slot="6363231932" data-ad-format="auto" data-full-width-responsive="true"></ins>
</section>
<section class="section bg-slate-50">
<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
<div class="section-heading"><h2>常见问题</h2></div>
<div class="mt-8 space-y-4">
{generate_faq_block(faqs)}
</div>
</div>
</section>
<div class="mt-8 p-4 bg-slate-50 rounded-lg">
<p class="text-sm text-slate-600 mb-2">相关工具：</p>
<div class="flex flex-wrap gap-3">
<a href="upload-ready.html" class="text-primary hover:underline text-sm">📄 PDF太大无法上传？</a>
<a href="compress.html" class="text-primary hover:underline text-sm">🗜️ 压缩PDF文件</a>
<a href="pdf-tools.html" class="text-primary hover:underline text-sm">🧰 更多PDF工具</a>
<a href="services.html" class="text-primary hover:underline text-sm">💼 人工处理服务</a>
</div>
</div>
</main>
{FOOTER}
{JS}'''

    return html


def main():
    with open(KEYWORDS_FILE, 'r', encoding='utf-8') as f:
        keywords_data = json.load(f)

    all_keywords = []
    for category, words in keywords_data.items():
        for word in words:
            all_keywords.append((category, word))

    created = []
    sitemap_urls = []

    for category, keyword in all_keywords:
        # 生成文件名：seo-{category}-{slug}.html
        safe_keyword = re.sub(r'[^\w\u4e00-\u9fff]', '-', keyword)
        safe_keyword = re.sub(r'-+', '-', safe_keyword).strip('-')[:30]
        out_filename = f"seo-{category}-{safe_keyword}.html"
        out_path = os.path.join(BASE_DIR, out_filename)

        # 跳过已存在的同名文件（保护已有的高质量页面）
        if os.path.exists(out_path):
            print(f"⏭️  SKIP (exists): {out_filename}")
            sitemap_urls.append(out_filename)
            continue

        html = generate_page(keyword, category, out_filename)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html)
        created.append(out_filename)
        sitemap_urls.append(out_filename)
        print(f"✅ Created: {out_filename}")

    # 更新sitemap
    with open(SITEMAP_FILE, 'r', encoding='utf-8') as f:
        sitemap = f.read()

    today = date.today().isoformat()
    new_urls = '\n  '.join(
        f'<url><loc>https://pdftool.work/{u}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>'
        for u in sitemap_urls
    )
    sitemap_new = sitemap.replace('</urlset>', f'  {new_urls}\n</urlset>')
    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        f.write(sitemap_new)

    print(f"\n✅ V3生成完成: {len(created)} 个新页面")
    print(f"   sitemap已更新: {len(sitemap_urls)} 个SEO页面URL")


if __name__ == "__main__":
    main()
