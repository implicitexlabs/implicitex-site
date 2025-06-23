document.addEventListener('DOMContentLoaded', function () {
    const connectBtn = document.getElementById('btn-connect');
    const createBtn = document.getElementById('btn-create');
    const walletData = document.getElementById('wallet-data');
    const addrDisplay = document.getElementById('wallet-address');
    let fullWalletAddress = "";
    let showFullTimeout = null;

    // --- Utility: Shorten Wallet Address ---
    function shortenAddress(addr) {
        if (!addr) return "";
        return addr.slice(0, 6) + "..." + addr.slice(-4);
    }

    // --- Network & Provider Setup ---
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

    // --- Show Wallet Balances ---
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
            let USDC_ADDRESS = network.chainId === 11155111
                ? "0x5c221e77624690fff6dd741493d735a17716c26b"
                : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

            const ERC20_ABI = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)"
            ];
            const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
            const decimals = await usdc.decimals();
            const raw = await usdc.balanceOf(address);
            const exceedsBalance = raw + raw * 0.01 > (window.currentUSDCBalance || 0); // Total exceeds wallet balance plus fee!
            usdcBal = Number(ethers.formatUnits(raw, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });
            // Store raw number (no commas) for logic checks later
            window.currentUSDCBalance = parseFloat(ethers.formatUnits(raw, decimals));
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

    // --- Connect Wallet ---
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

                // ✅ Enable transaction button
                createBtn.disabled = false;
            }
        } catch (err) {
            alert('User rejected connection or error occurred: ' + (err.message || err));
        }
    });

    // --- Reveal/Copy Address Logic ---
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
        if (!fullWalletAddress) {
            const hint = document.getElementById('wallet-hint');
            hint.classList.add('visible');
            hint.style.visibility = 'visible';
            hint.style.opacity = 1;
            hint.textContent = 'Please connect your wallet first.';
            setTimeout(() => {
                hint.classList.remove('visible');
            }, 5000);
            return;
        }
        document.getElementById('wallet-hint').classList.remove('visible');
        openTransactionModal();
    });

    function openTransactionModal() {
        const modalHtml = `
            <div style="margin-bottom: 1.1em;">
                <label class="summary-label" for="modal-recipient">Recipient Address</label><br />
                <input id="modal-recipient" type="text" placeholder="0x..."style="width: 100%; padding: 0.5em; margin-top: 0.3em;
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
                Transfer Total (USDC):<div class="total-highlight">
                <span id="total-display">—</span>
                </div>
            </div>
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
    
        // Post-insertion DOM bindings
        const recipientInput = document.getElementById('modal-recipient');
        const amountInput = document.getElementById('modal-amount');
        const feeDisplay = document.getElementById('fee-display');
        const totalDisplay = document.getElementById('total-display');
        const addressWarning = document.getElementById('address-warning');
    
        // Real-time validation
        recipientInput.addEventListener('input', () => {
            const addr = recipientInput.value.trim();

            // NEW: Allow empty and single "0" as valid, don't show any error or border.
            if (!addr || addr === "0") {
                recipientInput.style.border = "1px solid rgba(255,255,255,0.2)";
                addressWarning.style.display = 'none';
                return;
            }
            const hexPart = addr.slice(2);
            const hexRegex = /^[0-9a-fA-F]*$/;
        
            // Reset styles
            recipientInput.style.border = "1px solid rgba(255,255,255,0.2)";
            addressWarning.style.display = 'none';
        
            if (!addr) return;
        
            // Length check
            if (addr.length > 42) {
                recipientInput.style.border = "2px solid #FF4D4D";
                addressWarning.style.display = 'block';
                addressWarning.textContent = "Invalid address.";
                addressWarning.style.color = "#FF6666";
                return;
            }
        
            // Prefix check
            if (!addr.startsWith('0x')) {
                recipientInput.style.border = "2px solid #FF4D4D";
                addressWarning.style.display = 'block';
                addressWarning.textContent = "Invalid address.";
                addressWarning.style.color = "#FF6666";
                return;
            }
        
            // Character check
            if (!hexRegex.test(hexPart)) {
                recipientInput.style.border = "2px solid #FF4D4D";
                addressWarning.style.display = 'block';
                addressWarning.textContent = "Invalid address.";
                addressWarning.style.color = "#FF6666";
                return;
            }
        
            // Valid format — check if high-risk pattern
            const lowerAddr = addr.toLowerCase();
            const highRisk = (
                lowerAddr.startsWith('0x0000') ||
                lowerAddr.startsWith('0xdead') ||
                lowerAddr.startsWith('0x1111') ||
                lowerAddr === '0x0000000000000000000000000000000000000000'
            );
        
            if (ethers.isAddress(addr)) {
                recipientInput.style.border = highRisk ? "2px solid #FFA500" : "2px solid #30B886";
                addressWarning.style.display = 'block';
                addressWarning.textContent = highRisk ? "High-risk address." : "Valid address.*";
                addressWarning.style.color = highRisk ? "#FFA500" : "#30B886";
            } else {
                recipientInput.style.border = "1px solid rgba(255,255,255,0.2)";
                addressWarning.style.display = 'none';
            }
        });
    
        amountInput.addEventListener('input', () => {
            const raw = parseFloat(amountInput.value.trim());
            if (!isNaN(raw) && raw > 0) {
                const fee = (raw * 0.01).toFixed(2);
                const total = (raw + raw * 0.01).toFixed(2);
                totalDisplay.textContent = parseFloat(total).toLocaleString();
                feeDisplay.textContent = parseFloat(fee).toLocaleString();
            } else {
                totalDisplay.textContent = "—";
                feeDisplay.textContent = "—";
            }
        });


       //  CODE TEST!!! //


       amountInput.addEventListener('input', () => {
        const rawInput = amountInput.value.trim();
        const amountWarning = document.getElementById('amount-warning');
    
        // Reject alphabetic characters or scientific notation like "1e6"
        const invalidCharRegex = /[a-df-zA-DF-Z]/;
        if (invalidCharRegex.test(rawInput) || rawInput.startsWith('e') || rawInput.startsWith('E')) {
            amountInput.style.border = "2px solid #FF4D4D";
            amountWarning.textContent = "Invalid amount format.";
            amountWarning.style.display = 'block';
            return;
        }
    
        const raw = parseFloat(rawInput);
        if (isNaN(raw) || raw <= 0) {
            feeDisplay.textContent = "—";
            totalDisplay.textContent = "—";
            amountWarning.textContent = "Please enter a valid amount.";
            amountWarning.style.display = 'block';
            return;
        }
    
        // Optional: check decimal length
        const decimalPart = rawInput.split('.')[1];
        if (decimalPart && decimalPart.length > 6) {
            amountInput.style.border = "2px solid #FF4D4D";
            amountWarning.textContent = "Too many decimal places.";
            amountWarning.style.display = 'block';
            return;
        }
    
        // Balance check
        const exceedsBalance = raw > (window.currentUSDCBalance || 0);
        if (exceedsBalance) {
            amountInput.style.border = "2px solid #FF4D4D";
            amountWarning.textContent = "Amount exceeds wallet balance.";
            amountWarning.style.display = 'block';
            return;
        }
    
        // Clear errors
        amountInput.style.border = "1px solid rgba(255,255,255,0.2)";
        amountWarning.style.display = 'none';
    
        const fee = (raw * 0.01).toLocaleString(undefined, { maximumFractionDigits: 2 });
        const total = (raw + raw * 0.01).toLocaleString(undefined, { maximumFractionDigits: 2 });
        feeDisplay.textContent = fee;
        totalDisplay.textContent = total;
    });

    
  //  CODE TEST!!! //

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
            onConfirm && onConfirm();
        }

        function cancelHandler() {
            cleanup();
            onCancel && onCancel();
        }

        confirmBtn.onclick = confirmHandler;
        cancelBtn.onclick = cancelHandler;
    }
});

