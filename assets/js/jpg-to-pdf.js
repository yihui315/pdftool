(function() {
  'use strict';

  var fileInput = document.getElementById('file-input');
  var dropZone = document.getElementById('drop-zone');
  var selectBtn = document.getElementById('select-btn');
  var clearBtn = document.getElementById('clear-btn');
  var fileBanner = document.getElementById('file-banner');
  var fileCountEl = document.getElementById('file-count');
  var previewArea = document.getElementById('preview-area');
  var sortableList = document.getElementById('sortable-list');
  var convertBtn = document.getElementById('convert-btn');
  var loadingIndicator = document.getElementById('loading-indicator');
  var loadingText = document.getElementById('loading-text');
  var resultArea = document.getElementById('result-area');
  var downloadBtn = document.getElementById('download-btn');

  var imageFiles = []; // {file, dataUrl, width, height}
  var pdfBlob = null;

  function renderList() {
    sortableList.innerHTML = '';
    imageFiles.forEach(function(item, idx) {
      var card = document.createElement('div');
      card.className = 'border border-slate-200 rounded-lg overflow-hidden bg-white draggable-card cursor-move';
      card.draggable = true;
      card.dataset.index = idx;
      card.innerHTML = '<div class="p-2 bg-slate-50 text-center text-sm font-semibold text-slate-600 flex items-center justify-between"><span>第 ' + (idx+1) + ' 页</span><button class="text-red-500 hover:text-red-700 font-normal text-xs remove-btn" data-idx="' + idx + '">移除</button></div><img src="' + item.dataUrl + '" class="w-full object-contain max-h-48" alt="Image ' + (idx+1) + '"/>';
      sortableList.appendChild(card);
    });

    sortableList.querySelectorAll('.remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        imageFiles.splice(idx, 1);
        renderList();
        updateUI();
      });
    });

    // Drag to reorder
    var cards = sortableList.querySelectorAll('.draggable-card');
    var dragSrcEl = null;
    cards.forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        dragSrcEl = this;
        this.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function() {
        this.style.opacity = '1';
      });
      card.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      card.addEventListener('drop', function(e) {
        e.preventDefault();
        if (dragSrcEl !== this) {
          var srcIdx = parseInt(dragSrcEl.dataset.index);
          var tgtIdx = parseInt(this.dataset.index);
          var temp = imageFiles[srcIdx];
          imageFiles[srcIdx] = imageFiles[tgtIdx];
          imageFiles[tgtIdx] = temp;
          renderList();
        }
      });
    });
  }

  function updateUI() {
    fileCountEl.textContent = imageFiles.length;
    fileBanner.style.display = imageFiles.length > 0 ? 'block' : 'none';
    previewArea.style.display = imageFiles.length > 0 ? 'block' : 'none';
    resultArea.style.display = 'none';
    clearBtn.disabled = imageFiles.length === 0;
    convertBtn.disabled = imageFiles.length === 0;
  }

  function loadImage(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          resolve({file: file, dataUrl: e.target.result, width: img.width, height: img.height});
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  fileInput.addEventListener('change', async function(e) {
    var files = Array.prototype.slice.call(e.target.files);
    loadingText.textContent = '正在加载图片...';
    loadingIndicator.style.display = 'flex';
    for (var i = 0; i < files.length; i++) {
      loadingText.textContent = '正在加载第 ' + (i+1) + ' / ' + files.length + ' 张...';
      var item = await loadImage(files[i]);
      imageFiles.push(item);
    }
    loadingIndicator.style.display = 'none';
    renderList();
    updateUI();
  });

  selectBtn.addEventListener('click', function() { fileInput.click(); });

  dropZone.addEventListener('click', function(e) {
    if (e.target !== selectBtn) fileInput.click();
  });

  dropZone.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  clearBtn.addEventListener('click', function() {
    imageFiles = [];
    pdfBlob = null;
    fileInput.value = '';
    renderList();
    updateUI();
  });

  convertBtn.addEventListener('click', async function() {
    if (imageFiles.length === 0) return;
    loadingIndicator.style.display = 'flex';
    loadingText.textContent = '正在生成 PDF...';
    convertBtn.disabled = true;

    await new Promise(function(resolve) { setTimeout(resolve, 50); });

    try {
      var { PDFDocument } = PDFLib;
      var pdfDoc = await PDFDocument.create();

      for (var i = 0; i < imageFiles.length; i++) {
        loadingText.textContent = '正在处理第 ' + (i+1) + ' / ' + imageFiles.length + ' 页...';
        var item = imageFiles[i];
        var imgData = item.dataUrl;

        var img;
        if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) {
          img = await pdfDoc.embedJpg(item.dataUrl);
        } else if (imgData.startsWith('data:image/png')) {
          img = await pdfDoc.embedPng(item.dataUrl);
        } else {
          // Convert other formats to JPEG via canvas
          var canvas = document.createElement('canvas');
          canvas.width = item.width;
          canvas.height = item.height;
          var ctx = canvas.getContext('2d');
          var imgEl = new Image();
          await new Promise(function(res) {
            imgEl.onload = res;
            imgEl.src = item.dataUrl;
          });
          ctx.drawImage(imgEl, 0, 0);
          var jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          img = await pdfDoc.embedJpg(jpegDataUrl);
        }

        var page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, {x: 0, y: 0, width: img.width, height: img.height});
      }

      pdfBlob = await pdfDoc.save();
      var pdfUrl = URL.createObjectURL(new Blob([pdfBlob], {type: 'application/pdf'}));
      downloadBtn.onclick = function() {
        var a = document.createElement('a');
        a.href = pdfUrl;
        a.download = 'converted.pdf';
        a.click();
      };

      loadingIndicator.style.display = 'none';
      resultArea.style.display = 'block';
      convertBtn.disabled = false;
    } catch(err) {
      loadingIndicator.style.display = 'none';
      alert('生成 PDF 出错：' + err.message);
      convertBtn.disabled = false;
    }
  });

  // Drag and drop on dropZone
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('drop-zone-hover');
  });
  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('drop-zone-hover');
  });
  dropZone.addEventListener('drop', async function(e) {
    e.preventDefault();
    dropZone.classList.remove('drop-zone-hover');
    var files = Array.prototype.slice.call(e.dataTransfer.files).filter(function(f) {
      return f.type.startsWith('image/');
    });
    if (files.length === 0) return;
    loadingText.textContent = '正在加载图片...';
    loadingIndicator.style.display = 'flex';
    for (var i = 0; i < files.length; i++) {
      loadingText.textContent = '正在加载第 ' + (i+1) + ' / ' + files.length + ' 张...';
      var item = await loadImage(files[i]);
      imageFiles.push(item);
    }
    loadingIndicator.style.display = 'none';
    renderList();
    updateUI();
  });
})();
