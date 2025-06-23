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

    const alchemyProvider = new ethers.JsonRpcProvider(
        "https://eth-mainnet.g.alchemy.com/v2/tNw9iRsScHuuRi9OzxX1lGHx83a3UNmt"
    );
    const sepoliaProvider = new ethers.JsonRpcProvider(
        "https://eth-sepolia.g.alchemy.com/v2/tNw9iRsScHuuRi9OzxX1lGHx83a3UNmt"
    );

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
        const balancesDiv = document.getElementById('wallet-balances');
        balancesDiv.innerHTML = 'Retrieving balances...';
        let ethBal = "—";
        let usdcBal = "—";
        try {
            const provider = await getActiveProvider();
            const ethRaw = await provider.getBalance(address);
            ethBal = Number(ethers.formatEther(ethRaw)).toLocaleString(undefined, { maximumFractionDigits: 6 });

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
            window.currentUSDCBalance = parseFloat(ethers.formatUnits(raw, decimals)); // store for modal logic
            usdcBal = window.currentUSDCBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });
        } catch (err) {
            console.error("Balance error:", err);
        }

        balancesDiv.innerHTML = `
            <span class="balance-label">USDC:</span>
            <span class="balance-value">${usdcBal}</span>
            &nbsp;&nbsp;
            <span class="balance-label">ETH:</span>
            <span class="balance-value">${ethBal}</span>
        `;
    }

    connectBtn.addEventListener('click', async () => {
        if (!window.ethereum) {
            alert("No Ethereum provider detected. Please install MetaMask.");
            walletData.textContent = "";
            addrDisplay.style.color = "#F66";
            return;
        }
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                connectBtn.textContent = 'Connected';
                connectBtn.disabled = true;
                connectBtn.style.opacity = 0.7;
                fullWalletAddress = accounts[0];
                walletData.textContent = shortenAddress(fullWalletAddress);
                walletData.title = "Click to reveal full address";
                addrDisplay.style.color = "#30B886";
                showBalances(fullWalletAddress);

                document.getElementById('btn-create').disabled = false;
                document.getElementById('wallet-hint').style.display = 'none';
            }
        } catch (err) {
            alert('User rejected connection or error occurred: ' + (err.message || err));
        }
    });

    walletData.addEventListener('click', () => {
        if (!fullWalletAddress) return;
        if (showFullTimeout) clearTimeout(showFullTimeout);
        walletData.textContent = fullWalletAddress;
        walletData.title = "Double-click to copy address";
        walletData.classList.add('revealed');
        showFullTimeout = setTimeout(() => {
            walletData.textContent = shortenAddress(fullWalletAddress);
            walletData.title = "Click to reveal full address";
            walletData.classList.remove('revealed');
        }, 4000);
    });

    walletData.addEventListener('dblclick', () => {
        if (walletData.textContent === fullWalletAddress) {
            navigator.clipboard.writeText(fullWalletAddress);
            walletData.title = "Copied!";
            walletData.classList.remove('copied');
            void walletData.offsetWidth;
            walletData.classList.add('copied');
            const feedback = document.getElementById('copy-feedback');
            feedback.textContent = "Copied!";
            feedback.classList.remove('visible');
            void feedback.offsetWidth;
            feedback.classList.add('visible');
            setTimeout(() => {
                feedback.classList.remove('visible');
                feedback.textContent = "";
                walletData.classList.remove('copied');
                walletData.title = "Click to reveal full address";
            }, 1100);
        }
    });

    // --- Modal Launch for Transaction ---
    createBtn.addEventListener('click', () => {
        const hint = document.getElementById('wallet-hint');
        if (!fullWalletAddress) {
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
        hint.classList.remove('visible');
        openTransactionModal();
    });
    function openTransactionModal() {
        const modalHtml = `
            <div style="margin-bottom: 1.1em;">
                <label class="summary-label" for="modal-recipient">Recipient Address</label><br />
                <input id="modal-recipient" type="text" placeholder="0x..." style="width: 100%; padding: 0.5em; margin-top: 0.3em;
                    font-family: 'Fira Mono', monospace; font-weight: 700; color: #0D1A2C;" />
                <div id="address-warning" style="margin-top: 0.3em; font-size: 0.86rem; display: none;"></div>
            </div>

            <div style="margin-bottom: 1.1em;">
                <label class="summary-label" for="modal-amount">Amount (USDC)</label><br />
                <input id="modal-amount" type="number" min="0" step="0.01" placeholder="e.g. 20.00" style="width: 100%; padding: 0.5em; margin-top: 0.3em;
                    font-family: 'Fira Mono', monospace; font-weight: 700; color: #0D1A2C;" />
                <div id="amount-warning" class="warning-text" style="display: none; font-size: 0.85rem; color: #FF4D4D; margin-top: 0.3em;"></div>
            </div>

            <div class="modal-fee-summary">
                <div style="font-size: 0.85rem; opacity: 0.6;">
                    Transfer Fee (USDC): <span id="fee-display">—</span>
                </div>
                <br>
                <div style="font-weight: bold; font-size: 1.3rem; margin-top: 0.3em; color: #FFD530;">
                    Transfer Total (USDC): <span id="total-display">—</span>
                </div>
            </div>

            <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 1.2em; text-align: center;">
                By continuing, you agree to the <a href="terms.html" target="_blank" style="color: #FFD530; text-decoration: underline;">Terms of Use</a>.
            </p>
        `;

        showModal(modalHtml, async () => {
            const recipient = document.getElementById('modal-recipient').value.trim();
            const amount = parseFloat(document.getElementById('modal-amount').value.trim());

            if (!ethers.isAddress(recipient)) {
                alert("❌ Invalid Ethereum address.");
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                alert("❌ Invalid USDC amount.");
                return;
            }

            const total = amount + amount * 0.01;
            if (total > (window.currentUSDCBalance || 0)) {
                alert("❌ Insufficient USDC balance.");
                return;
            }

            try {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const browserProvider = new ethers.BrowserProvider(window.ethereum);
                const signer = await browserProvider.getSigner();

                const USDC_ADDRESS = chainId === "0xaa36a7"
                    ? "0x5c221e77624690fff6dd741493d735a17716c26b"
                    : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

                const ERC20_ABI = [
                    "function transfer(address to, uint256 value) public returns (bool)",
                    "function decimals() view returns (uint8)"
                ];
                const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
                const decimals = await usdc.decimals();
                const amountToSend = ethers.parseUnits(amount.toString(), decimals);

                const tx = await usdc.transfer(recipient, amountToSend);
                alert("Transaction sent! Awaiting confirmation...");
                await tx.wait();
                alert("✅ Transaction confirmed!");
                showBalances(fullWalletAddress);
            } catch (err) {
                console.error(err);
                alert("❌ Transaction failed: " + (err.shortMessage || err.message || err));
            }
        });

        bindModalValidation();
    }
    function bindModalValidation() {
        const recipientInput = document.getElementById('modal-recipient');
        const amountInput = document.getElementById('modal-amount');
        const feeDisplay = document.getElementById('fee-display');
        const totalDisplay = document.getElementById('total-display');
        const addressWarning = document.getElementById('address-warning');
        const amountWarning = document.getElementById('amount-warning');

        // --- Address Input Validation ---
        recipientInput.addEventListener('input', () => {
            const addr = recipientInput.value.trim();
            const hexPart = addr.slice(2);
            const hexRegex = /^[0-9a-fA-F]*$/;

            if (!addr || addr === "0") {
                recipientInput.style.border = "1px solid rgba(255,255,255,0.2)";
                addressWarning.style.display = 'none';
                return;
            }

            recipientInput.style.border = "1px solid rgba(255,255,255,0.2)";
            addressWarning.style.display = 'none';

            if (addr.length > 42 || !addr.startsWith('0x') || !hexRegex.test(hexPart)) {
                recipientInput.style.border = "2px solid #FF4D4D";
                addressWarning.textContent = "Invalid address.";
                addressWarning.style.color = "#FF6666";
                addressWarning.style.display = 'block';
                return;
            }

            const highRisk = /^0x(0000|dead|1111|0000000000000000000000000000000000000000)/i.test(addr);
            if (ethers.isAddress(addr)) {
                recipientInput.style.border = highRisk ? "2px solid #FFA500" : "2px solid #30B886";
                addressWarning.textContent = highRisk ? "High-risk address." : "Valid address.*";
                addressWarning.style.color = highRisk ? "#FFA500" : "#30B886";
                addressWarning.style.display = 'block';
            }
        });

        // --- Amount Input Validation ---
        amountInput.addEventListener('input', () => {
            const rawInput = amountInput.value.trim();

            if (/[a-df-zA-DF-Z]/.test(rawInput) || rawInput.startsWith('e') || rawInput.startsWith('E')) {
                amountInput.style.border = "2px solid #FF4D4D";
                amountWarning.textContent = "Invalid amount format.";
                amountWarning.style.display = 'block';
                feeDisplay.textContent = "—";
                totalDisplay.textContent = "—";
                return;
            }

            const raw = parseFloat(rawInput);
            if (isNaN(raw) || raw <= 0) {
                amountInput.style.border = "2px solid #FF4D4D";
                amountWarning.textContent = "Please enter a valid amount.";
                amountWarning.style.display = 'block';
                feeDisplay.textContent = "—";
                totalDisplay.textContent = "—";
                return;
            }

            const decimalPart = rawInput.split('.')[1];
            if (decimalPart && decimalPart.length > 6) {
                amountInput.style.border = "2px solid #FF4D4D";
                amountWarning.textContent = "Too many decimal places.";
                amountWarning.style.display = 'block';
                return;
            }

            const fee = raw * 0.01;
            const total = raw + fee;
            const balance = window.currentUSDCBalance || 0;

            if (total > balance) {
                amountInput.style.border = "2px solid #FF4D4D";
                amountWarning.textContent = "Amount exceeds wallet balance.";
                amountWarning.style.color = "#FF4D4D";
                amountWarning.style.display = 'block';
            } else {
                amountInput.style.border = "1px solid rgba(255,255,255,0.2)";
                amountWarning.style.display = 'none';
            }

            feeDisplay.textContent = fee.toLocaleString(undefined, { maximumFractionDigits: 2 });
            totalDisplay.textContent = total.toLocaleString(undefined, { maximumFractionDigits: 2 });
        });
    }
    // --- Modal Utility ---
    function showModal(messageHtml, onConfirm, onCancel) {
        const overlay = document.getElementById('modal-overlay');
        const msgDiv = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        msgDiv.innerHTML = messageHtml;
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

        // Bind validation to modal inputs
        bindModalValidation();
    }
});
