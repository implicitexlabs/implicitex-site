// main.js

function showError(message, container = document.body) {
  const errorEl = document.createElement('p');
  errorEl.className = 'error';
  errorEl.textContent = message;
  container.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 5000);
}

function loadComponents() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (headerPlaceholder) {
    fetch('components/header.html')
      .then(res => res.ok ? res.text() : Promise.reject('Failed to load header'))
      .then(data => {
        headerPlaceholder.innerHTML = data;
      })
      .catch(err => {
        showError(err, headerPlaceholder);
      });
  }

  if (footerPlaceholder) {
    fetch('components/footer.html')
      .then(res => res.ok ? res.text() : Promise.reject('Failed to load footer'))
      .then(data => {
        footerPlaceholder.innerHTML = data;
        const yearEl = document.getElementById('year');
        if (yearEl) {
          yearEl.textContent = new Date().getFullYear();
        } else {
          showError('Footer year element not found.', footerPlaceholder);
        }
      })
      .catch(err => {
        showError(err, footerPlaceholder);
      });
  }
}

function initConnectWallet() {
  const connectButton = document.getElementById('btn-connect');
  if (!connectButton) return;

  connectButton.addEventListener('click', () => {
    openModal({
      content: `
        <h2>Connect Wallet</h2>
        <p>Connect your wallet to start sending USDC.</p>
      `
    });

    // Remove previous listeners to avoid duplicates
    const modalConfirm = document.querySelector('#modal-confirm');
    if (modalConfirm) {
      const newModalConfirm = modalConfirm.cloneNode(true);
      modalConfirm.parentNode.replaceChild(newModalConfirm, modalConfirm);

      newModalConfirm.addEventListener('click', () => {
        if (window.connectWallet) {
          window.connectWallet();
        }
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadComponents();
  initConnectWallet();
});
