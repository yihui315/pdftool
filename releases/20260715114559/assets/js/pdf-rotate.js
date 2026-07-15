(function() {
  'use strict';

  var fileInput = document.getElementById('file-input');
  var dropZone = document.getElementById('drop-zone');
  var selectBtn = document.getElementById('select-btn');
  var clearBtn = document.getElementById('clear-btn');
  var rotateAllBtn = document.getElementById('rotate-all-btn');
  var fileBanner = document.getElementById('file-banner');
  var fileNameEl = document.getElementById('file-name');
  var pageCountEl = document.getElementById('page-count');
  var previewArea = document.getElementById('preview-area');
  var pageGrid = document.getElementById('page-grid');
  var exportBtn = document.getElementById('export-btn');
  var loadingIndicator = document.getElementById('loading-indicator');
  var loadingText = document.getElementById('loading-text');

  var pdfDoc = null;
  var pages = []; // {pageIndex, rotation: 0|90|180|270}

  function renderPages() {
    pageGrid.innerHTML = '';
    pages.forEach(function(p, idx) {
      var card = document.createElement('div');
      card.className = 'border border-slate-200 rounded-lg overflow-hidden bg-white';
      card.innerHTML = '<div class="p-2 bg-slate-50 text-center text-sm font-semibold text-slate-600 flex items-center justify-between"><span>第 ' + (idx+1) + ' 页</span><span class="text-xs text-slate-400">' + p.rotation + '°</span></div><div class="p-3 flex items-center justify-center bg-slate-100" style="min-height:160px"><div class="text-6xl text-slate-300" style="transform:rotate(' + p.rotation + 'deg)">📄</div></div><div class="p-2 text-center"><button class="btn btn-secondary text-xs rotate-btn" data-idx="' + idx + '">旋转 90°</button></div>';
      pageGrid.appendChild(card);
    });

    pageGrid.querySelectorAll('.rotate-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        pages[idx].rotation = (pages[idx].rotation + 90) % 360;
        renderPages();
      });
    });
  }

  function updateUI() {
    var hasFile = pdfDoc !== null;
    fileBanner.style.display = hasFile ? 'block' : 'none';
    previewArea.style.display = hasFile ? 'block' : 'none';
    clearBtn.disabled = !hasFile;
    rotateAllBtn.disabled = !hasFile;
    exportBtn.disabled = !hasFile;
  }

  fileInput.addEventListener('change', async function(e) {
    if (!e.target.files[0]) return;
    var file = e.target.files[0];
    fileNameEl.textContent = file.name;
    loadingText.textContent = '正在读取 PDF...';
    loadingIndicator.style.display = 'flex';

    try {
      var arrayBuffer = await file.arrayBuffer();
      pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      var total = pdfDoc.getPageCount();
      pageCountEl.textContent = total;
      pages = [];
      for (var i = 0; i < total; i++) {
        var originalRotation = pdfDoc.getPage(i).getRotation().angle;
        var angle = originalRotation || 0;
        // pdf-lib rotations are in degrees
        pages.push({pageIndex: i, rotation: angle});
      }
      renderPages();
      updateUI();
    } catch(err) {
      alert('无法读取 PDF：' + err.message);
    } finally {
      loadingIndicator.style.display = 'none';
    }
  });

  selectBtn.addEventListener('click', function() { fileInput.click(); });
  dropZone.addEventListener('click', function(e) { if (e.target !== selectBtn) fileInput.click(); });
  dropZone.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

  clearBtn.addEventListener('click', function() {
    pdfDoc = null;
    pages = [];
    fileInput.value = '';
    pageGrid.innerHTML = '';
    updateUI();
  });

  rotateAllBtn.addEventListener('click', function() {
    pages.forEach(function(p) {
      p.rotation = (p.rotation + 90) % 360;
    });
    renderPages();
  });

  exportBtn.addEventListener('click', async function() {
    if (!pdfDoc) return;
    loadingText.textContent = '正在应用旋转...';
    loadingIndicator.style.display = 'flex';
    exportBtn.disabled = true;

    try {
      // Reload to reset
      var newPdf = await PDFLib.PDFDocument.create();
      var oldPdf = pdfDoc;
      var total = oldPdf.getPageCount();

      for (var i = 0; i < total; i++) {
        var oldPage = oldPdf.getPage(i);
        var [copiedPage] = await newPdf.copyPages(oldPdf, [i]);
        var rot = pages[i].rotation;
        if (rot === 90 || rot === 270) {
          copiedPage.setRotation(PDFLib.degrees(rot));
        } else if (rot === 180) {
          copiedPage.setRotation(PDFLib.degrees(180));
        }
        newPdf.addPage(copiedPage);
      }

      var pdfBytes = await newPdf.save();
      var blob = new Blob([pdfBytes], {type: 'application/pdf'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'rotated.pdf';
      a.click();

      loadingIndicator.style.display = 'none';
      exportBtn.disabled = false;
    } catch(err) {
      loadingIndicator.style.display = 'none';
      alert('导出失败：' + err.message);
      exportBtn.disabled = false;
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drop-zone-hover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drop-zone-hover'); });
  dropZone.addEventListener('drop', async function(e) {
    e.preventDefault();
    dropZone.classList.remove('drop-zone-hover');
    if (e.dataTransfer.files[0] && e.dataTransfer.files[0].type === 'application/pdf') {
      var dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
})();
