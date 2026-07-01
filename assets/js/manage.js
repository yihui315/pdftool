import { createPdfPreview, createThumbnailQueue } from "./pdf-preview.js";
import {
  createManagedPages,
  moveManagedPage,
  rotateManagedPage,
  shouldRenderThumbnails,
  toggleManagedPage
} from "./manage-state.js";

const input = document.querySelector("[data-file-input]");
const selectButton = document.querySelector("[data-select-file]");
const dropZone = document.querySelector("[data-drop-zone]");
const clearButton = document.querySelector("[data-clear-file]");
const resetButton = document.querySelector("[data-reset-button]");
const exportButton = document.querySelector("[data-export-button]");
const pageGrid = document.querySelector("[data-page-grid]");
const pageSummary = document.querySelector("[data-page-summary]");
const fileInfo = document.querySelector("[data-file-info]");
const resourceNotice = document.querySelector("[data-large-file-tip]");
const errorBox = document.querySelector("[data-error-box]");
const progressLabel = document.querySelector("[data-progress-label]");
const progressPercent = document.querySelector("[data-progress-percent]");
const progressTrack = progressPercent?.closest(".grid")?.querySelector(".progress-track");
const resultCard = document.querySelector("[data-result-card]");
const resultMeta = document.querySelector("[data-result-meta]");
const downloadLink = document.querySelector("[data-download-link]");

let currentFile = null;
let pages = [];
let draggedId = null;
let downloadUrl = "";
let isProcessing = false;
let documentSequence = 0;
let loadSequence = 0;
let previewSession = null;
let thumbnailQueue = null;
let observer = null;
let thumbnailsAllowed = false;
const cardMap = new Map();

function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${Math.round(bytes / 10_000) / 100} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 100) / 10} KB`;
  return `${bytes} B`;
}

function setProgress(percent, label) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  progressTrack?.style.setProperty("--progress", `${safe}%`);
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
  resultCard?.classList.remove("is-visible");
}

function activePages() {
  return pages.filter((page) => !page.removed);
}

function updateButtons() {
  const hasFile = !!currentFile && pages.length > 0;
  exportButton.disabled = !hasFile || activePages().length === 0 || isProcessing;
  if (clearButton) clearButton.disabled = !hasFile || isProcessing;
  if (resetButton) resetButton.disabled = !hasFile || isProcessing;
}

function actionButton(symbol, label, attribute, pageId) {
  const button = document.createElement("button");
  button.className = "mini-button manager-icon-button";
  button.type = "button";
  button.textContent = symbol;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.setAttribute(attribute, pageId);
  return button;
}

function createPageCard(page) {
  const card = document.createElement("article");
  card.className = "page-card";
  card.draggable = true;
  card.dataset.pageId = page.id;

  const preview = document.createElement("div");
  preview.className = "page-preview thumbnail-stage is-queued";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", `原第 ${page.originalIndex + 1} 页缩略图`);
  const placeholder = document.createElement("strong");
  placeholder.className = "thumbnail-placeholder";
  placeholder.textContent = String(page.originalIndex + 1);
  const previewStatus = document.createElement("span");
  previewStatus.className = "thumbnail-status";
  previewStatus.textContent = "等待预览";
  const retry = document.createElement("button");
  retry.className = "mini-button hidden";
  retry.type = "button";
  retry.textContent = "重试预览";
  retry.dataset.retryThumbnail = page.id;
  preview.append(canvas, placeholder, previewStatus, retry);

  const details = document.createElement("div");
  const title = document.createElement("p");
  title.className = "font-extrabold text-slate-950";
  title.textContent = `原第 ${page.originalIndex + 1} 页`;
  const order = document.createElement("p");
  order.className = "mt-1 text-xs font-semibold text-slate-500";
  details.append(title, order);

  const actions = document.createElement("div");
  actions.className = "page-actions";
  actions.append(
    actionButton("↻", "旋转页面", "data-rotate-page", page.id),
    actionButton("−", "删除页面", "data-toggle-page", page.id),
    actionButton("↑", "上移页面", "data-move-up", page.id),
    actionButton("↓", "下移页面", "data-move-down", page.id)
  );
  card.append(preview, details, actions);

  const entry = { card, preview, canvas, placeholder, previewStatus, retry, title, order, actions };
  cardMap.set(page.id, entry);
  observer?.observe(card);
  return entry;
}

function updatePageCard(page, index) {
  const entry = cardMap.get(page.id) || createPageCard(page);
  entry.card.classList.toggle("is-removed", page.removed);
  entry.card.draggable = !isProcessing;
  entry.card.setAttribute("aria-label", `当前第 ${index + 1} 位，原第 ${page.originalIndex + 1} 页，旋转 ${page.rotation} 度${page.removed ? "，已删除" : ""}`);
  entry.order.textContent = `当前顺序：${index + 1} · 旋转：${page.rotation}°${page.removed ? " · 已删除" : ""}`;
  entry.canvas.style.transform = `rotate(${page.rotation}deg)`;
  const [rotate, toggle, up, down] = entry.actions.querySelectorAll("button");
  rotate.disabled = isProcessing;
  toggle.disabled = isProcessing;
  toggle.textContent = page.removed ? "+" : "−";
  toggle.setAttribute("aria-label", page.removed ? "恢复页面" : "删除页面");
  toggle.title = page.removed ? "恢复页面" : "删除页面";
  up.disabled = index === 0 || isProcessing;
  down.disabled = index === pages.length - 1 || isProcessing;
  return entry;
}

function emptyPlaceholder() {
  const placeholder = document.createElement("div");
  placeholder.className = "rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm leading-6 text-slate-500";
  placeholder.textContent = "上传 PDF 后，页面缩略图会显示在这里。";
  return placeholder;
}

function renderPages() {
  if (!pages.length) {
    pageGrid.replaceChildren(emptyPlaceholder());
    if (pageSummary) pageSummary.textContent = "尚未上传文件";
    updateButtons();
    return;
  }
  if (pageSummary) pageSummary.textContent = `${pages.length} 页，保留 ${activePages().length} 页`;
  pages.forEach((page, index) => {
    const entry = updatePageCard(page, index);
    pageGrid.append(entry.card);
  });
  updateButtons();
}

function setThumbnailState(state, job) {
  const entry = cardMap.get(job.key);
  if (!entry) return;
  entry.preview.classList.toggle("is-rendering", state === "rendering");
  entry.preview.classList.toggle("is-rendered", state === "rendered");
  entry.preview.classList.toggle("is-error", state === "error");
  entry.preview.classList.toggle("is-evicted", state === "evicted");
  entry.previewStatus.textContent = {
    queued: "等待预览",
    rendering: "正在生成预览",
    rendered: "预览已生成",
    error: "预览失败",
    evicted: "预览已释放",
    cancelled: "预览已取消"
  }[state] || "等待预览";
  entry.retry.classList.toggle("hidden", !["error", "evicted"].includes(state));
}

async function requestThumbnail(pageId) {
  if (!thumbnailsAllowed) return;
  await ensurePreview();
  const page = pages.find((item) => item.id === pageId);
  const entry = cardMap.get(pageId);
  if (!page || !entry || !thumbnailQueue) return;
  try {
    await thumbnailQueue.request({
      key: page.id,
      pageNumber: page.originalIndex + 1,
      canvas: entry.canvas,
      maxWidth: 240,
      maxHeight: 320,
      rotation: 0
    });
  } catch {
    setThumbnailState("error", { key: page.id });
  }
}

function createObserver() {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    for (const observed of entries) {
      if (!observed.isIntersecting) continue;
      observer.unobserve(observed.target);
      void requestThumbnail(observed.target.dataset.pageId);
    }
  }, { rootMargin: "320px 0px" });
}

async function ensurePreview() {
  if (!thumbnailsAllowed || previewSession || !currentFile) return;
  previewSession = await createPdfPreview(currentFile);
  thumbnailQueue = createThumbnailQueue(previewSession, { onState: setThumbnailState });
}

async function teardownPreview() {
  observer?.disconnect();
  observer = null;
  await thumbnailQueue?.destroy();
  thumbnailQueue = null;
  await previewSession?.destroy();
  previewSession = null;
  for (const entry of cardMap.values()) {
    entry.canvas.width = 0;
    entry.canvas.height = 0;
    entry.preview.classList.remove("is-rendering", "is-rendered");
  }
}

function isPdf(file) {
  return file && file.size > 0 && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
}

async function loadFile(file) {
  const loadId = ++loadSequence;
  clearError();
  clearDownload();
  if (!isPdf(file)) {
    showError("请选择有效且非空的 PDF 文件。");
    return;
  }
  await teardownPreview();
  if (loadId !== loadSequence) return;
  cardMap.clear();
  pageGrid.replaceChildren();
  currentFile = file;
  documentSequence += 1;
  setProgress(10, "正在读取 PDF 页面");
  let nextPreviewSession = null;
  try {
    nextPreviewSession = await createPdfPreview(file);
    if (loadId !== loadSequence) {
      await nextPreviewSession.destroy();
      return;
    }
    previewSession = nextPreviewSession;
    nextPreviewSession = null;
    pages = createManagedPages(`document-${documentSequence}`, previewSession.pageCount);
    thumbnailsAllowed = shouldRenderThumbnails({ inputBytes: file.size, pageCount: pages.length });
    if (thumbnailsAllowed) {
      thumbnailQueue = createThumbnailQueue(previewSession, { onState: setThumbnailState });
      resourceNotice.classList.add("hidden");
    } else {
      await previewSession.destroy();
      previewSession = null;
      resourceNotice.textContent = "为控制浏览器内存，当前文件使用编号占位；删除、旋转、排序和导出仍可正常使用。";
      resourceNotice.classList.remove("hidden");
    }
    createObserver();
    if (fileInfo) {
      fileInfo.textContent = `已选择：${file.name}，共 ${pages.length} 页，大小 ${formatBytes(file.size)}。`;
      fileInfo.classList.remove("hidden");
    }
    renderPages();
    for (const entry of cardMap.values()) observer.observe(entry.card);
    setProgress(0, "可以管理页面");
  } catch {
    await nextPreviewSession?.destroy();
    if (loadId !== loadSequence) return;
    await resetState(false);
    showError("无法打开该 PDF。文件可能已损坏、加密或格式不正确。");
    setProgress(0, "读取失败");
  }
}

function invalidateResult() {
  clearDownload();
}

function movePage(id, direction) {
  pages = moveManagedPage(pages, id, direction);
  invalidateResult();
  renderPages();
}

function rotatePage(id) {
  pages = rotateManagedPage(pages, id);
  invalidateResult();
  renderPages();
}

function togglePage(id) {
  pages = toggleManagedPage(pages, id);
  invalidateResult();
  renderPages();
}

async function exportPdf() {
  if (!currentFile || isProcessing) return;
  const kept = activePages();
  if (!kept.length) {
    showError("至少需要保留 1 页才能导出。");
    return;
  }
  isProcessing = true;
  updateButtons();
  clearError();
  clearDownload();
  try {
    setProgress(6, "正在释放页面预览");
    await teardownPreview();
    setProgress(12, "正在重新读取原文件");
    const sourceBytes = await currentFile.arrayBuffer();
    const sourceDocument = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const outputDocument = await window.PDFLib.PDFDocument.create();
    for (let index = 0; index < kept.length; index += 1) {
      const item = kept[index];
      setProgress(12 + (index / kept.length) * 78, `正在复制原第 ${item.originalIndex + 1} 页`);
      const [page] = await outputDocument.copyPages(sourceDocument, [item.originalIndex]);
      const originalRotation = page.getRotation().angle || 0;
      page.setRotation(window.PDFLib.degrees((originalRotation + item.rotation) % 360));
      outputDocument.addPage(page);
    }
    const bytes = await outputDocument.save({ useObjectStreams: true });
    const blob = new Blob([bytes], { type: "application/pdf" });
    downloadUrl = URL.createObjectURL(blob);
    downloadLink.href = downloadUrl;
    downloadLink.download = `pdftool-managed-${new Date().toISOString().slice(0, 10)}.pdf`;
    resultMeta.textContent = `已导出 ${kept.length} 页，删除 ${pages.length - kept.length} 页，结果大小 ${formatBytes(blob.size)}。`;
    resultCard.classList.add("is-visible");
    resourceNotice.textContent = "导出时已释放缩略图内存；继续编辑时可点击页面中的“重试预览”重新加载。";
    resourceNotice.classList.remove("hidden");
    for (const page of pages) setThumbnailState("evicted", { key: page.id });
    setProgress(100, "导出完成，可以下载结果");
  } catch (error) {
    showError(error?.message || "导出失败，请检查 PDF 文件后重试。");
    setProgress(0, "导出失败");
  } finally {
    isProcessing = false;
    renderPages();
  }
}

async function resetState(clearInput = true) {
  loadSequence += 1;
  await teardownPreview();
  currentFile = null;
  pages = [];
  thumbnailsAllowed = false;
  draggedId = null;
  cardMap.clear();
  if (clearInput && input) input.value = "";
  clearDownload();
  clearError();
  fileInfo?.classList.add("hidden");
  resourceNotice?.classList.add("hidden");
  setProgress(0, "等待上传 PDF");
  renderPages();
}

pageGrid.addEventListener("click", (event) => {
  const retry = event.target.closest("[data-retry-thumbnail]");
  const rotate = event.target.closest("[data-rotate-page]");
  const toggle = event.target.closest("[data-toggle-page]");
  const up = event.target.closest("[data-move-up]");
  const down = event.target.closest("[data-move-down]");
  if (retry) void requestThumbnail(retry.getAttribute("data-retry-thumbnail"));
  if (rotate) rotatePage(rotate.getAttribute("data-rotate-page"));
  if (toggle) togglePage(toggle.getAttribute("data-toggle-page"));
  if (up) movePage(up.getAttribute("data-move-up"), -1);
  if (down) movePage(down.getAttribute("data-move-down"), 1);
});

pageGrid.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-page-id]");
  if (!card || isProcessing) return;
  draggedId = card.dataset.pageId;
  card.classList.add("is-dragging");
});
pageGrid.addEventListener("dragend", (event) => {
  event.target.closest("[data-page-id]")?.classList.remove("is-dragging");
  draggedId = null;
});
pageGrid.addEventListener("dragover", (event) => event.preventDefault());
pageGrid.addEventListener("drop", (event) => {
  event.preventDefault();
  const targetId = event.target.closest("[data-page-id]")?.dataset.pageId;
  if (!draggedId || !targetId || draggedId === targetId) return;
  const from = pages.findIndex((page) => page.id === draggedId);
  const to = pages.findIndex((page) => page.id === targetId);
  if (from < 0 || to < 0) return;
  const next = [...pages];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  pages = next;
  invalidateResult();
  renderPages();
});

selectButton?.addEventListener("click", () => input.click());
input?.addEventListener("change", () => void loadFile(input.files?.[0]));
exportButton?.addEventListener("click", exportPdf);
clearButton?.addEventListener("click", () => void resetState(true));
resetButton?.addEventListener("click", () => void resetState(true));
dropZone?.addEventListener("click", (event) => {
  if (!event.target.closest("[data-select-file]")) input.click();
});
dropZone?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    input.click();
  }
});
["dragenter", "dragover"].forEach((name) => dropZone?.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragover");
}));
["dragleave", "drop"].forEach((name) => dropZone?.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragover");
}));
dropZone?.addEventListener("drop", (event) => void loadFile(event.dataTransfer.files?.[0]));
window.addEventListener("beforeunload", () => {
  clearDownload();
  void teardownPreview();
});

window.__managerDebug = {
  getCard: (id) => cardMap.get(id)?.card,
  getMetrics: () => thumbnailQueue?.getMetrics() || { cacheEntries: 0, cacheBytes: 0, trackedCanvases: 0 }
};

renderPages();
