(function () {
  const currentYear = document.querySelector("[data-current-year]");
  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  const toggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");

  if (toggle && mobileMenu) {
    const openIcon = toggle.querySelector(".menu-open");
    const closeIcon = toggle.querySelector(".menu-close");

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      mobileMenu.classList.toggle("hidden", isOpen);
      openIcon?.classList.toggle("hidden", !isOpen);
      closeIcon?.classList.toggle("hidden", isOpen);
    });
  }

  // Language menu toggle — uses [hidden] attribute, not .hidden class
  const langToggle = document.querySelector("[data-language-toggle]");
  const langMenu = document.querySelector("[data-language-menu]");
  if (langToggle && langMenu) {
    langToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = langMenu.hasAttribute("hidden");
      if (isHidden) {
        langMenu.removeAttribute("hidden");
      } else {
        langMenu.setAttribute("hidden", "");
      }
      langToggle.setAttribute("aria-expanded", String(isHidden));
    });
    document.addEventListener("click", (e) => {
      if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.setAttribute("hidden", "");
        langToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href === currentFile || (currentFile === "" && href === "index.html")) {
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-faq-button]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      if (!item) return;

      const willOpen = !item.classList.contains("is-open");
      item.classList.toggle("is-open", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
    });
  });

  document.querySelectorAll('.adsbygoogle[data-ad-client*="XXXXXXXXXXXXXXXX"]').forEach((slot) => {
    slot.closest("[data-ad-container]")?.classList.add("hidden");
  });

  window.adsbygoogle = window.adsbygoogle || [];
  document
    .querySelectorAll('.adsbygoogle:not([data-ad-client*="XXXXXXXXXXXXXXXX"])')
    .forEach(() => {
      try {
        window.adsbygoogle.push({});
      } catch (error) {
        console.warn("AdSense slot initialization skipped:", error);
      }
    });
})();

/* ===== Cookie Consent (GDPR / TDAMD compliance) ===== */
(function () {
  const COOKIE_NAME = 'pdft_cookie_consent';
  const COOKIE_EXPIRY_DAYS = 365;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  const existing = getCookie(COOKIE_NAME);
  if (existing) return;

  var banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'true');
  banner.setAttribute('aria-label', 'Cookie Consent');
  banner.innerHTML =
    '<div class=cookie-consent-inner>' +
    '<p class=cookie-consent-text>本网站使用 Google AdSense 展示广告。选择「接受」允许我们使用分析/广告 Cookie，选择「拒绝」则仅使用必要 Cookie。<a href=privacy.html target=_blank class=cookie-consent-link>了解更多</a></p>' +
    '<div class=cookie-consent-buttons>' +
    '<button class=cookie-btn cookie-btn-accept data-consent=accept>Accept All</button>' +
    '<button class=cookie-btn cookie-btn-reject data-consent=reject>Reject All</button>' +
    '</div></div>';
  document.body.appendChild(banner);

  document.querySelectorAll('[data-consent]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const choice = btn.getAttribute('data-consent');
      setCookie(COOKIE_NAME, choice, COOKIE_EXPIRY_DAYS);
      banner.remove();
    });
  });
})();
