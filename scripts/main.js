// Utility to display error messages
function showError(message, container = document.body) {
  const errorEl = document.createElement('p');
  errorEl.className = 'error';
  errorEl.textContent = message;
  container.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 5000);
}

// Load header and footer dynamically
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
        // Update year in footer
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

// Initialize connect wallet button
function initConnectWallet() {
  const connectButton = document.getElementById('btn-connect');
  const modalOverlay = document.querySelector('#modal-overlay');

  if (!connectButton) {
    showError('Connect wallet button not found.', document.body);
    return;
  }

  if (!modalOverlay) {
    showError('Modal overlay not found.', document.body);
    return;
  }

  connectButton.addEventListener('click', () => {
    // Check for MetaMask (or other wallet provider)
    if (typeof window.ethereum === 'undefined') {
      openModal({
        content: 'No wallet detected. Please install MetaMask or another Web3 wallet.',
        isError: true
      });
      return;
    }

    // Display wallet connection prompt
    openModal({
      content: `
        <h2>Connect Wallet</h2>
        <p>Connect your wallet to start sending USDC.</p>
      `
    });

    // Placeholder for wallet connection (to be moved to wallet.js)
    const modalConfirm = document.querySelector('#modal-confirm');
    modalConfirm.addEventListener('click', async () => {
      try {
        // Example: Request wallet connection (MetaMask)
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        closeModal();
        // Update UI (e.g., show wallet address) - to be implemented in wallet.js
        showError('Wallet connected successfully.', document.querySelector('.main-content'));
      } catch (error) {
        openModal({
          content: `Failed to connect wallet: ${error.message}`,
          isError: true
        });
      }
    }, { once: true }); // Single-use listener to avoid duplicates
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadComponents();
  initConnectWallet();
});