document.addEventListener('DOMContentLoaded', function () {
    const connectBtn = document.getElementById('btn-connect');
    const createBtn = document.getElementById('btn-create');
    const walletData = document.getElementById('wallet-data');
    const addrDisplay = document.getElementById('wallet-address');
    let fullWalletAddress = "";
    let showFullTimeout = null;

    function shortenAddress(addr) {
        if (!addr) return "";
        return addr.slice(0, 6) + "..." + addr.slice(-4);
    }

    function isValidEmail(email) {
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
        return pattern.test(email) && email.length <= 254;
    }

    const alchemyProvider = new ethers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/tNw9iRsScHuuRi9OzxX1lGHx83a3UNmt");
    const sepoliaProvider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/tNw9iRsScHuuRi9OzxX1lGHx83a3UNmt");

    async function getActiveProvider() {
        if (!window.ethereum) return sepoliaProvider;
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId === "0x1") return alchemyProvider;
            if (chainId === "0xaa36a7") return sepoliaProvider;
            return sepoliaProvider;
        } catch {
            return sepoliaProvider;
        }
    }

    async function showBalances(address) {
        const provider = await getActiveProvider();
        const ethRaw = await provider.getBalance(address);
        const ethBal = Number(ethers.formatEther(ethRaw)).toLocaleString(undefined, { maximumFractionDigits: 6 });

        const network = await provider.getNetwork();
        const USDC_ADDRESS = network.chainId === 11155111
            ? "0x5c221e77624690fff6dd741493d735a17716c26b"
            : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

        const ERC20_ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
        const decimals = await usdc.decimals();
        const raw = await usdc.balanceOf(address);
        window.currentUSDCBalance = parseFloat(ethers.formatUnits(raw, decimals));
        const usdcBal = window.currentUSDCBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });

        document.getElementById('modal-wallet-address').textContent = shortenAddress(address);
        document.getElementById('modal-wallet-balances').textContent = `USDC: ${usdcBal} | ETH: ${ethBal}`;
    }

    connectBtn.addEventListener('click', async () => {
        if (!window.ethereum) {
            alert("No Ethereum provider detected. Please install MetaMask.");
            return;
        }
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                fullWalletAddress = accounts[0];
                connectBtn.textContent = 'Connected';
                connectBtn.disabled = true;
                walletData.textContent = shortenAddress(fullWalletAddress);
                addrDisplay.style.color = "#30B886";
                showBalances(fullWalletAddress);
                createBtn.disabled = false;
            }
        } catch (err) {
            alert("Error: " + (err.message || err));
        }
    });

    createBtn.addEventListener('click', () => {
        if (!fullWalletAddress) {
            const hint = document.getElementById('wallet-hint');
            hint.classList.add('visible');
            hint.style.visibility = 'visible';
            hint.style.opacity = 1;
            hint.textContent = 'Please connect your wallet first.';
            setTimeout(() => {
                hint.classList.remove('visible');
                hint.style.opacity = 0;
                hint.style.visibility = 'hidden';
            }, 4000);
            return;
        }

        const modalHtml = `
            <div class="modal-output-block">
                <label class="modal-label">Address</label>
                <div id="modal-wallet-address" class="output-field">Loading...</div>
                <div class="hint">Click to reveal. Double-click to copy.</div>

                <label class="modal-label">Balance(s)</label>
                <div id="modal-wallet-balances" class="output-field">USDC: — | ETH: —</div>
                <div class="hint"> </div>

                <hr class="modal-divider" />
            </div>

            <div class="modal-input-block">
                <label class="summary-label" for="modal-recipient">Recipient Address</label>
                <input id="modal-recipient" type="text" class="modal-input" placeholder="0x..." readonly value="0x0000000000000000000000000000000000000000" />
                <div id="address-warning" class="hint"></div>

                <label class="summary-label" for="modal-amount">Amount (USDC)</label>
                <input id="modal-amount" type="number" step="0.01" class="modal-input" placeholder="e.g. 20.00" />
                <div id="amount-warning" class="hint">1% fee applied</div>

                <div class="modal-fee-summary">
                    <div>Transfer Fee (USDC): <span id="fee-display">—</span></div>
                    <div>Transfer Total (USDC): <span id="total-display" class="total-highlight">—</span></div>
                </div>

                <div class="email-toggle-block">
                    <label><input type="checkbox" id="email-receipt-toggle" /> <span>📧 Email me a receipt</span></label>
                    <input type="email" id="email-input" class="modal-input" placeholder="you@example.com" />
                </div>

                <div class="modal-branding">
                    <img src="logo.svg" class="modal-logo" alt="ImplicitEx" />
                    <img src="brandmark.svg" class="modal-brandmark" alt="Brandmark" />
                </div>
            </div>
        `;

        showModal(modalHtml, async () => {
            const amount = parseFloat(document.getElementById('modal-amount').value.trim());
            const email = document.getElementById('email-input').value.trim();
            const emailToggle = document.getElementById('email-receipt-toggle');

            if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");
            if (emailToggle.checked && !isValidEmail(email)) return alert("❌ Invalid email address.");

            const total = amount + amount * 0.01;
            if (total > (window.currentUSDCBalance || 0)) return alert("Insufficient USDC.");

            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const USDC_ADDRESS = chainId === "0xaa36a7"
                    ? "0x5c221e77624690fff6dd741493d735a17716c26b"
                    : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
                const usdc = new ethers.Contract(USDC_ADDRESS, [
                    "function transfer(address to, uint256 value) public returns (bool)",
                    "function decimals() view returns (uint8)"
                ], signer);
                const decimals = await usdc.decimals();
                const value = ethers.parseUnits(amount.toString(), decimals);
                const tx = await usdc.transfer("0x0000000000000000000000000000000000000000", value);
                alert("Transaction sent...");
                await tx.wait();
                alert("✅ Confirmed!");
                showBalances(fullWalletAddress);
            } catch (err) {
                alert("Error: " + (err.message || err));
            }
        });

        setTimeout(() => {
            const emailToggle = document.getElementById('email-receipt-toggle');
            const emailInput = document.getElementById('email-input');
            emailToggle.addEventListener('change', () => {
                emailInput.style.display = emailToggle.checked ? 'block' : 'none';
            });
        }, 250);
    });

    function showModal(html, onConfirm, onCancel) {
        const overlay = document.getElementById('modal-overlay');
        const msg = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        msg.innerHTML = html;
        overlay.style.display = 'flex';

        function cleanup() {
            overlay.style.display = 'none';
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        }

        function confirmHandler() {
            cleanup();
            if (onConfirm) onConfirm();
        }

        function cancelHandler() {
            cleanup();
            if (onCancel) onCancel();
        }

        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    }
});