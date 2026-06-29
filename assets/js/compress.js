(function () {
  const input = document.querySelector("[data-file-input]");
  const selectButton = document.querySelector("[data-select-file]");
  const dropZone = document.querySelector("[data-drop-zone]");
  const clearButton = document.querySelector("[data-clear-file]");
  const resetButton = document.querySelector("[data-reset-button]");
  const compressButton = document.querySelector("[data-compress-button]");
  const modeInput = document.querySelector("[data-compress-mode]");
  const fileInfo = document.querySelector("[data-file-info]");
  const largeFileTip = document.querySelector("[data-large-file-tip]");
  const errorBox = document.querySelector("[data-error-box]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const progressLabel = document.querySelector("[data-progress-label]");
  const progressPercent = document.querySelector("[data-progress-percent]");
  const resultCard = document.querySelector("[data-result-card]");
  const resultMeta = document.querySelector("[data-result-meta]");
  const compressNote = document.querySelector("[data-compress-note]");
  const downloadLink = document.querySelector("[data-download-link]");

  if (!input || !dropZone || !compressButton) return;

  let currentFile = null;
  let sourceBytes = null;
  let pageCount = 0;
  let downloadUrl = "";
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

  function clearDownload() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = "";
  }

  function updateButtons() {
    const ready = !!sourceBytes;
    compressButton.disabled = !ready || isProcessing;
    if (clearButton) clearButton.disabled = !ready || isProcessing;
    if (resetButton) resetButton.disabled = !ready || isProcessing;
  }

  function isPdf(file) {
    return file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`无法读取文件：${file.name}`));
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }

  async function loadFile(file) {
    clearError();
    clearDownload();
    resultCard?.classList.remove("is-visible");
    compressNote?.classList.add("hidden");
    if (!isPdf(file)) {
      showError("请选择有效的 PDF 文件。");
      return;
    }
    try {
      currentFile = file;
      setProgress(12, "正在读取 PDF");
      sourceBytes = await readFile(file);
      const doc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
      if (fileInfo) {
        fileInfo.textContent = `已选择：${file.name}，共 ${pageCount} 页，原始大小 ${formatBytes(file.size)}。`;
        fileInfo.classList.remove("hidden");
      }
      largeFileTip?.classList.toggle("hidden", file.size < 50 * 1024 * 1024);
      setProgress(0, "可以开始压缩");
    } catch (error) {
      resetAll(false);
      showError("无法打开该 PDF。文件可能已损坏、加密或格式不正确。");
      setProgress(0, "读取失败");
    } finally {
      updateButtons();
    }
  }

  async function compressPdf() {
    if (!sourceBytes || isProcessing) return;
    if (!window.PDFLib?.PDFDocument) {
      showError("pdf-lib.js 尚未加载完成，请刷新页面重试。");
      return;
    }
    isProcessing = true;
    updateButtons();
    clearError();
    clearDownload();
    resultCard?.classList.remove("is-visible");
    compressNote?.classList.add("hidden");
    try {
      setProgress(18, "正在加载 PDF");
      const sourceDoc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const outputDoc = await window.PDFLib.PDFDocument.create();
      const pageIndices = sourceDoc.getPageIndices();
      for (let i = 0; i < pageIndices.length; i += 1) {
        setProgress(18 + (i / pageIndices.length) * 55, `正在优化页面 ${i + 1}`);
        const [page] = await outputDoc.copyPages(sourceDoc, [pageIndices[i]]);
        outputDoc.addPage(page);
      }
      if (modeInput?.value === "clean") {
        outputDoc.setTitle("");
        outputDoc.setAuthor("");
        outputDoc.setSubject("");
        outputDoc.setKeywords([]);
        outputDoc.setProducer("pdftool.work");
        outputDoc.setCreator("pdftool.work");
      }
      setProgress(86, "正在保存优化后的 PDF");
      const bytes = await outputDoc.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([bytes], { type: "application/pdf" });
      const originalSize = currentFile.size;
      const ratio = originalSize ? ((1 - blob.size / originalSize) * 100) : 0;
      downloadUrl = URL.createObjectURL(blob);
      if (downloadLink) {
        downloadLink.href = downloadUrl;
        downloadLink.download = `pdftool-compressed-${new Date().toISOString().slice(0, 10)}.pdf`;
      }
      if (resultMeta) {
        const ratioText = ratio > 0 ? `减少约 ${ratio.toFixed(1)}%` : `未明显变小`;
        resultMeta.textContent = `原始大小 ${formatBytes(originalSize)}，结果大小 ${formatBytes(blob.size)}，${ratioText}。`;
      }
      if (compressNote) {
        if (blob.size >= originalSize) {
          compressNote.textContent = "该 PDF 可能已经优化过，或主要由图片组成。本次安全结构优化没有减少体积，你可以继续使用原文件。";
          compressNote.classList.remove("hidden");
        } else {
          compressNote.classList.add("hidden");
        }
      }
      resultCard?.classList.add("is-visible");
      setProgress(100, "压缩完成，可以下载结果");
    } catch (error) {
      showError(error.message || "压缩失败，请检查 PDF 文件后重试。");
      setProgress(0, "压缩失败");
    } finally {
      isProcessing = false;
      updateButtons();
    }
  }

  function resetAll(clearInput = true) {
    currentFile = null;
    sourceBytes = null;
    pageCount = 0;
    if (clearInput) input.value = "";
    clearDownload();
    clearError();
    fileInfo?.classList.add("hidden");
    largeFileTip?.classList.add("hidden");
    compressNote?.classList.add("hidden");
    resultCard?.classList.remove("is-visible");
    setProgress(0, "等待上传 PDF");
    updateButtons();
  }

  selectButton?.addEventListener("click", () => input.click());
  input.addEventListener("change", () => loadFile(input.files?.[0]));
  compressButton.addEventListener("click", compressPdf);
  clearButton?.addEventListener("click", () => resetAll(true));
  resetButton?.addEventListener("click", () => resetAll(true));
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
  ["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragover");
  }));
  ["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragover");
  }));
  dropZone.addEventListener("drop", (event) => loadFile(event.dataTransfer.files?.[0]));
  window.addEventListener("beforeunload", clearDownload);
  updateButtons();
})();
