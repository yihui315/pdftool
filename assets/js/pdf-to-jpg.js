await import("/assets/js/pdfjs-polyfills.mjs");
const pdfjsLib = await import("/assets/vendor/pdfjs/pdf.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/js/pdf-worker-entry.mjs";

(function() {
  'use strict';

  var fileInput = document.querySelector('[data-file-input]');
  var dropZone = document.querySelector('[data-drop-zone]');
  var clearBtn = document.querySelector('[data-clear-file]');
  var fileNameBanner = document.querySelector('[data-file-name]');
  var displayName = document.querySelector('[data-display-name]');
  var pageCountDisplay = document.getElementById('page-count-display');
  var pageCountEl = document.getElementById('page-count');
  var previewArea = document.getElementById('preview-area');
  var imageGrid = document.getElementById('image-grid');
  var actionArea = document.getElementById('action-area');
  var convertBtn = document.getElementById('convert-btn');
  var loadingIndicator = document.getElementById('loading-indicator');
  var loadingText = document.getElementById('loading-text');
  var downloadAllBtn = document.getElementById('download-all');
  var outputFormat = document.getElementById('output-format');
  var outputQuality = document.getElementById('output-quality');

  var currentPdf = null;
  var currentImages = [];
  var totalPages = 0;

  function clearImages() {
    currentImages.forEach(function(image) { URL.revokeObjectURL(image.url); });
    currentImages = [];
  }

  function showFileBanner(name) {
    fileNameBanner.style.display = 'block';
    displayName.textContent = name;
  }

  function hideFileBanner() {
    fileNameBanner.style.display = 'none';
  }

  function enable(btn) { btn && (btn.disabled = false); }
  function disable(btn) { btn && (btn.disabled = true); }

  function handleFile(file) {
    if (!file || file.type !== 'application/pdf') return;
    if (currentPdf) void currentPdf.destroy().catch(function() {});
    currentPdf = null;
    clearImages();
    showFileBanner(file.name);
    enable(clearBtn);

    var reader = new FileReader();
    reader.onload = function(e) {
      var typedarray = new Uint8Array(e.target.result);
      var pdfJsBaseUrl = new URL("/assets/vendor/pdfjs/", window.location.href);
      pdfjsLib.getDocument({
        data: typedarray,
        cMapUrl: new URL("cmaps/", pdfJsBaseUrl).href,
        cMapPacked: true,
        standardFontDataUrl: new URL("standard_fonts/", pdfJsBaseUrl).href,
        wasmUrl: new URL("wasm/", pdfJsBaseUrl).href,
        iccUrl: new URL("iccs/", pdfJsBaseUrl).href,
        useWorkerFetch: false,
        isImageDecoderSupported: false,
        isEvalSupported: false
      }).promise.then(function(pdf) {
        currentPdf = pdf;
        totalPages = pdf.numPages;
        pageCountEl.textContent = totalPages;
        pageCountDisplay.style.display = 'block';
        actionArea.style.display = 'block';
        enable(convertBtn);
        previewArea.style.display = 'none';
        currentImages = [];
      }).catch(function(err) {
        alert('无法读取 PDF：' + err.message);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  fileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('click', function(e) {
    if (e.target !== dropZone.querySelector('button')) fileInput.click();
  });

  dropZone.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  clearBtn.addEventListener('click', function() {
    if (currentPdf) void currentPdf.destroy().catch(function() {});
    currentPdf = null;
    clearImages();
    totalPages = 0;
    fileInput.value = '';
    hideFileBanner();
    pageCountDisplay.style.display = 'none';
    previewArea.style.display = 'none';
    actionArea.style.display = 'none';
    disable(clearBtn);
    disable(convertBtn);
    disable(downloadAllBtn);
  });

  convertBtn.addEventListener('click', function() {
    if (!currentPdf) return;
    var scale = outputQuality.value === '0.95' ? 2 : 1;
    var format = outputFormat.value;
    var mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    var quality = format === 'png' ? undefined : parseFloat(outputQuality.value);

    imageGrid.innerHTML = '';
    previewArea.style.display = 'block';
    actionArea.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    disable(convertBtn);
    disable(downloadAllBtn);
    clearImages();

    var rendered = 0;

    for (var i = 1; i <= totalPages; i++) {
      (function(pageNum) {
        currentPdf.getPage(pageNum).then(function(page) {
          var viewport = page.getViewport({scale: scale});
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          page.render({canvasContext: ctx, viewport: viewport}).promise.then(function() {
            canvas.toBlob(function(blob) {
              var url = URL.createObjectURL(blob);
              currentImages.push({page: pageNum, url: url, name: 'page-' + pageNum + '.' + format});

              var card = document.createElement('div');
              card.className = 'border border-slate-200 rounded-lg overflow-hidden bg-white';
              card.innerHTML = '<div class="p-2 bg-slate-50 text-center text-sm font-semibold text-slate-600">第 ' + pageNum + ' 页</div><img src="' + url + '" class="w-full" alt="Page ' + pageNum + '"/><div class="p-2 text-center"><a href="' + url + '" download="page-' + pageNum + '.' + format + '" class="btn btn-secondary text-sm">下载</a></div>';
              imageGrid.appendChild(card);

              rendered++;
              loadingText.textContent = '正在渲染第 ' + Math.min(rendered + 1, totalPages) + ' 页...';

              if (rendered === totalPages) {
                loadingIndicator.style.display = 'none';
                enable(downloadAllBtn);
              }
            }, mimeType, quality);
          });
        });
      })(i);
    }
  });

  downloadAllBtn.addEventListener('click', function() {
    if (currentImages.length === 0) return;
    // Simple approach: download each in sequence
    currentImages.forEach(function(img, idx) {
      setTimeout(function() {
        var a = document.createElement('a');
        a.href = img.url;
        a.download = img.name;
        a.click();
      }, idx * 300);
    });
  });

  // Drag and drop
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('drop-zone-hover');
  });
  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('drop-zone-hover');
  });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drop-zone-hover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  window.addEventListener('beforeunload', function() {
    if (currentPdf) void currentPdf.destroy().catch(function() {});
    clearImages();
  });
})();
