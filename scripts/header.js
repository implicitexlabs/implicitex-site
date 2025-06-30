// Constants
const BREAKPOINT_MOBILE = 900; // Matches header.css media query
const HEADER_SELECTOR = '.header-bar';
const HAMBURGER_SELECTOR = '.header-hamburger';
const MOBILE_MENU_SELECTOR = '.header-mobile-menu';
const HEADER_PLACEHOLDER_SELECTOR = '#header-placeholder';

// Utility to display error messages
function showError(message) {
  const errorEl = document.createElement('p');
  errorEl.className = 'header-error';
  errorEl.textContent = message;
  const headerInner = document.querySelector('.header-inner') || document.body;
  headerInner.appendChild(errorEl);
  // Auto-remove error after 5 seconds
  setTimeout(() => errorEl.remove(), 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  const headerPlaceholder = document.querySelector(HEADER_PLACEHOLDER_SELECTOR);

  function setupHamburger() {
    const hamburger = document.querySelector(HAMBURGER_SELECTOR);
    const mobileMenu = document.querySelector(MOBILE_MENU_SELECTOR);

    // Error handling for missing elements
    if (!hamburger || !mobileMenu) {
      showError('Header navigation failed to initialize.');
      return;
    }

    // Focus trap for accessibility
    const focusableElements = mobileMenu.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Hamburger toggle
    hamburger.addEventListener('click', () => {
      const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !isExpanded);
      if (isExpanded) {
        mobileMenu.setAttribute('hidden', '');
        mobileMenu.style.animation = 'menuClose 0.22s forwards';
      } else {
        mobileMenu.removeAttribute('hidden');
        mobileMenu.style.animation = 'menuPop 0.22s forwards';
        firstFocusable?.focus(); // Focus first link for accessibility
      }
    });

    // Close menu on link click
    mobileMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        mobileMenu.setAttribute('hidden', '');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.style.animation = 'menuClose 0.22s forwards';
      }
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!mobileMenu.hasAttribute('hidden') && !mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
        mobileMenu.setAttribute('hidden', '');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.style.animation = 'menuClose 0.22s forwards';
      }
    });

    // Focus trap: Keep focus within menu when open
    mobileMenu.addEventListener('keydown', (e) => {
      if (mobileMenu.hasAttribute('hidden')) return;
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      } else if (e.key === 'Escape') {
        mobileMenu.setAttribute('hidden', '');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.style.animation = 'menuClose 0.22s forwards';
        hamburger.focus();
      }
    });

    // Hide menu on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > BREAKPOINT_MOBILE && !mobileMenu.hasAttribute('hidden')) {
        mobileMenu.setAttribute('hidden', '');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.style.animation = 'menuClose 0.22s forwards';
      }
    });
  }

  // Check if header is already loaded
  if (document.querySelector(HEADER_SELECTOR)) {
    setupHamburger();
  } else if (headerPlaceholder) {
    // Wait for header.html to load
    const observer = new MutationObserver(() => {
      if (document.querySelector(HEADER_SELECTOR)) {
        setupHamburger();
        observer.disconnect();
      }
    });
    observer.observe(headerPlaceholder, { childList: true, subtree: true });
  } else {
    showError('Header placeholder not found.');
  }
});

// Animation for menu close (to sync with menuPop in header.css)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes menuClose {
    0% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-16px) scale(0.97); }
  }
`;
document.head.appendChild(styleSheet);