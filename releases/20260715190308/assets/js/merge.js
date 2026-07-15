(function () {
  const fileInput = document.querySelector("[data-file-input]");
  const selectButton = document.querySelector("[data-select-files]");
  const dropZone = document.querySelector("[data-drop-zone]");
  const fileList = document.querySelector("[data-file-list]");
  const fileSummary = document.querySelector("[data-file-summary]");
  const clearButton = document.querySelector("[data-clear-files]");
  const mergeButton = document.querySelector("[data-merge-button]");
  const resetButton = document.querySelector("[data-demo-reset]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const progressLabel = document.querySelector("[data-progress-label]");
  const progressPercent = document.querySelector("[data-progress-percent]");
  const errorBox = document.querySelector("[data-error-box]");
  const largeFileTip = document.querySelector("[data-large-file-tip]");
  const resultCard = document.querySelector("[data-result-card]");
  const resultMeta = document.querySelector("[data-result-meta]");
  const downloadLink = document.querySelector("[data-download-link]");

  if (!fileInput || !dropZone || !fileList || !mergeButton) return;

  const LARGE_FILE_BYTES = 50 * 1024 * 1024;
  const LARGE_TOTAL_BYTES = 120 * 1024 * 1024;
  let files = [];
  let isProcessing = false;
  let downloadUrl = "";
  let draggedId = null;

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "未知大小";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function setProgress(percent, label) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    const progressTrack = progressFill?.parentElement;
    if (progressTrack) progressTrack.style.setProperty("--progress", `${safePercent}%`);
    if (progressPercent) progressPercent.textContent = `${safePercent}%`;
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

  function revokeDownloadUrl() {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      downloadUrl = "";
    }
  }

  function makeId(file) {
    return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`;
  }

  function isPdf(file) {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  }

  function totalBytes() {
    return files.reduce((sum, item) => sum + item.file.size, 0);
  }

  function renderFiles() {
    const total = totalBytes();
    const hasLargeFiles = files.some((item) => item.file.size >= LARGE_FILE_BYTES) || total >= LARGE_TOTAL_BYTES;

    if (largeFileTip) {
      largeFileTip.classList.toggle("hidden", !hasLargeFiles);
    }

    if (fileSummary) {
      fileSummary.textContent = files.length
        ? `${files.length} 个文件，合计 ${formatBytes(total)}`
        : "尚未添加文件";
    }

    if (clearButton) clearButton.disabled = !files.length || isProcessing;
    if (resetButton) resetButton.disabled = !files.length || isProcessing;
    mergeButton.disabled = files.length < 2 || isProcessing;

    if (!files.length) {
      fileList.innerHTML = `
        <div class="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm leading-6 text-slate-500">
          添加 PDF 后，文件会显示在这里。你可以拖拽排序，或使用上移、下移按钮。
        </div>
      `;
      return;
    }

    fileList.innerHTML = files
      .map((item, index) => {
        const pageText = item.pageCount ? `${item.pageCount} 页` : "待读取页数";
        return `
          <div class="merge-file-row" draggable="${!isProcessing}" data-file-id="${item.id}">
            <span class="drag-handle" aria-hidden="true">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-extrabold text-slate-900">${escapeHtml(item.file.name)}</p>
              <p class="mt-1 text-xs font-semibold text-slate-500">第 ${index + 1} 个 · ${formatBytes(item.file.size)} · ${pageText}</p>
            </div>
            <div class="file-actions" aria-label="${escapeHtml(item.file.name)} 操作">
              <button class="mini-button" type="button" data-move-up="${item.id}" ${index === 0 || isProcessing ? "disabled" : ""}>上移</button>
              <button class="mini-button" type="button" data-move-down="${item.id}" ${index === files.length - 1 || isProcessing ? "disabled" : ""}>下移</button>
              <button class="mini-button" type="button" data-remove-file="${item.id}" ${isProcessing ? "disabled" : ""}>删除</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function addFiles(fileListToAdd) {
    clearError();
    revokeDownloadUrl();
    resultCard?.classList.remove("is-visible");

    const incoming = Array.from(fileListToAdd || []);
    const invalid = incoming.filter((file) => !isPdf(file));
    const valid = incoming.filter(isPdf);

    if (invalid.length) {
      showError(`已跳过 ${invalid.length} 个非 PDF 文件。请只选择 .pdf 文件。`);
    }

    if (!valid.length) {
      renderFiles();
      return;
    }

    const existingKeys = new Set(files.map((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`));
    const nextItems = valid
      .filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`))
      .map((file) => ({
        id: makeId(file),
        file,
        pageCount: null
      }));

    files = files.concat(nextItems);
    setProgress(0, files.length >= 2 ? "可以开始合并" : "请至少添加 2 个 PDF");
    renderFiles();
  }

  function moveFile(id, direction) {
    const index = files.findIndex((item) => item.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= files.length) return;
    const next = [...files];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    files = next;
    renderFiles();
  }

  function removeFile(id) {
    files = files.filter((item) => item.id !== id);
    revokeDownloadUrl();
    resultCard?.classList.remove("is-visible");
    setProgress(0, files.length >= 2 ? "可以开始合并" : "请至少添加 2 个 PDF");
    renderFiles();
  }

  function clearFiles() {
    files = [];
    fileInput.value = "";
    clearError();
    revokeDownloadUrl();
    resultCard?.classList.remove("is-visible");
    setProgress(0, "等待上传 PDF");
    renderFiles();
  }

  async function readFileAsArrayBuffer(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`无法读取文件：${file.name}`));
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      };
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }

  async function mergePdfs() {
    if (files.length < 2 || isProcessing) return;
    if (!window.PDFLib?.PDFDocument) {
      showError("pdf-lib.js 尚未加载完成，请检查网络后刷新页面重试。");
      return;
    }

    isProcessing = true;
    clearError();
    revokeDownloadUrl();
    resultCard?.classList.remove("is-visible");
    renderFiles();
    setProgress(2, "正在准备合并任务");

    try {
      const mergedPdf = await window.PDFLib.PDFDocument.create();
      let copiedPageCount = 0;

      for (let index = 0; index < files.length; index += 1) {
        const item = files[index];
        const baseProgress = (index / files.length) * 88;
        setProgress(baseProgress, `正在读取：${item.file.name}`);

        const bytes = await readFileAsArrayBuffer(item.file, (readRatio) => {
          setProgress(baseProgress + readRatio * (44 / files.length), `正在读取：${item.file.name}`);
        });

        let sourcePdf;
        try {
          sourcePdf = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        } catch (error) {
          throw new Error(`无法打开「${item.file.name}」。文件可能已损坏、加密或不是有效 PDF。`);
        }

        const pageIndices = sourcePdf.getPageIndices();
        item.pageCount = pageIndices.length;
        setProgress(baseProgress + 44 / files.length, `正在复制页面：${item.file.name}`);

        const pages = await mergedPdf.copyPages(sourcePdf, pageIndices);
        pages.forEach((page) => mergedPdf.addPage(page));
        copiedPageCount += pages.length;
        renderFiles();
      }

      setProgress(94, "正在生成合并后的 PDF");
      const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      downloadUrl = URL.createObjectURL(blob);

      const dateStamp = new Date().toISOString().slice(0, 10);
      if (downloadLink) {
        downloadLink.href = downloadUrl;
        downloadLink.download = `pdftool-merged-${dateStamp}.pdf`;
      }
      if (resultMeta) {
        resultMeta.textContent = `已合并 ${files.length} 个 PDF，共 ${copiedPageCount} 页，结果大小 ${formatBytes(blob.size)}。`;
      }
      resultCard?.classList.add("is-visible");
      setProgress(100, "合并完成，可以下载结果");
    } catch (error) {
      showError(error.message || "合并失败。请检查 PDF 文件后重试。");
      setProgress(0, "合并失败，请重新尝试");
    } finally {
      isProcessing = false;
      renderFiles();
    }
  }

  selectButton?.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => addFiles(fileInput.files));

  dropZone.addEventListener("click", (event) => {
    if (event.target.closest("[data-select-files]")) return;
    fileInput.click();
  });

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    addFiles(event.dataTransfer.files);
  });

  fileList.addEventListener("click", (event) => {
    const upButton = event.target.closest("[data-move-up]");
    const downButton = event.target.closest("[data-move-down]");
    const removeButton = event.target.closest("[data-remove-file]");

    if (upButton) moveFile(upButton.getAttribute("data-move-up"), -1);
    if (downButton) moveFile(downButton.getAttribute("data-move-down"), 1);
    if (removeButton) removeFile(removeButton.getAttribute("data-remove-file"));
  });

  fileList.addEventListener("dragstart", (event) => {
    const row = event.target.closest("[data-file-id]");
    if (!row || isProcessing) return;
    draggedId = row.getAttribute("data-file-id");
    row.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
  });

  fileList.addEventListener("dragend", (event) => {
    event.target.closest("[data-file-id]")?.classList.remove("is-dragging");
    draggedId = null;
  });

  fileList.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  fileList.addEventListener("drop", (event) => {
    event.preventDefault();
    const targetRow = event.target.closest("[data-file-id]");
    const targetId = targetRow?.getAttribute("data-file-id");
    if (!draggedId || !targetId || draggedId === targetId) return;

    const fromIndex = files.findIndex((item) => item.id === draggedId);
    const toIndex = files.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...files];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    files = next;
    renderFiles();
  });

  clearButton?.addEventListener("click", clearFiles);
  resetButton?.addEventListener("click", clearFiles);
  mergeButton.addEventListener("click", mergePdfs);

  window.addEventListener("beforeunload", revokeDownloadUrl);
  renderFiles();
})();
