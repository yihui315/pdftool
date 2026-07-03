#!/usr/bin/env python3
"""Generate SEO landing pages for high-intent keywords."""
import os

BASE = "compress-pdf-to-200kb.html"

PAGES = [
    {
        "filename": "compress-pdf-to-300kb.html",
        "title": "PDF 压缩到 300KB 免费在线工具 - pdftool.work",
        "description": "使用 pdftool.work 免费在线 PDF 压缩工具，将 PDF 压缩到 300KB 以内。文件仅在浏览器本地处理，无需上传服务器，快速、安全、免费。",
        "h1": "PDF 压缩到 300KB",
        "hero": "想把 PDF 压到 300KB 以内？pdftool.work 提供免费的在线 PDF 压缩工具，全程在浏览器本地处理，不上传服务器，快速将大文件压缩到 300KB 以下。",
        "schema_name": "pdftool.work PDF 压缩到 300KB 工具",
        "schema_desc": "免费在线 PDF 压缩工具，将 PDF 文件压缩到 300KB 以内，浏览器本地处理。",
        "howto_step2": "选择压缩到 300KB 选项，工具会自动计算最优压缩参数。",
        "faq_q1": "PDF 压缩到 300KB 后会不会不清楚？",
        "faq_a1": "对于文字为主的 PDF，300KB 通常能保持良好清晰度。扫描件因含高清图片，信息量大，300KB 压缩可能会有画质损失，建议根据实际效果调整压缩比例。",
        "faq_q2": "PDF 压缩到 300KB 会不会失败？",
        "faq_a2": "如果 PDF 包含大量高清图片，压缩到 300KB 可能导致图片质量严重下降或文件损坏。这时可以尝试压缩到 500KB 或 1MB，在文件大小和画质之间找到平衡。",
        "breadcrumb3": "PDF 压缩到 300KB",
        "canonical": "https://pdftool.work/compress-pdf-to-300kb.html",
        "og_title": "PDF 压缩到 300KB 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，将 PDF 文件压缩到 300KB 以内，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-to-300kb.html",
    },
    {
        "filename": "compress-pdf-to-800kb.html",
        "title": "PDF 压缩到 800KB 免费在线工具 - pdftool.work",
        "description": "使用 pdftool.work 免费在线 PDF 压缩工具，将 PDF 压缩到 800KB 以内。文件仅在浏览器本地处理，无需上传服务器，快速、安全、免费。",
        "h1": "PDF 压缩到 800KB",
        "hero": "需要把 PDF 压到 800KB 以下？pdftool.work 提供免费在线 PDF 压缩工具，全程浏览器本地处理，不上传服务器，轻松将文件压缩到 800KB 以内。",
        "schema_name": "pdftool.work PDF 压缩到 800KB 工具",
        "schema_desc": "免费在线 PDF 压缩工具，将 PDF 文件压缩到 800KB 以内，浏览器本地处理。",
        "howto_step2": "选择压缩到 800KB 选项，工具会自动计算最优压缩参数。",
        "faq_q1": "PDF 压缩到 800KB 够用吗？",
        "faq_a1": "800KB 是比较宽松的压缩目标，大多数文字为主的 PDF 都能轻松达到这个大小，同时保持良好的可读性。对于扫描件，800KB 可以较好地平衡文件大小和画质。",
        "faq_q2": "为什么有些 PDF 压缩不到 800KB？",
        "faq_a2": "PDF 压缩下限取决于文件内容。高清扫描件包含大量图片信息，每个图片都需要一定数据量存储，压缩到 800KB 以下可能需要降低图片分辨率或进行 OCR 识别。",
        "breadcrumb3": "PDF 压缩到 800KB",
        "canonical": "https://pdftool.work/compress-pdf-to-800kb.html",
        "og_title": "PDF 压缩到 800KB 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，将 PDF 文件压缩到 800KB 以内，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-to-800kb.html",
    },
    {
        "filename": "compress-pdf-to-2mb.html",
        "title": "PDF 压缩到 2MB 免费在线工具 - pdftool.work",
        "description": "使用 pdftool.work 免费在线 PDF 压缩工具，将 PDF 压缩到 2MB 以内。文件仅在浏览器本地处理，无需上传服务器，快速、安全、免费。",
        "h1": "PDF 压缩到 2MB",
        "hero": "想把 PDF 压缩到 2MB 以下？许多邮件系统和上传平台限制 2MB，pdftool.work 帮助您快速将大文件压缩到 2MB 以内，全程浏览器本地处理，不上传服务器。",
        "schema_name": "pdftool.work PDF 压缩到 2MB 工具",
        "schema_desc": "免费在线 PDF 压缩工具，将 PDF 文件压缩到 2MB 以内，浏览器本地处理。",
        "howto_step2": "选择压缩到 2MB 选项，工具会自动计算最优压缩参数。",
        "faq_q1": "PDF 压缩到 2MB 会不会丢失内容？",
        "faq_a1": "2MB 是相对宽松的压缩目标，大多数 PDF 压缩到 2MB 以下不会丢失任何页面内容，只会优化内部数据结构或降低图片分辨率，文字内容完全不受影响。",
        "faq_q2": "2MB 的 PDF 压缩后文件会变小多少？",
        "faq_a2": "这取决于原文件类型。文字为主的 PDF 通常能压缩到原来的 20-50%，扫描件因含大量图片，压缩效果因原始图片质量而异，通常可以压缩到原来的 30-70%。",
        "breadcrumb3": "PDF 压缩到 2MB",
        "canonical": "https://pdftool.work/compress-pdf-to-2mb.html",
        "og_title": "PDF 压缩到 2MB 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，将 PDF 文件压缩到 2MB 以内，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-to-2mb.html",
    },
    {
        "filename": "pdf-for-exam-registration-too-large.html",
        "title": "考试报名材料 PDF 太大？快速压缩到指定大小 - pdftool.work",
        "description": "考试报名网站要求 PDF 在特定大小以内？pdftool.work 提供免费在线 PDF 压缩工具，全程浏览器本地处理，不上传服务器，帮助您快速将报名材料压缩到要求大小。",
        "h1": "考试报名材料 PDF 太大？",
        "hero": "各种考试报名网站（考研、公务员、职业资格等）通常要求上传 PDF 在 1MB-5MB 以内。pdftool.work 帮您将报名材料 PDF 快速压缩到要求大小，全程浏览器本地处理，不上传服务器。",
        "schema_name": "pdftool.work 考试报名材料 PDF 压缩工具",
        "schema_desc": "免费在线 PDF 压缩工具，帮助将考试报名材料 PDF 压缩到要求大小，浏览器本地处理。",
        "howto_step2": "根据报名网站要求，选择压缩目标大小（1MB、2MB 或 5MB），工具自动计算最优参数。",
        "faq_q1": "不同考试报名网站的 PDF 大小要求一样吗？",
        "faq_a1": "不一样。考研、公务员、职业资格考试等不同考试的报名网站对 PDF 大小要求不同，常见范围在 1MB 到 10MB 之间。请先查看报名网站的具体要求，再选择对应的压缩目标。",
        "faq_q2": "压缩后会影响报名材料的清晰度吗？",
        "faq_a2": "文字为主的报名材料（成绩单、证书扫描等）压缩到 2-5MB 通常能保持良好清晰度。如果原始文件是高清扫描件，可能需要适当降低压缩目标以保证可读性。",
        "breadcrumb3": "报名材料 PDF 压缩",
        "canonical": "https://pdftool.work/pdf-for-exam-registration-too-large.html",
        "og_title": "考试报名材料 PDF 太大？快速压缩工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，帮助将考试报名材料压缩到要求大小，浏览器本地处理，不上传服务器。",
        "url_slug": "pdf-for-exam-registration-too-large.html",
    },
    {
        "filename": "compress-pdf-for-pay-slip.html",
        "title": "工资条 PDF 压缩 - 免费在线工具 - pdftool.work",
        "description": "工资条 PDF 太大无法发送？使用 pdftool.work 免费在线 PDF 压缩工具，快速将工资条 PDF 压缩变小，全程浏览器本地处理，不上传服务器，安全私密。",
        "h1": "工资条 PDF 压缩",
        "hero": "工资条 PDF 太大发不出去？无论是银行要求还是公司系统上传，pdftool.work 帮您将工资条 PDF 快速压缩，全程浏览器本地处理，不上传服务器，工资明细隐私安全。",
        "schema_name": "pdftool.work 工资条 PDF 压缩工具",
        "schema_desc": "免费在线 PDF 压缩工具，将工资条 PDF 压缩变小，浏览器本地处理，不上传服务器。",
        "howto_step2": "上传工资条 PDF，选择合适的压缩目标（通常 200KB-500KB 足够），工具自动完成压缩。",
        "faq_q1": "工资条 PDF 压缩后内容会不会丢失？",
        "faq_a1": "工资条 PDF 通常以文字和简单表格为主，压缩到 200KB-500KB 完全不会丢失任何内容，只是优化 PDF 内部数据结构，不影响可读性。",
        "faq_q2": "工资条隐私安全吗？",
        "faq_a2": "完全安全。pdftool.work 的压缩过程在浏览器本地完成，文件不会上传到任何服务器。您可以放心压缩工资条等包含个人隐私信息的 PDF。",
        "breadcrumb3": "工资条 PDF 压缩",
        "canonical": "https://pdftool.work/compress-pdf-for-pay-slip.html",
        "og_title": "工资条 PDF 压缩 - 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，快速将工资条 PDF 压缩变小，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-for-pay-slip.html",
    },
    {
        "filename": "compress-pdf-for-thesis.html",
        "title": "论文 PDF 太大怎么压缩 - 免费在线工具 - pdftool.work",
        "description": "毕业论文 PDF 太大无法上传？使用 pdftool.work 免费在线 PDF 压缩工具，将论文 PDF 压缩到要求大小，全程浏览器本地处理，不上传服务器，论文内容完整保留。",
        "h1": "论文 PDF 太大怎么压缩",
        "hero": "毕业论文、项目报告 PDF 太大，上传被限制？pdftool.work 帮您将论文章 PDF 快速压缩到要求大小，优先保留文字和图表清晰度，全程浏览器本地处理，不上传服务器。",
        "schema_name": "pdftool.work 论文 PDF 压缩工具",
        "schema_desc": "免费在线 PDF 压缩工具，将论文章 PDF 压缩到要求大小，浏览器本地处理。",
        "howto_step2": "根据学校或系统要求，选择压缩目标（通常 5MB-20MB），工具自动平衡文件大小和图表清晰度。",
        "faq_q1": "论文 PDF 压缩后图表会不清楚吗？",
        "faq_a1": "pdftool.work 优先使用结构优化压缩，对图表清晰度影响较小。对于图片较多的论文章节，如果压缩后仍超过目标大小，会适当降低图片分辨率。建议压缩后检查图表是否可读。",
        "faq_q2": "学校要求 PDF 不能超过特定大小怎么办？",
        "faq_a2": "先了解学校的具体要求（常见 5MB、10MB、20MB），然后在 pdftool.work 中选择对应压缩目标。如果仍超限，可以尝试分章节压缩或降低图片 DPI 后再提交。",
        "breadcrumb3": "论文 PDF 压缩",
        "canonical": "https://pdftool.work/compress-pdf-for-thesis.html",
        "og_title": "论文 PDF 太大怎么压缩 - 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，将论文 PDF 压缩到要求大小，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-for-thesis.html",
    },
    {
        "filename": "compress-pdf-for-contract.html",
        "title": "合同 PDF 太大怎么压缩 - 免费在线工具 - pdftool.work",
        "description": "合同 PDF 太大无法发送或上传？使用 pdftool.work 免费在线 PDF 压缩工具，快速将合同 PDF 压缩变小，全程浏览器本地处理，不上传服务器，合同内容完整保留。",
        "h1": "合同 PDF 太大怎么压缩",
        "hero": "合同 PDF 太大发不出去、上传被拒？pdftool.work 帮您将各种合同协议 PDF 快速压缩，全程浏览器本地处理，不上传服务器，商业机密隐私安全。",
        "schema_name": "pdftool.work 合同 PDF 压缩工具",
        "schema_desc": "免费在线 PDF 压缩工具，将合同 PDF 压缩变小，浏览器本地处理，不上传服务器。",
        "howto_step2": "上传合同 PDF，选择合适的压缩目标（根据对方系统要求，通常 1MB-5MB），工具自动完成压缩。",
        "faq_q1": "合同 PDF 压缩后有法律效力吗？",
        "faq_a1": "PDF 压缩只是优化文件数据存储方式，不改变任何文字、签章或附件内容，压缩后的 PDF 保留完整法律效力。",
        "faq_q2": "压缩合同 PDF 安全吗？",
        "faq_a2": "完全安全。pdftool.work 的压缩过程在浏览器本地完成，文件不会上传到任何服务器，合同内容的商业机密和个人隐私得到充分保护。",
        "breadcrumb3": "合同 PDF 压缩",
        "canonical": "https://pdftool.work/compress-pdf-for-contract.html",
        "og_title": "合同 PDF 太大怎么压缩 - 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，快速将合同 PDF 压缩变小，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-for-contract.html",
    },
    {
        "filename": "compress-pdf-for-certificate.html",
        "title": "证书 PDF 压缩 - 免费在线工具 - pdftool.work",
        "description": "证书 PDF 太大无法上传？使用 pdftool.work 免费在线 PDF 压缩工具，将证书（毕业证、资格证等）PDF 快速压缩变小，全程浏览器本地处理，不上传服务器。",
        "h1": "证书 PDF 压缩",
        "hero": "毕业证、资格证、技能证书 PDF 太大，上传被拒？pdftool.work 帮您将各类证书 PDF 快速压缩，全程浏览器本地处理，不上传服务器，证书信息完整保留。",
        "schema_name": "pdftool.work 证书 PDF 压缩工具",
        "schema_desc": "免费在线 PDF 压缩工具，将证书 PDF 压缩变小，浏览器本地处理，不上传服务器。",
        "howto_step2": "上传证书 PDF，选择合适的压缩目标（通常 200KB-1MB 足够），工具自动完成压缩。",
        "faq_q1": "证书 PDF 压缩后学校或单位会认可吗？",
        "faq_a1": "只要压缩后的 PDF 内容完整、清晰可读，大多数学校和用人单位都接受。pdftool.work 优先保证文字和照片清晰度，压缩后的证书通常完全满足要求。",
        "faq_q2": "证书 PDF 压缩到多大合适？",
        "faq_a2": "这取决于上传要求。常见证书 PDF 压缩目标：网上报名系统 1-3MB、邮件发送 2-5MB、微信传输 500KB-2MB。建议先了解具体要求再压缩。",
        "breadcrumb3": "证书 PDF 压缩",
        "canonical": "https://pdftool.work/compress-pdf-for-certificate.html",
        "og_title": "证书 PDF 压缩 - 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，将证书 PDF 快速压缩变小，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-for-certificate.html",
    },
    {
        "filename": "compress-scanned-pdf-to-1mb.html",
        "title": "扫描件 PDF 压缩到 1MB - 免费在线工具 - pdftool.work",
        "description": "扫描件 PDF 太大无法上传？使用 pdftool.work 免费在线 PDF 压缩工具，将扫描件 PDF 压缩到 1MB 以内，全程浏览器本地处理，不上传服务器。",
        "h1": "扫描件 PDF 压缩到 1MB",
        "hero": "扫描件 PDF 太大，上传被拒？pdftool.work 帮您将扫描件 PDF 压缩到 1MB 以内，全程浏览器本地处理，不上传服务器，在文件大小和清晰度之间找到最佳平衡。",
        "schema_name": "pdftool.work 扫描件 PDF 压缩到 1MB 工具",
        "schema_desc": "免费在线 PDF 压缩工具，将扫描件 PDF 压缩到 1MB 以内，浏览器本地处理。",
        "howto_step2": "选择压缩到 1MB 选项，工具会对图片进行智能压缩，在保持可读性的前提下尽可能减小文件体积。",
        "faq_q1": "扫描件 PDF 压缩到 1MB 后会看不清吗？",
        "faq_a1": "这取决于原文件的清晰度和扫描质量。对于 300DPI 以上的中高清晰度扫描件，压缩到 1MB 通常能保持良好的可读性。如果原文件是低分辨率扫描，1MB 压缩可能导致文字模糊。",
        "faq_q2": "扫描件 PDF 怎样才能压得更小？",
        "faq_a2": "压缩效果取决于原始分辨率。建议将扫描 DPI 设置在 150-200 范围内，可获得清晰且体积适中的 PDF。如果已有大文件扫描件，可以适当降低图片质量来减少体积。",
        "breadcrumb3": "扫描件 PDF 压缩到 1MB",
        "canonical": "https://pdftool.work/compress-scanned-pdf-to-1mb.html",
        "og_title": "扫描件 PDF 压缩到 1MB - 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，将扫描件 PDF 压缩到 1MB 以内，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-scanned-pdf-to-1mb.html",
    },
    {
        "filename": "compress-pdf-for-receipt.html",
        "title": "收据发票 PDF 太大怎么压缩 - 免费在线工具 - pdftool.work",
        "description": "收据发票 PDF 太大无法报销提交？使用 pdftool.work 免费在线 PDF 压缩工具，快速将收据发票 PDF 压缩变小，全程浏览器本地处理，不上传服务器。",
        "h1": "收据发票 PDF 太大怎么压缩",
        "hero": "报销用的收据发票 PDF 太大，上传系统被拒？pdftool.work 帮您将收据发票 PDF 快速压缩，全程浏览器本地处理，不上传服务器，发票明细完整保留。",
        "schema_name": "pdftool.work 收据发票 PDF 压缩工具",
        "schema_desc": "免费在线 PDF 压缩工具，将收据发票 PDF 压缩变小，浏览器本地处理，不上传服务器。",
        "howto_step2": "上传收据发票 PDF，选择合适的压缩目标（通常 200KB-500KB 足够），工具自动完成压缩。",
        "faq_q1": "发票 PDF 压缩后报销会受影响吗？",
        "faq_a1": "只要压缩后的发票 PDF 清晰可读、金额、日期、发票代码等信息完整，财务部门都会接受。pdftool.work 优先保证文字清晰度，压缩后的发票完全满足报销要求。",
        "faq_q2": "收据 PDF 压缩到多大合适？",
        "faq_a2": "大多数报销系统的收据 PDF 建议压缩到 200KB-1MB 之间，这样既能保证清晰度，又能满足上传大小限制。",
        "breadcrumb3": "收据发票 PDF 压缩",
        "canonical": "https://pdftool.work/compress-pdf-for-receipt.html",
        "og_title": "收据发票 PDF 太大怎么压缩 - 免费在线工具 - pdftool.work",
        "og_desc": "免费在线 PDF 压缩工具，快速将收据发票 PDF 压缩变小，浏览器本地处理，不上传服务器。",
        "url_slug": "compress-pdf-for-receipt.html",
    },
]


def replace(html, key, value):
    return html.replace(f"{{{{{key}}}}}", value)


def generate_page(template, page):
    html = template
    # Text replacements
    replacements = [
        ("title", page["title"]),
        ("description", page["description"]),
        ("h1", page["h1"]),
        ("schema_name", page["schema_name"]),
        ("schema_desc", page["schema_desc"]),
        ("howto_step2", page["howto_step2"]),
        ("faq_q1", page["faq_q1"]),
        ("faq_a1", page["faq_a1"]),
        ("faq_q2", page["faq_q2"]),
        ("faq_a2", page["faq_a2"]),
        ("breadcrumb3", page["breadcrumb3"]),
        ("canonical", page["canonical"]),
        ("og_title", page["og_title"]),
        ("og_desc", page["og_desc"]),
    ]
    for key, value in replacements:
        html = html.replace(f"{{{{{key}}}}}", value)
    
    # Special: update breadcrumb url
    html = html.replace(
        f'href="{template_url(template)}"',
        f'href="{page["canonical"]}"'
    )
    return html


def template_url(template_path):
    """Extract the canonical-like URL from the template path."""
    # compress-pdf-to-200kb.html -> https://pdftool.work/compress-pdf-to-200kb.html
    name = os.path.basename(template_path)
    return f"https://pdftool.work/{name}"


def main():
    base_path = os.path.join(os.path.dirname(__file__), "..", BASE)
    with open(base_path, "r", encoding="utf-8") as f:
        template = f.read()

    created = []
    for page in PAGES:
        out_path = os.path.join(os.path.dirname(__file__), "..", page["filename"])
        html = generate_page(template, page)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html)
        created.append(page["filename"])
        print(f"✅ {page['filename']}")

    print(f"\n✅ Created {len(created)} new SEO pages")


if __name__ == "__main__":
    main()
