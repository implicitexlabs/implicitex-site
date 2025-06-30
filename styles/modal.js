// Constants
const MODAL_OVERLAY_SELECTOR = '#modal-overlay';
const MODAL_MESSAGE_SELECTOR = '#modal-message';
const MODAL_CONFIRM_SELECTOR = '#modal-confirm';
const MODAL_CANCEL_SELECTOR = '#modal-cancel';
const MODAL_SELECTOR = '.modal';

// Utility to display error messages
function showError(message, container = document.querySelector(MODAL_MESSAGE_SELECTOR)) {
  if (!container) return;
  container.innerHTML = `<p class="error">${message}</p>`;
  container.classList.add('error');
  setTimeout(() => container.classList.remove('error'), 5000);
}

// Open modal with content and optional transaction data
function openModal({ content, amount, fee, recipient, isError = false } = {}) {
  const modalOverlay = document.querySelector(MODAL_OVERLAY_SELECTOR);
  const modalMessage = document.querySelector(MODAL_MESSAGE_SELECTOR);
  const modal = document.querySelector(MODAL_SELECTOR);

  if (!modalOverlay || !modalMessage || !modal) {
    showError('Modal initialization failed.', document.body);
    return;
  }

  // Set content
  if (isError) {
    modalMessage.innerHTML = `<p class="error">${content}</p>`;
    modalMessage.classList.add('error');
  } else if (amount && fee && recipient) {
    modalMessage.innerHTML = `
      <h2>Confirm Transaction</h2>
      <p>Amount: ${amount} USDC</p>
      <p>Fee: ${fee} USDC (1%)</p>
      <p>Recipient: ${recipient}</p>
    `;
    modalMessage.classList.remove('error');
  } else {
    modalMessage.innerHTML = content || '<p>No content provided.</p>';
    modalMessage.classList.remove('error');
  }

  // Show modal with animation
  modalOverlay.style.display = 'flex';
  modal.style.animation = 'modalFadeIn 0.22s forwards';

  // Focus trap
  const focusableElements = modal.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  firstFocusable?.focus();

  // Handle focus trapping and Escape key
  modal.addEventListener('keydown', handleKeydown);
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }
}

// Close modal
function closeModal() {
  const modalOverlay = document.querySelector(MODAL_OVERLAY_SELECTOR);
  const modal = document.querySelector(MODAL_SELECTOR);
  if (!modalOverlay || !modal) return;

  // Animate out
  modal.style.animation = 'modalFadeOut 0.22s forwards';
  setTimeout(() => {
    modalOverlay.style.display = 'none';
    modal.style.animation = ''; // Reset animation
  }, 220); // Match animation duration

  // Remove keydown listener
  modal.removeEventListener('keydown', handleKeydown);
}

// Initialize modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  const modalOverlay = document.querySelector(MODAL_OVERLAY_SELECTOR);
  const modalConfirm = document.querySelector(MODAL_CONFIRM_SELECTOR);
  const modalCancel = document.querySelector(MODAL_CANCEL_SELECTOR);

  if (!modalOverlay || !modalConfirm || !modalCancel) {
    showError('Modal elements not found.', document.body);
    return;
  }

  modalConfirm.addEventListener('click', closeModal); // Placeholder: Add transaction logic in wallet.js
  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
});

// Animation keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes modalFadeIn {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes modalFadeOut {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
`;
document.head.appendChild(styleSheet);