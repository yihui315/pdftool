#!/usr/bin/env python3
"""
V5 English Site Generator - pdftool.work English version
Creates en/ directory with English SEO pages for international traffic
"""
import os
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
EN_DIR = os.path.join(BASE_DIR, "en")
os.makedirs(EN_DIR, exist_ok=True)

PAGES = [
    {
        "filename": "index.html",
        "title": "Free Online PDF Tools - Compress, Merge, Split, Reduce PDF Size",
        "description": "100% free online PDF tools. Compress PDF, merge PDFs, split PDF, reduce PDF file size. No upload required, browser-based processing, privacy secure.",
        "h1": "Free Online PDF Tools - No Upload Required",
        "keyword": "free online PDF tools",
        "sections": [
            ("Why Choose pdftool.work?", "Our tools run entirely in your browser. Your files never leave your device, ensuring complete privacy and security. No registration, no email required, no file size limits."),
            ("PDF Compress - Reduce File Size", "Compress PDF files to any size you need: 200KB, 500KB, 1MB, or custom. Our smart compression algorithm preserves text clarity while dramatically reducing file size."),
            ("PDF Merge - Combine Multiple Files", "Merge multiple PDFs into one document. Perfect for combining contracts, merging scanned pages with digital documents, or assembling report chapters."),
            ("PDF Split - Extract Pages", "Split a large PDF into separate files. Extract specific pages, divide by chapter, or save individual pages. Fast, free, and works entirely in your browser."),
            ("All PDF Tools", "Explore our complete suite of free PDF tools: compress, merge, split, rotate, unlock password-protected PDFs, convert PDF to JPG, convert images to PDF, and more."),
        ],
        "faq": [
            ("Is it really free?", "Yes, completely free. No registration, no email, no file size limits. We make money through optional premium services and ads, not by charging for basic tools."),
            ("Is my data safe?", "Absolutely. All processing happens in your browser. Your files never leave your device - we don't even have a server to store them. Once you close the page, your data is gone."),
            ("What browsers are supported?", "Works on all modern browsers: Chrome, Firefox, Safari, Edge. Both desktop and mobile. We recommend Chrome for best performance with very large files."),
            ("How fast is it?", "Most operations complete in under 10 seconds. Compression speed depends on file size and complexity. Our browser-based approach means no server upload/download wait time."),
            ("Do you offer API access?", "Yes, we offer API access for developers and businesses. Contact us at service@pdftool.work for pricing and documentation."),
        ]
    },
    {
        "filename": "compress-pdf.html",
        "title": "Compress PDF Online Free - Reduce PDF File Size Without Quality Loss",
        "description": "Free online PDF compressor. Reduce PDF file size by up to 90% without noticeable quality loss. Choose target size: 200KB, 500KB, 1MB. Works in any browser, no upload required.",
        "h1": "Compress PDF Online - Reduce File Size Free",
        "keyword": "compress PDF online",
        "sections": [
            ("How to Compress PDF for Free", "Step 1: Upload your PDF file. Step 2: Choose compression level or enter target file size. Step 3: Download your compressed PDF instantly. No upload means faster processing and complete privacy."),
            ("Compression Levels Explained", "Light compression: 30-50% size reduction, perfect for text documents. Medium compression: 50-70% reduction, good for mixed content. Heavy compression: up to 90% reduction, ideal for scanned documents."),
            ("Compress for Specific Platforms", "Specialized presets for common upload requirements: email attachments (5MB), visa applications (2MB), university submissions (1MB), job portals (500KB), and social media (200KB)."),
            ("No Quality Loss Technology", "Our smart compression detects whether your PDF contains text or images and applies the optimal compression strategy. Text PDFs can be compressed to very small sizes without any visible quality change."),
        ],
        "faq": [
            ("Will compression reduce quality?", "Light and medium compression preserve excellent quality. Heavy compression may slightly reduce image quality in scanned documents, but text remains perfectly readable."),
            ("What's the maximum file size?", "No limit. We can handle files of any size. Larger files simply take longer to process in your browser. For files over 50MB, we recommend using Chrome for best performance."),
            ("Can I compress multiple files?", "Yes, our batch processing feature lets you compress multiple files at once. Each file is processed individually to ensure the best results."),
            ("Does it work on mobile?", "Yes. Our PDF compressor works on smartphones and tablets. The interface automatically adapts to mobile screens, though we recommend larger screens for complex operations."),
        ]
    },
    {
        "filename": "merge-pdf.html",
        "title": "Merge PDF Files Online Free - Combine Multiple PDFs in Seconds",
        "description": "Free online PDF merger. Combine multiple PDF files into one document in seconds. Drag and drop to reorder pages. No upload, no registration, no file size limits.",
        "h1": "Merge PDF Files Online - Free & Easy",
        "keyword": "merge PDF files",
        "sections": [
            ("How to Merge PDFs Online", "Upload multiple PDF files, drag to reorder them in the sequence you want, click merge, and download the combined PDF. Takes less than 30 seconds for most operations."),
            ("Perfect for Contracts & Agreements", "Legal professionals use our merger to combine multiple contract pages, exhibits, and addendums into a single, professionally organized document."),
            ("Merge Scanned + Digital Documents", "Easily combine traditional scanned pages with digitally created pages. Our merger preserves the original quality of each page regardless of source."),
            ("Organize Large Documents", "Assemble thesis chapters, project reports, or portfolio pieces into a single cohesive document. Maintain original page quality and formatting throughout."),
        ],
        "faq": [
            ("Is there a file limit?", "No limits on number of files or total size. Merge as many PDFs as you need. All processing happens in your browser, so speed depends on your device."),
            ("Can I reorder pages?", "Yes, drag and drop interface lets you reorder pages within and between files before merging. Preview every page before combining."),
            ("Will page order be preserved?", "Yes. Within each uploaded PDF, all pages maintain their original order. Between different PDFs, the order follows your drag-and-drop arrangement."),
            ("What about page orientation?", "Pages maintain their original orientation. If a page is landscape or rotated in the original, it stays that way after merging."),
        ]
    },
    {
        "filename": "split-pdf.html",
        "title": "Split PDF Online Free - Extract Pages from PDF in Seconds",
        "description": "Free online PDF splitter. Extract pages from any PDF, split large files into smaller parts, or remove unwanted pages. No upload required. Works in any browser.",
        "h1": "Split PDF Online - Free Page Extractor",
        "keyword": "split PDF online",
        "sections": [
            ("How to Split PDF Files", "Upload your PDF, select the pages you want to extract or the ranges to split, and download your new files. Can extract single pages, page ranges, or divide into equal parts."),
            ("Extract Specific Pages", "Need just one or two pages from a large PDF? Select exactly which pages you need and extract them as a new file. Perfect for signature pages, certificates, or receipts."),
            ("Divide Large Documents", "Split a large PDF into multiple smaller files. Divide by page ranges (e.g., pages 1-10, 11-20) or split into equal parts (every 5 pages, every 10 pages)."),
            ("Remove Unwanted Pages", "Delete specific pages you don't need. Our tool creates a new PDF without the selected pages, leaving the original file untouched."),
        ],
        "faq": [
            ("Can I split by page ranges?", "Yes. Enter page ranges like 1-5, 8, 10-15 to extract exactly those pages. Supports multiple ranges in one operation."),
            ("How many files can I create?", "Unlimited. Split into as many separate files as you need. Each split creates a new PDF file ready for download."),
            ("Does it work with large PDFs?", "Yes. Our browser-based splitter handles large PDFs efficiently. Very large files (500+ pages) may take longer but work reliably."),
            ("Can I preview before splitting?", "Yes. All pages display as thumbnails. Select pages visually rather than remembering page numbers."),
        ]
    },
    {
        "filename": "pdf-tools.html",
        "title": "All Free PDF Tools - Complete List of Online PDF Utilities",
        "description": "Complete list of free online PDF tools. Compress, merge, split, rotate, unlock, convert PDF to JPG, convert images to PDF. All browser-based, no upload required.",
        "h1": "Free PDF Tools - Complete Online Toolkit",
        "keyword": "free PDF tools",
        "sections": [
            ("PDF Compression Tools", "Reduce PDF file size with precision. Choose from preset sizes (200KB to 2MB) or enter custom target. Our compressor handles everything from legal documents to high-resolution scans."),
            ("PDF Manipulation Tools", "Merge multiple PDFs, split into separate files, rotate pages, extract specific pages. All operations happen in your browser with no server upload."),
            ("PDF Conversion Tools", "Convert PDF to JPG images, or convert images (JPG, PNG) to PDF. Maintain original quality while changing format for your specific needs."),
            ("PDF Security Tools", "Unlock password-protected PDFs, remove restrictions, view and remove metadata. Handle encrypted documents without password recovery risks."),
        ],
        "faq": [
            ("Are all tools really free?", "Yes, all basic tools are 100% free with no limits. Premium features like batch processing and API access are paid, but core functionality is free forever."),
            ("Do I need to install anything?", "No. Everything runs in your web browser. No plugins, no software download, no installation. Just open the website and start working."),
            ("Are my files stored on servers?", "No. All processing happens locally in your browser. Your files never leave your device. We don't have the technical capability to store them."),
            ("What's coming next?", "We're building: OCR to make scanned PDFs searchable, edit PDF text and images, fill and sign forms, compare two PDFs side by side."),
        ]
    },
    {
        "filename": "about.html",
        "title": "About pdftool.work - Free Online PDF Tools Since 2024",
        "description": "Learn about pdftool.work - free online PDF tools built for privacy. All tools run in your browser, files never uploaded. Founded to make PDF handling accessible to everyone.",
        "h1": "About pdftool.work - Free PDF Tools Built for Privacy",
        "keyword": "about pdftool",
        "sections": [
            ("Our Mission", "We believe PDF tools should be free, private, and accessible to everyone. No registration, no email, no file size limits. Your files stay on your device."),
            ("How We Make Money", "Free tools supported by ads and optional premium services. We never charge for basic functionality. Premium services (rush processing, API access, bulk operations) are paid."),
            ("Privacy First", "Browser-based processing means your files never leave your device. We can't see, store, or share your documents. This isn't just a promise - it's technically how our tools work."),
            ("Contact Us", "Questions, feedback, or partnership inquiries: service@pdftool.work. We respond within 24 hours on business days."),
        ],
        "faq": [
            ("Is pdftool.work free for commercial use?", "Yes. Use our tools for personal, commercial, or educational purposes. No attribution required, no watermarks on output."),
            ("Do you offer enterprise plans?", "Yes. Enterprise features include API access, custom branding, team management, and priority support. Contact us for pricing."),
            ("Can I request a new feature?", "Absolutely. We prioritize features based on user requests. Email service@pdftool.work with your feature idea."),
            ("Do you have an API?", "Yes. REST API available for developers. Documentation at pdftool.work/api. Contact us for API keys and rate limits."),
        ]
    },
]

NAV = '''<header class="bg-white shadow-soft sticky top-0 z-50">
<nav class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="flex h-16 items-center justify-between">
<a class="flex items-center gap-2 text-xl font-semibold text-primary" href="/">
<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
pdftool.work
</a>
<div class="hidden xl:flex items-center gap-1">
<a class="mobile-nav-link" href="/compress-pdf.html">Compress PDF</a>
<a class="mobile-nav-link" href="/merge-pdf.html">Merge PDF</a>
<a class="mobile-nav-link" href="/split-pdf.html">Split PDF</a>
<a class="mobile-nav-link" href="/pdf-tools.html">All Tools</a>
</div>
</div>
</nav>
</header>'''

FOOTER = '''<footer class="bg-slate-950 text-slate-400 py-12 mt-auto">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="text-center text-sm">
<p>© 2026 pdftool.work — Free Online PDF Tools</p>
</div>
</div>
</footer>'''

def generate_en_page(page):
    today = date.today().isoformat()
    body = ""
    for heading, text in page["sections"]:
        body += f"<h2>{heading}</h2>\n<p>{text}</p>\n"
    faq_html = ""
    for q, a in page["faq"]:
        faq_html += f'''<div class="card FAQItem">
<h3 class="faq-q text-lg font-medium">{q}</h3>
<div class="faq-a text-slate-600 text-sm leading-relaxed hidden">{a}</div>
</div>\n'''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3GQPKP7FYH"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}
gtag('js',new Date());gtag('config','G-3GQPKP7FYH');
</script>
<title>{page["title"]}</title>
<meta name="description" content="{page["description"]}"/>
<meta name="robots" content="index,follow"/>
<link rel="canonical" href="https://pdftool.work/en/{page["filename"]}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="{page["title"]}"/>
<meta property="og:description" content="{page["description"]}"/>
<link rel="stylesheet" href="../assets/css/tailwind.min.css"/>
<link rel="stylesheet" href="../assets/css/styles.css"/>
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"WebSite","name":"pdftool.work","url":"https://pdftool.work/en/"}}
</script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans">
{NAV}
<main>
<section class="hero-surface">
<div class="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
<div class="max-w-3xl">
<h1 class="text-4xl font-semibold text-slate-950 sm:text-5xl">{page["h1"]}</h1>
<p class="mt-6 text-lg text-slate-600">{page["description"]}</p>
<div class="mt-8 flex flex-col gap-3 sm:flex-row">
<a class="btn btn-primary btn-lg" href="../compress-pdf.html">Compress PDF Free →</a>
<a class="btn btn-quiet btn-lg" href="../pdf-tools.html">All Free Tools</a>
</div>
</div>
</div>
</section>
<section class="section">
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<div class="prose prose-slate max-w-none">
{body}
</div>
</div>
</section>
<section class="section bg-white">
<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
<h2 class="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
<div class="space-y-4">{faq_html}</div>
</div>
</section>
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
    created = 0
    for page in PAGES:
        out = os.path.join(EN_DIR, page["filename"])
        if os.path.exists(out):
            print(f"⏭️  {page['filename']}")
            continue
        html = generate_en_page(page)
        with open(out, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ en/{page['filename']}")
        created += 1
    print(f"\n✅ V5 English site: {created} pages created")

if __name__ == "__main__":
    main()
