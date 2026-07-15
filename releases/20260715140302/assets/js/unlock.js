(function () {
  'use strict';

  const dropZone = document.querySelector('[data-drop-zone]');
  const fileInput = document.querySelector('[data-file-input]');
  const selectBtn = document.querySelector('[data-select-files]');
  const fileList = document.querySelector('[data-file-list]');
  const fileSummary = document.querySelector('[data-file-summary]');
  const clearBtn = document.querySelector('[data-clear-files]');
  const passwordInput = document.querySelector('[data-password-input]');
  const togglePasswordBtn = document.querySelector('[data-toggle-password-visibility]');
  const unlockBtn = document.querySelector('[data-unlock-button]');
  const demoResetBtn = document.querySelector('[data-demo-reset]');
  const progressFill = document.querySelector('[data-progress-fill]');
  const progressPercent = document.querySelector('[data-progress-percent]');
  const progressLabel = document.querySelector('[data-progress-label]');
  const errorBox = document.querySelector('[data-error-box]');
  const resultCard = document.querySelector('[data-result-card]');
  const downloadLink = document.querySelector('[data-download-link]');
  const resultMeta = document.querySelector('[data-result-meta]');
  const largeFileTip = document.querySelector('[data-large-file-tip]');

  let selectedFile = null;
  let unlockedPdfBytes = null;

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function setProgress(val, label) {
    progressFill.style.width = val + '%';
    progressPercent.textContent = val + '%';
    if (label) progressLabel.textContent = label;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function hideError() {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }

  function setLoading(loading) {
    unlockBtn.disabled = loading || !selectedFile || !passwordInput.value;
    selectBtn.disabled = loading;
    clearBtn.disabled = loading;
    fileInput.disabled = loading;
  }

  function updateFileUI(file) {
    if (!file) {
      fileList.innerHTML = '<div class="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm leading-6 text-slate-500">选择 PDF 后，文件信息会显示在这里。</div>';
      fileSummary.textContent = '尚未选择文件';
      largeFileTip.classList.add('hidden');
      clearBtn.disabled = true;
      unlockBtn.disabled = true;
      demoResetBtn.disabled = true;
      passwordInput.disabled = true;
      return;
    }

    const isLarge = file.size > 20 * 1024 * 1024;
    const html = `
      <div class="file-item" data-file-item>
        <div class="file-icon text-red-500">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 2h8l4 4v16H6z" fill="currentColor" opacity=".14"></path>
            <path d="M14 2v5h5" fill="none" stroke="currentColor" stroke-width="1.8"></path>
            <path d="M8.5 12h7M8.5 15h7M8.5 18h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          </svg>
        </div>
        <div class="file-info">
          <p class="file-name text-slate-900 font-semibold text-sm truncate">${escapeHtml(file.name)}</p>
          <p class="file-size text-slate-500 text-xs">${formatBytes(file.size)}</p>
        </div>
        <button type="button" class="file-remove" data-remove-file aria-label="移除文件">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </button>
      </div>
    `;
    fileList.innerHTML = html;
    fileSummary.textContent = file.name;

    if (isLarge) {
      largeFileTip.classList.remove('hidden');
    } else {
      largeFileTip.classList.add('hidden');
    }

    clearBtn.disabled = false;
    demoResetBtn.disabled = false;
    passwordInput.disabled = false;
    passwordInput.focus();

    updateUnlockButton();
  }

  function updateUnlockButton() {
    unlockBtn.disabled = !selectedFile || !passwordInput.value.trim() || false;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      showError('请选择 PDF 文件。');
      return;
    }
    hideError();
    selectedFile = file;
    updateFileUI(file);
    resultCard.classList.add('hidden');
    unlockedPdfBytes = null;
    setProgress(0, '等待操作');
  }

  // Drop zone
  if (dropZone) {
    dropZone.addEventListener('click', (e) => {
      if (e.target === selectBtn || selectBtn.contains(e.target)) return;
      fileInput.click();
    });

    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      handleFileSelect(fileInput.files[0]);
    });
  }

  if (selectBtn) {
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      selectedFile = null;
      unlockedPdfBytes = null;
      fileInput.value = '';
      passwordInput.value = '';
      hideError();
      setProgress(0, '等待上传 PDF');
      updateFileUI(null);
      resultCard.classList.add('hidden');
      largeFileTip.classList.add('hidden');
    });
  }

  if (demoResetBtn) {
    demoResetBtn.addEventListener('click', () => {
      selectedFile = null;
      unlockedPdfBytes = null;
      fileInput.value = '';
      passwordInput.value = '';
      hideError();
      setProgress(0, '等待上传 PDF');
      updateFileUI(null);
      resultCard.classList.add('hidden');
      largeFileTip.classList.add('hidden');
    });
  }

  // Password toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.querySelector('.eye-open')?.classList.toggle('hidden', !isPassword);
      togglePasswordBtn.querySelector('.eye-closed')?.classList.toggle('hidden', isPassword);
    });
  }

  // Password input
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updateUnlockButton();
    });
  }

  // Unlock button
  if (unlockBtn) {
    unlockBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
      const password = passwordInput.value.trim();
      if (!password) {
        showError('请输入 PDF 的打开密码。');
        return;
      }

      hideError();
      setLoading(true);
      setProgress(10, '正在读取 PDF');

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        setProgress(30, '正在验证密码');

        let pdfDoc;
        try {
          pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
            password: password,
            ignoreEncryption: false,
            updateMetadata: false,
          });
        } catch (loadErr) {
          const msg = loadErr.message || '';
          if (
            msg.toLowerCase().includes('password') ||
            msg.toLowerCase().includes('encrypt') ||
            msg.toLowerCase().includes('decrypt') ||
            msg.toLowerCase().includes('invalid password') ||
            msg.toLowerCase().includes('wrong password')
          ) {
            showError('密码错误，请检查后重试。如果 PDF 使用了强加密，当前工具可能无法处理。');
          } else {
            showError('无法读取该 PDF 文件。请确认文件未损坏且为有效的 PDF。错误信息：' + loadErr.message);
          }
          setLoading(false);
          setProgress(0, '解锁失败');
          return;
        }

        setProgress(60, '正在生成无密码 PDF');

        // Create a new PDF without encryption by copying pages
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const pageCount = pdfDoc.getPageCount();

        for (let i = 0; i < pageCount; i++) {
          const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
          newPdfDoc.addPage(copiedPage);
        }

        setProgress(80, '正在编码输出文件');

        unlockedPdfBytes = await newPdfDoc.save();

        setProgress(100, '解锁完成');

        // Prepare download
        const blob = new Blob([unlockedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const originalName = selectedFile.name.replace(/\.pdf$/i, '');
        downloadLink.href = url;
        downloadLink.download = originalName + '-unlocked.pdf';

        resultMeta.textContent = `已成功解锁 "${selectedFile.name}"，生成无密码 PDF（${formatBytes(unlockedPdfBytes.byteLength)}）。`;
        resultCard.classList.remove('hidden');

        // Try to trigger ads
        if (window.adsbygoogle && window.adsbygoogle.length !== undefined) {
          try { window.adsbygoogle.push({}); } catch (_) {}
        }

      } catch (err) {
        console.error('PDF unlock error:', err);
        showError('处理 PDF 时出错：' + (err.message || '未知错误') + '。部分 PDF 使用了浏览器无法处理的强加密。');
        setProgress(0, '解锁失败');
      } finally {
        setLoading(false);
      }
    });
  }

  // Remove file button (event delegation)
  if (fileList) {
    fileList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove-file]');
      if (!removeBtn) return;
      selectedFile = null;
      unlockedPdfBytes = null;
      fileInput.value = '';
      passwordInput.value = '';
      hideError();
      setProgress(0, '等待上传 PDF');
      updateFileUI(null);
      resultCard.classList.add('hidden');
      largeFileTip.classList.add('hidden');
    });
  }

})();
