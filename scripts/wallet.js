// wallet.js

window.userAddress = null;

// Helper: Mask an address for UI
function maskAddress(address) {
  if (!address || address.length < 10) return address;
  return address.slice(0, 6) + '...' + address.slice(-4);
}

function showWalletAddress(address) {
  window.userAddress = address;
  if (window.showWalletUI) window.showWalletUI(address);
}

// Connect Wallet Logic (MetaMask/EIP-1193)
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

window.connectWallet = connectWallet;

// Auto-connect on reload if accounts exist
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

document.addEventListener('DOMContentLoaded', checkWalletOnLoad);

if (typeof window.ethereum !== 'undefined' && window.ethereum.on) {
  window.ethereum.on('accountsChanged', function(accounts) {
    if (accounts && accounts.length > 0) {
      showWalletAddress(accounts[0]);
    } else {
      showWalletAddress(null);
    }
  });
}

// ===================== SEND MODAL LOGIC =====================

window.openSendModal = function () {
  let fullAddressShown = false;
  let copiedShown = false;
  let currentUsdcBalance = 100; // Demo value
  let currentEthBalance = 0.1; // Demo value

  let recipientValue = '';
  let amountValue = '';
  let validRecipient = false;
  let validAmount = false;
  let inConfirmStep = false;

  function validateEthAddress(addr) {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }

  function renderModal() {
    const transferFee = amountValue && !isNaN(amountValue) ? (parseFloat(amountValue) * 0.01) : 0;
    const transferTotal = amountValue && !isNaN(amountValue) ? (parseFloat(amountValue) + transferFee) : 0;
    validAmount = !!amountValue && !isNaN(amountValue) && parseFloat(amountValue) > 0 && parseFloat(amountValue) + transferFee <= currentUsdcBalance;
    validRecipient = validateEthAddress(recipientValue);

    let addressDisplay = fullAddressShown ? window.userAddress : maskAddress(window.userAddress);
    let copyNotice = copiedShown ? '<span style="color:#6fd46f;">Copied!</span>' : 'Click to reveal. Double-click to copy.';
    let recipientValidation = recipientValue.length === 42
      ? (validRecipient ? '<span style="color:#6fd46f;">Valid Address</span>' : '<span style="color:#d46f6f;">Invalid Address</span>')
      : '';
    let amountWarning = '';
    if (amountValue && !isNaN(amountValue) && parseFloat(amountValue) + transferFee > currentUsdcBalance) {
      amountWarning = '<span style="color:#d46f6f;">Amount exceeds balance.</span>';
    }

    let gasSection = `
      <div style="margin-top:0.6em;font-size:0.97em;">
        <b>Network Fees</b><br>
        <span>Gas (ETH): <span style="color:#999;">placeholder</span> &nbsp;|&nbsp; Gas (Polygon): <span style="color:#999;">placeholder</span></span><br>
        <span style="color:#6fd46f;">Polygon likely cheaper. <button id="switch-network" style="margin-left:8px;">Switch to Polygon</button></span>
      </div>
    `;

    // Disconnect wallet button (below wallet address)
    let disconnectButtonHTML = `
      <button id="modal-disconnect-btn" class="modal-disconnect-btn" tabindex="0">Disconnect Wallet</button>
    `;

    if (!inConfirmStep) {
      return `
        <form id="send-usdc-form" autocomplete="off" style="display:flex;flex-direction:column;gap:1.13em;">
          <div>
            <label style="font-weight:600;">Address</label>
            <div id="user-address-display" class="modal-address${fullAddressShown ? ' expanded' : ''}" tabindex="0">
              ${addressDisplay}
            </div>
            <div style="font-size:0.92em;opacity:0.77;margin-top:4px;" id="user-address-copy-notice">${copyNotice}</div>
            ${disconnectButtonHTML}
          </div>
          <div>
            <label style="font-weight:600;">Balance(s)</label>
            <div style="border:1px solid var(--color-mid-gray);padding:8px 12px;border-radius:var(--radius-standard);background:#171b22;">
              USDC: ${currentUsdcBalance} &nbsp;|&nbsp; ETH: ${currentEthBalance}
            </div>
          </div>
          <hr style="opacity:0.1;margin:1em 0;">
          <div>
            <label style="font-weight:600;">Recipient Address</label>
            <input id="recipient-address-input" type="text" placeholder="0x..." maxlength="42" value="${recipientValue || ''}">
            <div id="recipient-validation-msg" style="font-size:0.92em;margin-top:2px;">${recipientValidation}</div>
          </div>
          <div>
            <label style="font-weight:600;">Amount (USDC)</label>
            <input id="amount-input" type="number" min="0" step="0.01" placeholder="0.00" value="${amountValue || ''}">
            <div id="amount-warning-msg" style="font-size:0.92em;margin-top:2px;">${amountWarning}</div>
          </div>
          <div>
            <span>Transfer Fee (USDC): <b>${transferFee.toFixed(2)}</b></span><br>
            <span>Transfer Total (USDC): <b style="color:#f5c000;font-size:1.13em;">${transferTotal.toFixed(2)}</b></span>
          </div>
          ${gasSection}
        </form>
      `;
    } else {
      return `
        <div style="text-align:center;">
          <h2>Review Transfer</h2>
          <div style="font-size:1.07em;margin-bottom:1.2em;">
            You are sending <b>${amountValue} USDC</b> to<br>
            <span style="font-family:var(--font-mono);color:var(--color-light-gray);word-break:break-all;">${maskAddress(recipientValue)}</span>
          </div>
          <div style="margin:0.6em 0 0.2em 0;">
            <span>1% platform fee: <b>${transferFee.toFixed(2)} USDC</b></span><br>
            <span>Estimated gas fees (see above for details).</span>
          </div>
          <div style="margin-top:1em;">
            <span style="font-weight:600;color:#f5c000;">Total deducted: ${(parseFloat(amountValue)+transferFee).toFixed(2)} USDC + gas fees</span>
          </div>
        </div>
      `;
    }
  }

  function rerender() {
    openModal({
      content: renderModal(),
      confirmText: inConfirmStep ? "Send Transfer" : "Continue",
      cancelText: "Cancel",
      disableConfirm: (!inConfirmStep && !(validRecipient && validAmount)),
      onConfirm: () => {
        if (!inConfirmStep) {
          inConfirmStep = true;
          rerender();
        } else {
          closeModal();
          setTimeout(() => {
            openModal({
              content: `<h2>Transaction Submitted!</h2><p>Sent ${amountValue} USDC to ${maskAddress(recipientValue)}.<br>Fee: ${(parseFloat(amountValue)*0.01).toFixed(2)} USDC.</p>`,
              confirmText: "OK",
              cancelText: "",
              disableConfirm: false,
              onConfirm: () => closeModal()
            });
          }, 220);
        }
      },
      onCancel: () => {
        closeModal();
      }
    });

    setTimeout(() => {
      const addressDiv = document.getElementById('user-address-display');
      if (addressDiv) {
        addressDiv.onclick = () => {
          fullAddressShown = !fullAddressShown;
          copiedShown = false;
          rerender();
        };
        addressDiv.ondblclick = () => {
          if (window.userAddress) {
            navigator.clipboard.writeText(window.userAddress).then(() => {
              copiedShown = true;
              fullAddressShown = true;
              rerender();
            });
          }
        };
      }
      const recipientInput = document.getElementById('recipient-address-input');
      if (recipientInput) {
        recipientInput.value = recipientValue;
        recipientInput.oninput = (e) => {
          recipientValue = e.target.value.trim();
          copiedShown = false;
          validRecipient = validateEthAddress(recipientValue);
          const vmsg = document.getElementById('recipient-validation-msg');
          if (vmsg) {
            if (recipientValue.length === 42) {
              vmsg.innerHTML = validRecipient
                ? '<span style="color:#6fd46f;">Valid Address</span>'
                : '<span style="color:#d46f6f;">Invalid Address</span>';
            } else {
              vmsg.textContent = '';
            }
          }
        };
      }
      const amountInput = document.getElementById('amount-input');
      if (amountInput) {
        amountInput.value = amountValue;
        amountInput.oninput = (e) => {
          amountValue = e.target.value;
          rerender();
        };
      }
      const switchNetBtn = document.getElementById('switch-network');
      if (switchNetBtn) {
        switchNetBtn.onclick = () => {
          openModal({
            content: `<h2>Network Switched!</h2><p>(Network switching logic not yet implemented.)</p>`,
            confirmText: "OK",
            cancelText: "",
            disableConfirm: false,
            onConfirm: () => rerender()
          });
        }
      }
      // Disconnect wallet from modal
      const disconnectBtn = document.getElementById('modal-disconnect-btn');
      if (disconnectBtn) {
        disconnectBtn.onclick = () => {
          window.userAddress = null;
          if (window.showWalletUI) window.showWalletUI(null);
          closeModal();
        };
      }
    }, 10);
  }

  rerender();
};
