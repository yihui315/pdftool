(function () {
  const input = document.querySelector("[data-file-input]");
  const selectButton = document.querySelector("[data-select-file]");
  const dropZone = document.querySelector("[data-drop-zone]");
  const clearButton = document.querySelector("[data-clear-file]");
  const resetButton = document.querySelector("[data-reset-button]");
  const splitButton = document.querySelector("[data-split-button]");
  const singlePages = document.querySelector("[data-single-pages]");
  const rangeField = document.querySelector("[data-range-field]");
  const rangeInput = document.querySelector("[data-range-input]");
  const fileInfo = document.querySelector("[data-file-info]");
  const largeFileTip = document.querySelector("[data-large-file-tip]");
  const errorBox = document.querySelector("[data-error-box]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const progressLabel = document.querySelector("[data-progress-label]");
  const progressPercent = document.querySelector("[data-progress-percent]");
  const resultCard = document.querySelector("[data-result-card]");
  const resultMeta = document.querySelector("[data-result-meta]");
  const resultList = document.querySelector("[data-result-list]");

  if (!input || !dropZone || !splitButton) return;

  let currentFile = null;
  let sourceBytes = null;
  let pageCount = 0;
  let urls = [];
  let isProcessing = false;

  function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function setProgress(percent, label) {
    const safe = Math.max(0, Math.min(100, Math.round(percent)));
    progressFill?.parentElement?.style.setProperty("--progress", `${safe}%`);
    if (progressPercent) progressPercent.textContent = `${safe}%`;
    if (progressLabel && label) progressLabel.textContent = label;
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function clearUrls() {
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls = [];
  }

  function updateButtons() {
    const ready = !!currentFile && !!sourceBytes && pageCount > 0;
    splitButton.disabled = !ready || isProcessing;
    if (clearButton) clearButton.disabled = !ready || isProcessing;
    if (resetButton) resetButton.disabled = !ready || isProcessing;
  }

  function isPdf(file) {
    return file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  }

  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`无法读取文件：${file.name}`));
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }

  async function loadFile(file) {
    clearError();
    clearUrls();
    resultCard?.classList.remove("is-visible");
    if (!isPdf(file)) {
      showError("请选择有效的 PDF 文件。");
      return;
    }
    currentFile = file;
    sourceBytes = null;
    pageCount = 0;
    setProgress(12, "正在读取 PDF");
    try {
      const bytes = await readFile(file);
      const doc = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      sourceBytes = bytes;
      pageCount = doc.getPageCount();
      if (fileInfo) {
        fileInfo.textContent = `已选择：${file.name}，共 ${pageCount} 页，大小 ${formatBytes(file.size)}。`;
        fileInfo.classList.remove("hidden");
      }
      largeFileTip?.classList.toggle("hidden", file.size < 50 * 1024 * 1024);
      if (rangeInput) rangeInput.value = pageCount >= 3 ? `1-3` : `1-${pageCount}`;
      setProgress(0, "可以开始分割");
    } catch (error) {
      currentFile = null;
      sourceBytes = null;
      pageCount = 0;
      showError("无法打开该 PDF。文件可能已损坏、加密或格式不正确。");
      setProgress(0, "读取失败");
    } finally {
      updateButtons();
    }
  }

  function parseRanges() {
    if (!pageCount) throw new Error("请先上传 PDF 文件。");
    if (singlePages?.checked) {
      return Array.from({ length: pageCount }, (_, index) => ({ label: `${index + 1}`, pages: [index] }));
    }
    const raw = (rangeInput?.value || "").trim();
    if (!raw) throw new Error("请输入页码范围，例如：1-3,5,8-10。");
    return raw.split(",").map((part) => {
      const token = part.trim();
      const match = token.match(/^(\d+)(?:-(\d+))?$/);
      if (!match) throw new Error(`页码范围格式不正确：${token}`);
      const start = Number(match[1]);
      const end = Number(match[2] || match[1]);
      if (start < 1 || end < 1 || start > end || end > pageCount) {
        throw new Error(`页码范围超出文件页数：${token}`);
      }
      const pages = [];
      for (let page = start; page <= end; page += 1) pages.push(page - 1);
      return { label: token, pages };
    });
  }

  async function splitPdf() {
    if (!sourceBytes || isProcessing) return;
    if (!window.PDFLib?.PDFDocument) {
      showError("pdf-lib.js 尚未加载完成，请刷新页面重试。");
      return;
    }
    isProcessing = true;
    updateButtons();
    clearError();
    clearUrls();
    resultList.innerHTML = "";
    resultCard?.classList.remove("is-visible");
    try {
      const ranges = parseRanges();
      const sourceDoc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const results = [];
      for (let i = 0; i < ranges.length; i += 1) {
        const range = ranges[i];
        setProgress((i / ranges.length) * 90, `正在生成：${range.label}`);
        const outDoc = await window.PDFLib.PDFDocument.create();
        const pages = await outDoc.copyPages(sourceDoc, range.pages);
        pages.forEach((page) => outDoc.addPage(page));
        const bytes = await outDoc.save({ useObjectStreams: true });
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        urls.push(url);
        results.push({ label: range.label, pageTotal: range.pages.length, size: blob.size, url });
      }
      resultList.innerHTML = results
        .map((item, index) => `
          <div class="result-row">
            <div>
              <p class="font-extrabold text-slate-950">结果 ${index + 1}：第 ${item.label} 页</p>
              <p class="mt-1 text-sm text-slate-500">${item.pageTotal} 页 · ${formatBytes(item.size)}</p>
            </div>
            <a class="btn btn-primary" href="${item.url}" download="pdftool-split-${item.label.replaceAll("-", "_")}.pdf">下载 PDF</a>
          </div>
        `)
        .join("");
      if (resultMeta) resultMeta.textContent = `已生成 ${results.length} 个 PDF 结果。`;
      resultCard?.classList.add("is-visible");
      setProgress(100, "分割完成，可以下载结果");
    } catch (error) {
      showError(error.message || "分割失败，请检查页码范围。");
      setProgress(0, "分割失败，请重新尝试");
    } finally {
      isProcessing = false;
      updateButtons();
    }
  }

  function resetAll() {
    currentFile = null;
    sourceBytes = null;
    pageCount = 0;
    input.value = "";
    clearUrls();
    clearError();
    fileInfo?.classList.add("hidden");
    largeFileTip?.classList.add("hidden");
    resultCard?.classList.remove("is-visible");
    setProgress(0, "等待上传 PDF");
    updateButtons();
  }

  selectButton?.addEventListener("click", () => input.click());
  input.addEventListener("change", () => loadFile(input.files?.[0]));
  singlePages?.addEventListener("change", () => rangeField?.classList.toggle("hidden", singlePages.checked));
  splitButton.addEventListener("click", splitPdf);
  clearButton?.addEventListener("click", resetAll);
  resetButton?.addEventListener("click", resetAll);

  dropZone.addEventListener("click", (event) => {
    if (event.target.closest("[data-select-file]")) return;
    input.click();
  });
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  });
  ["dragenter", "dragover"].forEach((name) => {
    dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
    });
  });
  dropZone.addEventListener("drop", (event) => loadFile(event.dataTransfer.files?.[0]));
  window.addEventListener("beforeunload", clearUrls);
  updateButtons();
})();
