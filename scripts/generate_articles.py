#!/usr/bin/env python3
"""
V4 Article Generator - 长文内容页 (800-1200字)
生成 guide-*.html 类型的长尾内容页面
"""
import os, json
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ARTICLES = [
    {
        "filename": "guide-pdf-too-large-complete.html",
        "title": "PDF文件太大怎么办？完整解决方案指南 | pdftool.work",
        "description": "PDF文件太大无法上传、发送或提交？本文详细介绍5种免费解决方案，包括在线压缩、软件压缩、在线工具等多种方法，帮助您彻底解决PDF太大的问题。",
        "h1": "PDF文件太大怎么办？完整解决方案指南",
        "keyword": "PDF太大",
        "content_sections": [
            ("为什么PDF文件会这么大？", "PDF文件体积大的原因主要有三类：1) 包含高清扫描图片，一个A4扫描件可能占用2-5MB；2) 嵌入完整字体文件，特别是中文字体每个可能占用3-5MB；3) 使用了未压缩的图形和矢量元素。了解原因后才能对症下药，高效解决PDF太大的问题。"),
            ("方法一：使用在线压缩工具（最推荐）", "在线压缩是最快捷的解决方案。pdftool.work提供完全免费的在线PDF压缩工具，无需下载安装，上传后选择压缩级别即可。优点：操作简单、处理速度快、完全免费、支持多种压缩级别（200KB/500KB/1MB）。缺点：部分极端大文件可能需要多次压缩。"),
            ("方法二：使用专业PDF软件", "Adobe Acrobat Pro、PdfFactory等专业软件提供更精细的压缩控制。优点：压缩效果更好、可选择性压缩图片质量。缺点：需要付费、软件体积大、安装麻烦。对于频繁处理PDF的用户，专业软件是更好的选择。"),
            ("方法三：使用虚拟打印机转换", "将PDF通过虚拟打印机重新输出为PDF，选择「最小文件大小」或「高质量打印」等预设，可以有效减小文件体积。这种方法适合已经安装了Adobe Reader的用户。"),
            ("方法四：分拆PDF减少单文件大小", "如果PDF包含大量页面，可以考虑将其分割成多个小文件。例如将100页的合同拆分成5个20页的文件，每个文件独立压缩，总体积会更小。pdftool.work提供免费的PDF分割工具。"),
            ("方法五：人工处理服务", "当自动工具无法满足需求时，pdftool.work提供人工处理服务。由专业人员针对您的具体文件情况，采用最优方案进行处理。单文件¥29起，批量处理¥99起，24小时内交付。"),
        ],
        "faq": [
            ("PDF压缩后会影响清晰度吗？", "pdftool.work采用智能压缩算法，在保证可读性的前提下减小文件体积。文字为主的PDF压缩后几乎看不出差别，扫描件可能会有轻微画质下降，但不影响正常使用。"),
            ("压缩后的PDF还能编辑吗？", "压缩后的PDF可以正常阅读、打印和填写。如需完全可编辑，可以使用Adobe Acrobat或专业PDF编辑器。"),
            ("手机能处理PDF太大的问题吗？", "完全可以。在手机浏览器打开pdftool.work，上传文件后选择压缩级别，整个过程在手机本地完成，不需要电脑。"),
            ("为什么压缩后文件反而变大了？", "极少数情况下，压缩后的PDF反而变大，通常是因为原文件已经高度压缩，或包含加密/数字签名。遇到这种情况可以尝试其他压缩级别，或使用人工处理服务。"),
            ("有文件大小限制吗？", "pdftool.work对上传文件大小没有限制，但文件越大处理时间越长。建议超过20MB的文件分拆成多个小文件处理。"),
        ]
    },
    {
        "filename": "guide-visa-pdf-handling.html",
        "title": "签证材料PDF处理攻略 - 材料要求/压缩/格式规范 | pdftool.work",
        "description": "各国签证申请对PDF材料有严格要求：大小限制、格式规范、文件命名等。本文整理美国、英国、申根等主要国家的签证材料要求，以及如何正确处理PDF文件通过审核。",
        "h1": "各国签证材料PDF处理完全攻略",
        "keyword": "签证PDF",
        "content_sections": [
            ("美国签证材料PDF要求", "美国签证（B1/B2/F1等）申请材料通常要求：文件格式为PDF、单文件不超过2MB、文件名只含字母数字。照片需要JPEG格式、文件小于240KB。DS-160表格确认页需要PNG格式。美国签证材料审核严格，建议提前准备并使用专业工具处理。"),
            ("英国签证材料PDF规范", "英国签证（Visitor/Student/T worker）要求：所有材料PDF格式、单文件不超过5MB、不允许加密或密码保护的文件。肺结核检测报告必须使用UKVI指定格式。建议使用pdftool.work压缩到500KB以内，确保上传成功。"),
            ("申根签证材料要求", "申根国家（法国、德国、意大利等）通用要求：文件格式PDF、单文件不超过5MB、材料需要清晰的扫描件。部分国家（如法国）要求文件命名格式为「护照号_材料类型.pdf」。建议提前压缩并统一命名格式。"),
            ("日本签证材料PDF处理", "日本签证申请材料相对简单：单次旅游签证需要行程表、在职证明、资产证明等材料，均接受PDF格式，单文件不超过2MB。日本对材料清晰度要求较高，建议300DPI扫描后适当压缩。"),
            ("压缩签证材料注意事项", "1) 保持清晰度：签证材料对文字清晰度要求高，避免过度压缩；2) 统一文件命名：使用拼音或英文命名，避免中文乱码；3) 检查文件完整性：压缩后确认所有页面都在、内容可读；4) 预留时间：遇到问题可以联系人工处理服务。"),
            ("常见被拒原因及解决方案", "材料PDF常见被拒原因：文件太大无法上传、文件损坏无法打开、图片模糊无法识别、文件格式不符合要求。使用pdftool.work的签证材料专用压缩功能，可以有效避免这些问题，确保一次通过审核。"),
        ],
        "faq": [
            ("签证材料PDF太大无法上传怎么办？", "使用pdftool.work的在线压缩工具，将PDF压缩到1MB以下。如果仍然上传失败，可能是网站本身的技术限制，可以尝试更换浏览器或联系签证中心。"),
            ("签证材料需要彩色还是黑白扫描？", "大多数国家接受黑白扫描件，但照片必须彩色。部分国家（如美国）建议彩色扫描以提高审核通过率。"),
            ("可以用手机拍摄签证材料吗？", "不建议。手机拍摄的图片通常分辨率不足、文字模糊，可能导致审核失败。如必须使用手机拍摄，建议使用专业扫描App，确保300DPI以上的清晰度。"),
            ("多个材料可以合并成一个PDF吗？", "可以，但要注意文件大小限制。建议每个材料单独压缩后，再考虑是否合并。合并后的文件建议压缩到5MB以内。"),
            ("压缩后文件损坏怎么办？", "如果压缩后文件损坏无法打开，可能是压缩级别过高或原文件有问题。可以降低压缩级别重新处理，或使用人工处理服务（¥29起）获得专业帮助。"),
        ]
    },
    {
        "filename": "guide-resume-pdf-optimization.html",
        "title": "简历PDF优化指南 - 压缩/排版/发送技巧 | pdftool.work",
        "description": "简历PDF太大无法发送？排版混乱被HR直接过滤？本文提供完整的简历PDF优化方案，包括文件大小控制、排版规范、邮件发送技巧，助您求职成功。",
        "h1": "简历PDF优化完整指南：让HR一眼看中你的简历",
        "keyword": "简历PDF",
        "content_sections": [
            ("为什么简历PDF太大？", "简历PDF过大的主要原因：1) 直接导出Word文档为PDF，保留了大量冗余格式；2) 嵌入了非必要的字体；3) 包含高清证件照或作品集截图；4) 页面过多（超过2页）。了解原因后才能有针对性地优化。"),
            ("简历PDF最佳文件大小", "根据招聘平台数据，简历PDF建议控制在200KB-1MB之间。太小（<100KB）可能图片质量差，太大（>2MB）可能上传失败或被HR的邮件系统拦截。如果包含作品集，可以单独作为一个附件。"),
            ("如何制作专业的简历PDF？", "1) 使用Word或Pages制作，保持简洁的排版；2) 避免使用特殊字体，优先选择系统自带字体；3) 证件照建议200KB以内，JPEG格式；4) 导出时选择「标准」或「最小文件大小」预设；5) 完成后使用pdftool.work进一步压缩优化。"),
            ("简历排版规范", "专业简历应遵循：1) 统一字体（建议中文用微软雅黑或思源黑体，英文用Arial）；2) 适当留白，不要太拥挤；3) 控制页数（1-2页为宜）；4) 重要信息放在第一页；5) 避免花哨的装饰元素。"),
            ("邮件发送简历的技巧", "1) 邮件主题格式：「姓名-应聘岗位-工作年限」；2) 正文简要说明优势和意向；3) 简历作为附件发送，不要嵌入正文；4) 确认邮件系统对附件大小的限制；5) 发送前测试自己能否正常打开。"),
            ("简历被忽略的常见原因", "除了内容问题，简历格式问题也容易被忽略：1) 文件名乱码（如「我的简历（修改版）.pdf」）；2) 邮件正文空白显得敷衍；3) 使用QQ邮箱发送显得不专业；4) PDF加密或限制编辑。"),
        ],
        "faq": [
            ("简历PDF多大最合适？", "建议控制在200KB-1MB之间。如果包含证件照或简单作品集，可以在1-2MB。超过2MB的简历可能上传失败或被邮件系统拦截。"),
            ("简历应该用PDF还是Word？", "强烈建议使用PDF格式。PDF格式保证排版不会乱码，HR在各种设备上看到的效果一致。Word格式在不同电脑上可能排版错乱，影响阅读体验。"),
            ("简历太长可以压缩吗？", "可以。如果简历超过2页，可以考虑精简内容或调整排版。如果内容确实重要，建议保留完整版本并压缩到2MB以内。"),
            ("压缩会影响简历清晰度吗？", "合理压缩不会影响清晰度。使用pdftool.work的「压缩到500KB」选项，通常能将2MB的简历压缩到500KB以内，同时保持文字清晰可读。"),
            ("多页简历如何压缩？", "多页简历压缩时建议逐页检查，确保每页内容都清晰可读。如果某一页包含大量图片，可以单独处理该页后再合并。"),
        ]
    },
    {
        "filename": "guide-pdf-compress-methods.html",
        "title": "PDF压缩方法大全 - 6种方法对比与选择 | pdftool.work",
        "description": "免费分享6种PDF压缩方法：在线工具、软件压缩、打印驱动、系统自带、Python脚本、人工服务。从速度、效果、安全性等维度全面对比，帮你选择最适合的方案。",
        "h1": "PDF压缩方法大全：6种方案对比与选择指南",
        "keyword": "PDF压缩方法",
        "content_sections": [
            ("方法1：在线压缩工具（最便捷）", "pdftool.work等在线工具：上传文件 → 选择压缩级别 → 下载结果。优点：无需安装、操作简单、完全免费、处理快速。缺点：需要网络连接、隐私敏感文件不适用。适用场景：日常办公、临时需要、文件小于50MB。"),
            ("方法2：专业PDF软件（效果最好）", "Adobe Acrobat Pro、Nitro PDF等：支持选择性压缩图片、移除元数据、嵌入部分字体等精细控制。优点：压缩效果好、可批量处理。缺点：需要付费、软件体积大。适用场景：经常处理PDF的专业用户、对质量要求极高的情况。"),
            ("方法3：虚拟打印机（系统自带）", "Windows的Microsoft Print to PDF、Mac的预览应用都内置PDF输出功能，选择「最小文件大小」即可压缩。优点：无需安装额外软件、系统自带。缺点：压缩效果有限、不支持高级选项。适用场景：临时使用、没有网络时。"),
            ("方法4：命令行工具（适合开发者）", "Ghostscript、ImageMagick等命令行工具，支持自动化批量处理。优点：可集成到工作流、适合大量文件。缺点：需要技术背景、参数调试复杂。适用场景：开发者、有批量处理需求的用户。"),
            ("方法5：Python脚本（定制化）", "使用pypdf、PyPDF2等Python库可以编写自定义压缩脚本。优点：完全可控、可定制压缩策略。缺点：需要Python知识、调试耗时。适用场景：有编程能力的用户、需要特定压缩逻辑的情况。"),
            ("方法6：人工处理服务（最省心）", "pdftool.work提供人工处理：上传文件 → 专业人员处理 → 收到完美结果。优点：省心省力、效果好、适用于任何文件。缺点：需要付费、不是即时完成。适用场景：重要文件、自动工具失败、追求最佳效果。"),
        ],
        "faq": [
            ("哪种PDF压缩方法效果最好？", "效果排序：专业软件 > 人工服务 > 在线工具 > 虚拟打印机 > 命令行 > Python脚本。但对于大多数日常场景，在线工具已经足够好用。"),
            ("压缩会影响PDF质量吗？", "任何压缩都会对文件质量产生一定影响，只是程度不同。智能压缩（如pdftool.work使用的方式）会在文件大小和画质之间取得平衡，肉眼通常看不出明显差别。"),
            ("免费方法和付费方法差距大吗？", "对于简单的压缩需求，免费和付费差距不大。付费软件的优势在于精细控制（选择图片DPI、移除特定元素等）和批量处理能力。"),
            ("命令行压缩有什么优势？", "命令行工具的优势在于可自动化、可集成到脚本、适合服务器环境处理大量文件。对于开发者来说，命令行工具是最高效的选择。"),
            ("什么情况下应该选人工处理？", "当自动工具无法满足需求时，比如：文件极其重要不能有任何闪失、压缩后仍然超标、需要专业排版优化、批量文件需要统一处理。这些情况人工处理是最靠谱的选择。"),
        ]
    },
    {
        "filename": "guide-pdf-merge-split.html",
        "title": "PDF合并与分割完整教程 - 2024最全指南 | pdftool.work",
        "description": "PDF合并和分割是日常办公中最常用的操作之一。本文详细介绍PDF合并与分割的多种方法、工具选择、常见问题解决方案，以及如何高效处理批量文件。",
        "h1": "PDF合并与分割完整教程：轻松搞定文件整理",
        "keyword": "PDF合并分割",
        "content_sections": [
            ("什么时候需要合并PDF？", "常见场景：1) 多份合同需要统一发送；2) 扫描件和电子文档合并为一份；3) 报告的多个章节合并成完整版；4) 将多个图片PDF合并为一个方便阅读。合并PDF可以让文件管理更有序，避免遗漏。"),
            ("什么时候需要分割PDF？", "常见场景：1) PDF太大需要分多次发送；2) 只需要PDF中的某几页；3) 将长篇文档拆分成章节；4) 提取签名页或重要页面单独保存。分割可以让文件更便于使用和分享。"),
            ("PDF合并的最佳实践", "1) 按正确顺序排列文件后再合并；2) 检查每份PDF的页面方向是否一致；3) 合并前确认文件没有加密保护；4) 合并大文件时耐心等待上传；5) 完成后检查页码是否正确。"),
            ("PDF分割的注意事项", "1) 明确需要提取的页面范围；2) 分割后的文件建议重新命名包含页码；3) 如果只需要一页，可以选择提取而非分割；4) 分割扫描件时注意页面顺序不要颠倒。"),
            ("批量处理技巧", "如果需要处理大量PDF文件，建议：1) 先整理文件命名顺序；2) 使用pdftool.work的批量上传功能；3) 处理完成后按名称排序检查；4) 批量分割时记录每份文件的页码范围。"),
            ("常见问题解决方案", "合并失败：可能是某个文件已加密或损坏，需要先处理原文件。分割后文件打不开：可能是选择的页面范围超出原文件页数。上传失败：可能是网络问题或文件太大，建议分批处理。"),
        ],
        "faq": [
            ("PDF合并会损失质量吗？", "不会。合并只是将多个文件拼接在一起，不会对内容进行重新编码，因此不会造成任何质量损失。"),
            ("能指定合并顺序吗？", "可以。pdftool.work支持拖拽调整顺序，上传文件后拖动到正确位置即可。"),
            ("分割后的PDF还能再合并吗？", "当然可以。分割和合并是可逆操作，可以无限次进行，不会影响文件质量。"),
            ("有页数限制吗？", "pdftool.work对合并的PDF总页数没有限制，但单次处理建议不超过500页以确保稳定性。"),
            ("加密的PDF能合并或分割吗？", "加密的PDF需要先解除密码保护才能操作。使用pdftool.work的PDF解锁功能即可移除密码限制。"),
        ]
    },
]

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
<a class="mobile-nav-link" href="compress.html">PDF压缩</a>
<a class="mobile-nav-link" href="blog.html">PDF教程</a>
<a class="mobile-nav-link" href="pdf-tools.html">工具箱</a>
<a class="mobile-nav-link" href="services.html">人工服务</a>
</div>
</div>
</nav>
</header>'''

FOOTER = '''<footer class="bg-slate-950 text-slate-400 py-12 mt-auto">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="text-center text-sm">
<p>© 2026 pdftool.work — 免费在线PDF工具</p>
</div>
</div>
</footer>'''

def generate_article(article):
    today = date.today().isoformat()
    body_sections = ""
    for i, (heading, text) in enumerate(article["content_sections"], 1):
        body_sections += f'''<h2>{heading}</h2>
<p>{text}</p>
'''
    faq_items = ""
    for q, a in article["faq"]:
        faq_items += f'''<div class="card FAQItem">
<h3 class="faq-q text-lg font-medium">{q}</h3>
<div class="faq-a text-slate-600 text-sm leading-relaxed hidden">{a}</div>
</div>
'''
    word_count = sum(len(text) for _, text in article["content_sections"]) // 2
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3GQPKP7FYH"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}
gtag('js',new Date());gtag('config','G-3GQPKP7FYH');
</script>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{article["title"]}</title>
<meta name="description" content="{article["description"]}"/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="https://pdftool.work/{article["filename"]}"/>
<meta property="og:type" content="article"/>
<link rel="stylesheet" href="assets/css/tailwind.min.css"/>
<link rel="stylesheet" href="assets/css/styles.css"/>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2913395948188969" crossorigin="anonymous"></script>
<script type="application/ld+json">
{{
  "@context":"https://schema.org",
  "@type":"Article",
  "headline":"{article["h1"]}",
  "description":"{article["description"]}",
  "datePublished":"{today}"
}}
</script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans">
{NAV}
<main id="main">
<section class="border-b border-slate-100" data-ad-container>
<div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
<ins class="adsbygoogle ad-unit" style="display:block" data-ad-client="ca-pub-2913395948188969" data-ad-slot="6363231932" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>
</section>
<article class="max-w-4xl mx-auto px-4 py-12">
<header class="mb-10">
<h1 class="text-4xl font-bold text-slate-950 mb-4">{article["h1"]}</h1>
<p class="text-slate-600 text-lg">阅读时间约 {max(3, word_count//200)} 分钟 · 更新于 {today}</p>
<div class="mt-6 flex flex-wrap gap-3">
<a href="upload-ready.html" class="btn btn-primary">免费处理{article["keyword"]}</a>
<a href="compress.html" class="btn btn-outline">PDF压缩工具</a>
</div>
</header>
<div class="prose prose-slate max-w-none">
{body_sections}
</div>
<section class="mt-12 p-6 bg-primary/5 rounded-xl">
<h2 class="text-2xl font-semibold mb-4">快速处理{article["keyword"]}</h2>
<p class="text-slate-600 mb-4">想立即解决问题？使用pdftool.work的免费在线工具，无需下载软件，浏览器即可处理。</p>
<a href="upload-ready.html" class="btn btn-primary">立即开始 →</a>
</section>
<section class="mt-12">
<h2 class="text-2xl font-semibold mb-6">常见问题</h2>
<div class="space-y-4">
{faq_items}
</div>
</section>
</article>
<section class="mx-auto max-w-7xl px-4 py-6" data-ad-container>
<ins class="adsbygoogle ad-unit" style="display:block" data-ad-client="ca-pub-2913395948188969" data-ad-slot="6363231932" data-ad-format="auto" data-full-width-responsive="true"></ins>
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
{FOOTER}
<script>
document.addEventListener('DOMContentLoaded',function(){{
[].forEach.call(document.querySelectorAll('.FAQItem'),function(item){{
var q=item.querySelector('.faq-q');
var a=item.querySelector('.faq-a');
if(q&&a){{q.addEventListener('click',function(){{a.classList.toggle('hidden');}});q.style.cursor='pointer';}}
}});
}});
</script>
</body>
</html>'''

def main():
    created = []
    sitemap_additions = []
    today = date.today().isoformat()
    for article in ARTICLES:
        out_path = os.path.join(BASE_DIR, article["filename"])
        if os.path.exists(out_path):
            print(f"⏭️  SKIP: {article['filename']}")
            continue
        html = generate_article(article)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html)
        created.append(article["filename"])
        sitemap_additions.append(article["filename"])
        print(f"✅ {article['filename']} ({len(html)//1024}KB)")
    if sitemap_additions:
        with open(os.path.join(BASE_DIR, 'sitemap.xml'), 'r', encoding='utf-8') as f:
            sm = f.read()
        new_urls = '\n  '.join(
            f'<url><loc>https://pdftool.work/{u}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>'
            for u in sitemap_additions
        )
        sm = sm.replace('</urlset>', f'  {new_urls}\n</urlset>')
        with open(os.path.join(BASE_DIR, 'sitemap.xml'), 'w', encoding='utf-8') as f:
            f.write(sm)
    print(f"\n✅ V4完成: {len(created)} 个文章页")

if __name__ == "__main__":
    main()
