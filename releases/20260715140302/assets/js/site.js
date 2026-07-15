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
