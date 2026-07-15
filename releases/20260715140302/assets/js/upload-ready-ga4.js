/**
 * V7-Safe GA4 Event Tracking for upload-ready.html
 *
 * 必须上报的7个事件:
 * 1. target_size_select - 用户点击目标大小
 * 2. pdf_file_selected - 用户选择文件
 * 3. pdf_process_start - 开始处理
 * 4. pdf_process_success - 处理成功
 * 5. pdf_process_failed - 处理失败
 * 6. pdf_download_click - 下载点击
 * 7. services_cta_click - services点击
 */

(function() {
  'use strict';

  // 安全追踪函数
  function safeTrackEvent(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
      console.log('[GA4]', name, params);
    } else {
      console.log('[GA4 Queue]', name, params);
    }
  }

  // 暴露到全局
  window.safeTrackEvent = safeTrackEvent;

  // 事件绑定辅助函数
  function bindEvent(element, event, handler) {
    if (element && element.addEventListener) {
      element.addEventListener(event, handler);
    }
  }

  // 1. 目标大小选择
  document.querySelectorAll('[data-target-radio]').forEach(function(el) {
    bindEvent(el, 'change', function() {
      safeTrackEvent('target_size_select', {
        target_size: el.value
      });
    });
  });

  // 2. 文件选择
  var fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    bindEvent(fileInput, 'change', function(e) {
      var file = e.target.files && e.target.files[0];
      if (file) {
        var sizeBucket = 'unknown';
        var size = file.size;
        if (size < 500 * 1024) sizeBucket = '<500kb';
        else if (size < 2 * 1024 * 1024) sizeBucket = '500kb-2mb';
        else if (size < 10 * 1024 * 1024) sizeBucket = '2mb-10mb';
        else sizeBucket = '>10mb';

        safeTrackEvent('pdf_file_selected', {
          file_size_bucket: sizeBucket
        });
      }
    });
  }

  // 3. 开始处理 (当用户点击处理按钮时)
  var processBtn = document.querySelector('[data-start-button]');
  if (processBtn) {
    bindEvent(processBtn, 'click', function() {
      safeTrackEvent('pdf_process_start', {});
    });
  }

  // 4. 处理成功 (通过自定义事件触发)
  document.addEventListener('pdf-process-success', function(e) {
    safeTrackEvent('pdf_process_success', {
      original_size_bucket: e.detail.original || 'unknown',
      result_size_bucket: e.detail.result || 'unknown',
      target_size: e.detail.target || 'unknown'
    });
  });

  // 5. 处理失败 (通过自定义事件触发)
  document.addEventListener('pdf-process-failed', function(e) {
    safeTrackEvent('pdf_process_failed', {
      error_type: e.detail.error || 'unknown'
    });
  });

  // 6. 下载点击
  document.querySelectorAll('[data-action="download"]').forEach(function(el) {
    bindEvent(el, 'click', function() {
      safeTrackEvent('pdf_download_click', {});
    });
  });

  // 7. Services CTA 点击
  document.querySelectorAll('[data-action="services"]').forEach(function(el) {
    bindEvent(el, 'click', function() {
      var source = 'upload_ready_error';
      if (el.hasAttribute('data-source')) {
        source = el.getAttribute('data-source');
      }
      safeTrackEvent('services_cta_click', {
        source: source
      });
    });
  });

  console.log('[GA4] Event tracking initialized');
})();
