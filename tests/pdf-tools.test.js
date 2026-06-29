import { afterEach, describe, expect, it } from "vitest";
import { createPdf, loadPage, setInputFiles, waitFor } from "./helpers/page.js";

describe("PDF tool flows", () => {
  let dom;

  afterEach(() => dom?.window.close());

  it("rejects non-PDF files before merge processing", () => {
    dom = loadPage("merge.html", "merge.js");
    const file = new dom.window.File(["notes"], "notes.txt", { type: "text/plain" });

    setInputFiles(dom, "[data-file-input]", [file]);

    const error = dom.window.document.querySelector("[data-error-box]");
    expect(error.classList.contains("hidden")).toBe(false);
    expect(error.textContent).toContain("非 PDF");
    expect(dom.window.document.querySelector("[data-merge-button]").disabled).toBe(true);
  });

  it.each([
    ["split.html", "split.js"],
    ["manage.html", "manage.js"],
    ["compress.html", "compress.js"]
  ])("rejects non-PDF files on %s", (pageName, scriptName) => {
    dom = loadPage(pageName, scriptName);
    const file = new dom.window.File(["notes"], "notes.txt", { type: "text/plain" });

    setInputFiles(dom, "[data-file-input]", [file]);

    const error = dom.window.document.querySelector("[data-error-box]");
    expect(error.classList.contains("hidden")).toBe(false);
    expect(error.textContent).toContain("有效的 PDF");
  });

  it("supports reordering and removing files before a merge", async () => {
    dom = loadPage("merge.html", "merge.js");
    const files = await Promise.all(
      ["first.pdf", "second.pdf", "third.pdf"].map(async (name) => (
        new dom.window.File([await createPdf()], name, { type: "application/pdf" })
      ))
    );

    setInputFiles(dom, "[data-file-input]", files);
    const rows = () => [...dom.window.document.querySelectorAll("[data-file-id]")];
    expect(rows()).toHaveLength(3);

    rows()[1].querySelector("[data-move-up]").click();
    expect(rows()[0].textContent).toContain("second.pdf");

    rows()[2].querySelector("[data-remove-file]").click();
    expect(rows()).toHaveLength(2);
    expect(dom.window.document.querySelector("[data-file-summary]").textContent).toContain("2 个文件");
  });

  it("merges two valid PDF files into a downloadable result", async () => {
    dom = loadPage("merge.html", "merge.js");
    const first = new dom.window.File([await createPdf()], "first.pdf", { type: "application/pdf" });
    const second = new dom.window.File([await createPdf()], "second.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [first, second]);
    const mergeButton = dom.window.document.querySelector("[data-merge-button]");
    expect(mergeButton.disabled).toBe(false);
    mergeButton.click();

    await waitFor(() => dom.window.document.querySelector("[data-result-card]").classList.contains("is-visible"));

    expect(dom.window.URL.createObjectURL).toHaveBeenCalledOnce();
    expect(dom.window.document.querySelector("[data-progress-percent]").textContent).toBe("100%");
    expect(dom.window.document.querySelector("[data-download-link]").download).toMatch(/^pdftool-merged-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("surfaces a damaged PDF instead of producing a merge result", async () => {
    dom = loadPage("merge.html", "merge.js");
    const valid = new dom.window.File([await createPdf()], "valid.pdf", { type: "application/pdf" });
    const damaged = new dom.window.File(["not a pdf"], "damaged.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [valid, damaged]);
    dom.window.document.querySelector("[data-merge-button]").click();
    await waitFor(() => !dom.window.document.querySelector("[data-error-box]").classList.contains("hidden"));

    expect(dom.window.document.querySelector("[data-error-box]").textContent).toContain("无法打开");
    expect(dom.window.document.querySelector("[data-result-card]").classList.contains("is-visible")).toBe(false);
  });

  it("reports when the PDF processing library is unavailable", async () => {
    dom = loadPage("merge.html", "merge.js");
    const first = new dom.window.File([await createPdf()], "first.pdf", { type: "application/pdf" });
    const second = new dom.window.File([await createPdf()], "second.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [first, second]);
    dom.window.PDFLib = undefined;
    dom.window.document.querySelector("[data-merge-button]").click();

    expect(dom.window.document.querySelector("[data-error-box]").textContent).toContain("pdf-lib.js");
    expect(dom.window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("reports a split range that exceeds the uploaded PDF", async () => {
    dom = loadPage("split.html", "split.js");
    const file = new dom.window.File([await createPdf(2)], "two-pages.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [file]);
    await waitFor(() => !dom.window.document.querySelector("[data-split-button]").disabled);

    dom.window.document.querySelector("[data-range-input]").value = "1-3";
    dom.window.document.querySelector("[data-split-button]").click();
    await waitFor(() => !dom.window.document.querySelector("[data-error-box]").classList.contains("hidden"));

    expect(dom.window.document.querySelector("[data-error-box]").textContent).toContain("超出文件页数");
    expect(dom.window.document.querySelector("[data-progress-percent]").textContent).toBe("0%");
  });

  it("splits every page into its own downloadable PDF", async () => {
    dom = loadPage("split.html", "split.js");
    const file = new dom.window.File([await createPdf(3)], "three-pages.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [file]);
    await waitFor(() => !dom.window.document.querySelector("[data-split-button]").disabled);

    const singlePages = dom.window.document.querySelector("[data-single-pages]");
    singlePages.checked = true;
    singlePages.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector("[data-split-button]").click();
    await waitFor(() => dom.window.document.querySelector("[data-result-card]").classList.contains("is-visible"));

    expect(dom.window.document.querySelectorAll("[data-result-list] a[download]")).toHaveLength(3);
    expect(dom.window.URL.createObjectURL).toHaveBeenCalledTimes(3);
    expect(dom.window.document.querySelector("[data-result-meta]").textContent).toContain("已生成 3 个 PDF");
  });

  it("splits custom page ranges into separate results", async () => {
    dom = loadPage("split.html", "split.js");
    const file = new dom.window.File([await createPdf(3)], "ranges.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [file]);
    await waitFor(() => !dom.window.document.querySelector("[data-split-button]").disabled);

    dom.window.document.querySelector("[data-range-input]").value = "1-2,3";
    dom.window.document.querySelector("[data-split-button]").click();
    await waitFor(() => dom.window.document.querySelector("[data-result-card]").classList.contains("is-visible"));

    expect(dom.window.document.querySelectorAll("[data-result-list] a[download]")).toHaveLength(2);
    expect(dom.window.document.querySelector("[data-result-meta]").textContent).toContain("已生成 2 个 PDF");
  });

  it("rotates and removes pages before export", async () => {
    dom = loadPage("manage.html", "manage.js");
    const file = new dom.window.File([await createPdf(2)], "manage.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [file]);
    await waitFor(() => dom.window.document.querySelectorAll("[data-page-id]").length === 2);

    dom.window.document.querySelectorAll("[data-move-up]")[1].click();
    expect(dom.window.document.querySelector(".page-preview").textContent).toContain("2");

    dom.window.document.querySelector("[data-rotate-page]").click();
    expect(dom.window.document.querySelector(".page-preview").style.transform).toBe("rotate(90deg)");

    dom.window.document.querySelectorAll("[data-toggle-page]")[1].click();
    expect(dom.window.document.querySelector("[data-page-summary]").textContent).toContain("保留 1 页");
    expect(dom.window.document.querySelector("[data-export-button]").disabled).toBe(false);

    dom.window.document.querySelector("[data-export-button]").click();
    await waitFor(() => dom.window.document.querySelector("[data-result-card]").classList.contains("is-visible"));

    expect(dom.window.URL.createObjectURL).toHaveBeenCalledOnce();
    expect(dom.window.document.querySelector("[data-result-meta]").textContent).toContain("已导出 1 页");
    expect(dom.window.document.querySelector("[data-result-meta]").textContent).toContain("删除 1 页");
  });

  it("compresses a PDF and exposes a dated download", async () => {
    dom = loadPage("compress.html", "compress.js");
    const file = new dom.window.File([await createPdf(2)], "compress.pdf", { type: "application/pdf" });

    setInputFiles(dom, "[data-file-input]", [file]);
    await waitFor(() => !dom.window.document.querySelector("[data-compress-button]").disabled);

    dom.window.document.querySelector("[data-compress-mode]").value = "clean";
    dom.window.document.querySelector("[data-compress-button]").click();
    await waitFor(() => dom.window.document.querySelector("[data-result-card]").classList.contains("is-visible"));

    expect(dom.window.URL.createObjectURL).toHaveBeenCalledOnce();
    expect(dom.window.document.querySelector("[data-progress-percent]").textContent).toBe("100%");
    expect(dom.window.document.querySelector("[data-download-link]").download).toMatch(/^pdftool-compressed-\d{4}-\d{2}-\d{2}\.pdf$/);

    dom.window.document.querySelector("[data-clear-file]").click();
    expect(dom.window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:pdftool-result");
    expect(dom.window.document.querySelector("[data-compress-button]").disabled).toBe(true);
    expect(dom.window.document.querySelector("[data-result-card]").classList.contains("is-visible")).toBe(false);
  });
});
