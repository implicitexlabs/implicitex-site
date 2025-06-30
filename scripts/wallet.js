// wallet.js

let userAddress = null;

// Mask and reveal logic for address
function maskAddress(address) {
  if (!address || address.length < 10) return address;
  return address.slice(0, 6) + '...' + address.slice(-4);
}

// Balance stub (for now, fake values)
async function getBalances(address) {
  // TODO: Real contract calls
  return {
    usdc: '—',
    eth: '—'
  };
}

// Show wallet address in button and add Send button if connected
function showWalletAddress(address) {
  const connectButton = document.getElementById('btn-connect');
  if (connectButton) {
    connectButton.textContent = 'Connected: ' + maskAddress(address);
    connectButton.classList.add('connected');
    connectButton.disabled = false;
    userAddress = address;

    // Add Send button if not present
    if (!document.getElementById('btn-send-usdc')) {
      const sendBtn = document.createElement('button');
      sendBtn.id = 'btn-send-usdc';
      sendBtn.className = 'cta-button';
      sendBtn.textContent = 'Send USDC';
      connectButton.parentNode.insertBefore(sendBtn, connectButton.nextSibling);
      sendBtn.addEventListener('click', openSendModal);
    }
  }
}

async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    openModal({content: 'No wallet detected. Please install MetaMask or another Web3 wallet.', disableConfirm: true});
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts && accounts.length > 0) {
      showWalletAddress(accounts[0]);
      closeModal();
    } else {
      openModal({content: 'No wallet address returned.', disableConfirm: true});
    }
  } catch (err) {
    openModal({content: `Failed to connect wallet: ${err.message || err}`, disableConfirm: true});
  }
}

async function checkWalletOnLoad() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        showWalletAddress(accounts[0]);
      }
    } catch (err) {}
  }
}

window.connectWallet = connectWallet;

document.addEventListener('DOMContentLoaded', checkWalletOnLoad);

if (typeof window.ethereum !== 'undefined') {
  window.ethereum.on && window.ethereum.on('accountsChanged', function(accounts) {
    if (accounts && accounts.length > 0) {
      showWalletAddress(accounts[0]);
    } else {
      const connectButton = document.getElementById('btn-connect');
      if (connectButton) {
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
      }
      const sendBtn = document.getElementById('btn-send-usdc');
      if (sendBtn) sendBtn.remove();
      userAddress = null;
    }
  });
}

// ====== SEND USDC MODAL UI ======

function openSendModal() {
  // Use async to allow loading of balances later
  let fullAddressShown = false;
  let copiedShown = false;
  let currentUsdcBalance = 100; // Demo value
  let currentEthBalance = 0.1; // Demo value

  // Inputs state
  let recipientValue = '';
  let amountValue = '';
  let validRecipient = false;
  let validAmount = false;

  // Helper: Validate recipient address (Ethereum format)
  function validateEthAddress(addr) {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }

  function renderModal() {
    const transferFee = amountValue && !isNaN(amountValue) ? (parseFloat(amountValue) * 0.01) : 0;
    const transferTotal = amountValue && !isNaN(amountValue) ? (parseFloat(amountValue) + transferFee) : 0;
    validAmount = !!amountValue && !isNaN(amountValue) && parseFloat(amountValue) > 0 && parseFloat(amountValue) + transferFee <= currentUsdcBalance;
    validRecipient = validateEthAddress(recipientValue);

    let addressDisplay = fullAddressShown ? userAddress : maskAddress(userAddress);
    let copyNotice = copiedShown ? '<span style="color:#6fd46f;">Copied!</span>' : 'Click to reveal. Double-click to copy.';
    let recipientValidation = recipientValue.length === 42
      ? (validRecipient ? '<span style="color:#6fd46f;">Valid Address</span>' : '<span style="color:#d46f6f;">Invalid Address</span>')
      : '';
    let amountWarning = '';
    if (amountValue && !isNaN(amountValue) && parseFloat(amountValue) + transferFee > currentUsdcBalance) {
      amountWarning = '<span style="color:#d46f6f;">Amount exceeds balance.</span>';
    }

    // Placeholder gas/network section
    let gasSection = `
      <div style="margin-top:1em;font-size:0.95em;">
        <b>Network Fees</b><br>
        <span>Gas (ETH): <span style="color:#999;">placeholder</span> &nbsp;|&nbsp; Gas (Polygon): <span style="color:#999;">placeholder</span></span><br>
        <span style="color:#6fd46f;">Polygon likely cheaper. <button id="switch-network" style="margin-left:8px;">Switch to Polygon</button></span>
      </div>
    `;

    // The full modal content
    return `
      <form id="send-usdc-form" autocomplete="off" style="display:flex;flex-direction:column;gap:1.2em;">
        <div>
          <label style="font-weight:600;">Address</label>
          <div id="user-address-display" class="modal-address" tabindex="0" style="user-select:all;cursor:pointer;border:1px solid #333;padding:8px 12px;border-radius:8px;background:#171b22;font-size:1.07em;letter-spacing:0.01em;">
            ${addressDisplay}
          </div>
          <div style="font-size:0.92em;opacity:0.77;margin-top:4px;" id="user-address-copy-notice">${copyNotice}</div>
        </div>
        <div>
          <label style="font-weight:600;">Balance(s)</label>
          <div style="border:1px solid #333;padding:8px 12px;border-radius:8px;background:#171b22;">
            USDC: ${currentUsdcBalance} &nbsp;|&nbsp; ETH: ${currentEthBalance}
          </div>
        </div>
        <hr style="opacity:0.1;margin:1em 0;">
        <div>
          <label style="font-weight:600;">Recipient Address</label>
          <input id="recipient-address-input" type="text" placeholder="0x..." maxlength="42" style="width:100%;padding:8px 12px;font-size:1em;border-radius:8px;border:1px solid #333;background:#181b23;color:#eee;" value="${recipientValue || ''}">
          <div id="recipient-validation-msg" style="font-size:0.92em;margin-top:2px;">${recipientValidation}</div>
        </div>
        <div>
          <label style="font-weight:600;">Amount (USDC)</label>
          <input id="amount-input" type="number" min="0" step="0.01" placeholder="0.00" style="width:100%;padding:8px 12px;font-size:1em;border-radius:8px;border:1px solid #333;background:#181b23;color:#eee;" value="${amountValue || ''}">
          <div id="amount-warning-msg" style="font-size:0.92em;margin-top:2px;">${amountWarning}</div>
        </div>
        <div>
          <span>Transfer Fee (USDC): <b>${transferFee.toFixed(2)}</b></span><br>
          <span>Transfer Total (USDC): <b style="color:#f5c000;font-size:1.13em;">${transferTotal.toFixed(2)}</b></span>
        </div>
        ${gasSection}
      </form>
    `;
  }

  function rerender() {
    openModal({
      content: renderModal(),
      confirmText: "Confirm",
      cancelText: "Cancel",
      disableConfirm: !(validRecipient && validAmount),
      onConfirm: () => {
        // For now, just close and show a success message
        closeModal();
        setTimeout(() => {
          openModal({
            content: `<h2>Transaction Confirmed!</h2><p>Sent ${amountValue} USDC to ${maskAddress(recipientValue)}.<br>Fee: ${(parseFloat(amountValue)*0.01).toFixed(2)} USDC.</p>`,
            confirmText: "OK",
            cancelText: "",
            disableConfirm: false,
            onConfirm: () => closeModal()
          });
        }, 220);
      },
      onCancel: () => {
        closeModal();
      }
    });

    // Event delegation for form elements (after modal is rendered)
    setTimeout(() => {
      // Address reveal/copy logic
      const addressDiv = document.getElementById('user-address-display');
      const copyNotice = document.getElementById('user-address-copy-notice');
      if (addressDiv) {
        addressDiv.onclick = () => {
          fullAddressShown = !fullAddressShown;
          copiedShown = false;
          rerender();
        };
        addressDiv.ondblclick = () => {
          if (userAddress) {
            navigator.clipboard.writeText(userAddress).then(() => {
              copiedShown = true;
              fullAddressShown = true;
              rerender();
            });
          }
        };
      }

      // Recipient input validation
      const recipientInput = document.getElementById('recipient-address-input');
      if (recipientInput) {
        recipientInput.oninput = (e) => {
          recipientValue = e.target.value.trim();
          copiedShown = false;
          rerender();
        };
      }

      // Amount input validation
      const amountInput = document.getElementById('amount-input');
      if (amountInput) {
        amountInput.oninput = (e) => {
          amountValue = e.target.value;
          rerender();
        };
      }

      // Network switch
      const switchNetBtn = document.getElementById('switch-network');
      if (switchNetBtn) {
        switchNetBtn.onclick = () => {
          // Just a placeholder - show a message
          openModal({
            content: `<h2>Network Switched!</h2><p>(Network switching logic not yet implemented.)</p>`,
            confirmText: "OK",
            cancelText: "",
            disableConfirm: false,
            onConfirm: () => rerender()
          });
        }
      }
    }, 10);
  }

  rerender();
}
