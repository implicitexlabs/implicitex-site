
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.querySelector('.header-hamburger');
  const menu = document.querySelector('.header-mobile-menu');

  btn.addEventListener('click', () => {
    const shown = menu.hasAttribute('hidden') === false;
    if (shown) {
      menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    } else {
      menu.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  // Hide menu on link click or outside click
  menu.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', function(e) {
    if (!menu.hasAttribute('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
});
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the modular header to load
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;
  
    function setupHamburger() {
      const hamburger = document.querySelector('.header-hamburger');
      const mobileMenu = document.querySelector('.header-mobile-menu');
      if (!hamburger || !mobileMenu) return;
  
      hamburger.addEventListener('click', function() {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', !expanded);
        if (mobileMenu.hasAttribute('hidden')) {
          mobileMenu.removeAttribute('hidden');
        } else {
          mobileMenu.setAttribute('hidden', '');
        }
      });
  
      // Optional: Hide the menu when resizing up to desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
          mobileMenu.setAttribute('hidden', '');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  
    // If the header is already loaded
    if (document.querySelector('.header-hamburger')) {
      setupHamburger();
    } else {
      // Wait for header.html to be loaded
      const observer = new MutationObserver(() => {
        if (document.querySelector('.header-hamburger')) {
          setupHamburger();
          observer.disconnect();
        }
      });
      observer.observe(headerPlaceholder, { childList: true, subtree: true });
    }
  });
  