(function () {
  const input = document.querySelector("[data-file-input]");
  const selectButton = document.querySelector("[data-select-file]");
  const dropZone = document.querySelector("[data-drop-zone]");
  const clearButton = document.querySelector("[data-clear-file]");
  const resetButton = document.querySelector("[data-reset-button]");
  const exportButton = document.querySelector("[data-export-button]");
  const pageGrid = document.querySelector("[data-page-grid]");
  const pageSummary = document.querySelector("[data-page-summary]");
  const fileInfo = document.querySelector("[data-file-info]");
  const largeFileTip = document.querySelector("[data-large-file-tip]");
  const errorBox = document.querySelector("[data-error-box]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const progressLabel = document.querySelector("[data-progress-label]");
  const progressPercent = document.querySelector("[data-progress-percent]");
  const resultCard = document.querySelector("[data-result-card]");
  const resultMeta = document.querySelector("[data-result-meta]");
  const downloadLink = document.querySelector("[data-download-link]");

  if (!input || !dropZone || !pageGrid) return;

  let currentFile = null;
  let sourceBytes = null;
  let pages = [];
  let draggedId = null;
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

  function activePages() {
    return pages.filter((page) => !page.removed);
  }

  function updateButtons() {
    const hasFile = !!sourceBytes && pages.length > 0;
    const canExport = hasFile && activePages().length > 0;
    exportButton.disabled = !canExport || isProcessing;
    if (clearButton) clearButton.disabled = !hasFile || isProcessing;
    if (resetButton) resetButton.disabled = !hasFile || isProcessing;
  }

  function renderPages() {
    if (!pages.length) {
      pageGrid.innerHTML = `<div class="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm leading-6 text-slate-500">上传 PDF 后，页面卡片会显示在这里。</div>`;
      if (pageSummary) pageSummary.textContent = "尚未上传文件";
      updateButtons();
      return;
    }
    if (pageSummary) pageSummary.textContent = `${pages.length} 页，保留 ${activePages().length} 页`;
    pageGrid.innerHTML = pages.map((page, index) => `
      <div class="page-card ${page.removed ? "is-removed" : ""}" draggable="${!isProcessing}" data-page-id="${page.id}">
        <div class="page-preview" style="transform: rotate(${page.rotation}deg)">
          ${page.originalIndex + 1}
          <small>${page.rotation}°</small>
        </div>
        <div>
          <p class="font-extrabold text-slate-950">页面 ${page.originalIndex + 1}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">当前顺序：${index + 1}</p>
        </div>
        <div class="page-actions">
          <button class="mini-button" type="button" data-rotate-page="${page.id}" ${isProcessing ? "disabled" : ""}>旋转</button>
          <button class="mini-button" type="button" data-toggle-page="${page.id}" ${isProcessing ? "disabled" : ""}>${page.removed ? "恢复" : "删除"}</button>
          <button class="mini-button" type="button" data-move-up="${page.id}" ${index === 0 || isProcessing ? "disabled" : ""}>上移</button>
          <button class="mini-button" type="button" data-move-down="${page.id}" ${index === pages.length - 1 || isProcessing ? "disabled" : ""}>下移</button>
        </div>
      </div>
    `).join("");
    updateButtons();
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
    if (!isPdf(file)) {
      showError("请选择有效的 PDF 文件。");
      return;
    }
    try {
      currentFile = file;
      setProgress(14, "正在读取 PDF");
      sourceBytes = await readFile(file);
      const doc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      pages = Array.from({ length: doc.getPageCount() }, (_, index) => ({
        id: `${index}-${Math.random().toString(16).slice(2)}`,
        originalIndex: index,
        rotation: 0,
        removed: false
      }));
      if (fileInfo) {
        fileInfo.textContent = `已选择：${file.name}，共 ${pages.length} 页，大小 ${formatBytes(file.size)}。`;
        fileInfo.classList.remove("hidden");
      }
      largeFileTip?.classList.toggle("hidden", file.size < 50 * 1024 * 1024 && pages.length < 80);
      setProgress(0, "可以管理页面");
      renderPages();
    } catch (error) {
      resetState(false);
      showError("无法打开该 PDF。文件可能已损坏、加密或格式不正确。");
      setProgress(0, "读取失败");
    }
  }

  function movePage(id, direction) {
    const index = pages.findIndex((page) => page.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= pages.length) return;
    const next = [...pages];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    pages = next;
    clearDownload();
    resultCard?.classList.remove("is-visible");
    renderPages();
  }

  function rotatePage(id) {
    pages = pages.map((page) => page.id === id ? { ...page, rotation: (page.rotation + 90) % 360 } : page);
    clearDownload();
    resultCard?.classList.remove("is-visible");
    renderPages();
  }

  function togglePage(id) {
    pages = pages.map((page) => page.id === id ? { ...page, removed: !page.removed } : page);
    clearDownload();
    resultCard?.classList.remove("is-visible");
    renderPages();
  }

  async function exportPdf() {
    if (!sourceBytes || isProcessing) return;
    const kept = activePages();
    if (!kept.length) {
      showError("至少需要保留 1 页才能导出。");
      return;
    }
    isProcessing = true;
    updateButtons();
    clearError();
    clearDownload();
    resultCard?.classList.remove("is-visible");
    try {
      setProgress(10, "正在准备导出");
      const sourceDoc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const outDoc = await window.PDFLib.PDFDocument.create();
      for (let i = 0; i < kept.length; i += 1) {
        const item = kept[i];
        setProgress(10 + (i / kept.length) * 80, `正在复制页面 ${item.originalIndex + 1}`);
        const [page] = await outDoc.copyPages(sourceDoc, [item.originalIndex]);
        const currentAngle = page.getRotation().angle || 0;
        page.setRotation(window.PDFLib.degrees((currentAngle + item.rotation) % 360));
        outDoc.addPage(page);
      }
      setProgress(94, "正在生成新 PDF");
      const bytes = await outDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: "application/pdf" });
      downloadUrl = URL.createObjectURL(blob);
      if (downloadLink) {
        downloadLink.href = downloadUrl;
        downloadLink.download = `pdftool-managed-${new Date().toISOString().slice(0, 10)}.pdf`;
      }
      if (resultMeta) resultMeta.textContent = `已导出 ${kept.length} 页，删除 ${pages.length - kept.length} 页，结果大小 ${formatBytes(blob.size)}。`;
      resultCard?.classList.add("is-visible");
      setProgress(100, "导出完成，可以下载结果");
    } catch (error) {
      showError(error.message || "导出失败，请检查 PDF 文件后重试。");
      setProgress(0, "导出失败");
    } finally {
      isProcessing = false;
      updateButtons();
    }
  }

  function resetState(clearInput = true) {
    currentFile = null;
    sourceBytes = null;
    pages = [];
    if (clearInput) input.value = "";
    clearDownload();
    clearError();
    fileInfo?.classList.add("hidden");
    largeFileTip?.classList.add("hidden");
    resultCard?.classList.remove("is-visible");
    setProgress(0, "等待上传 PDF");
    renderPages();
  }

  pageGrid.addEventListener("click", (event) => {
    const rotate = event.target.closest("[data-rotate-page]");
    const toggle = event.target.closest("[data-toggle-page]");
    const up = event.target.closest("[data-move-up]");
    const down = event.target.closest("[data-move-down]");
    if (rotate) rotatePage(rotate.getAttribute("data-rotate-page"));
    if (toggle) togglePage(toggle.getAttribute("data-toggle-page"));
    if (up) movePage(up.getAttribute("data-move-up"), -1);
    if (down) movePage(down.getAttribute("data-move-down"), 1);
  });

  pageGrid.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-page-id]");
    if (!card || isProcessing) return;
    draggedId = card.getAttribute("data-page-id");
    card.classList.add("is-dragging");
  });
  pageGrid.addEventListener("dragend", (event) => {
    event.target.closest("[data-page-id]")?.classList.remove("is-dragging");
    draggedId = null;
  });
  pageGrid.addEventListener("dragover", (event) => event.preventDefault());
  pageGrid.addEventListener("drop", (event) => {
    event.preventDefault();
    const targetId = event.target.closest("[data-page-id]")?.getAttribute("data-page-id");
    if (!draggedId || !targetId || draggedId === targetId) return;
    const from = pages.findIndex((page) => page.id === draggedId);
    const to = pages.findIndex((page) => page.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...pages];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    pages = next;
    renderPages();
  });

  selectButton?.addEventListener("click", () => input.click());
  input.addEventListener("change", () => loadFile(input.files?.[0]));
  exportButton.addEventListener("click", exportPdf);
  clearButton?.addEventListener("click", () => resetState(true));
  resetButton?.addEventListener("click", () => resetState(true));
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
  renderPages();
})();
