// --- Network and Provider Setup ---
const ALLOWED_CHAIN_IDS = [
    "0x1",      // Ethereum Mainnet
    "0x89",     // Polygon Mainnet
    "0xaa36a7", // Sepolia Testnet
    // Add more if needed
];

const NETWORK_NAMES = {
    "0x1": "Ethereum Mainnet",
    "0x89": "Polygon Mainnet",
    "0xaa36a7": "Sepolia Testnet",
    // Add more as needed
};

// Read-only providers
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
        // Add others as needed
        return sepoliaProvider;
    } catch {
        return sepoliaProvider;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const connectBtn = document.getElementById('btn-connectwallet');
    const walletData = document.getElementById('wallet-data');
    const addrDisplay = document.getElementById('wallet-address');
    const sendBtn = document.getElementById('btn-send');
    const recipientInput = document.getElementById('recipient-address');
    const amountInput = document.getElementById('send-amount');
    const sendFeedback = document.getElementById('send-feedback');
    let fullWalletAddress = "";
    let showFullTimeout = null;

    function shortenAddress(addr) {
        if (!addr) return "";
        return addr.slice(0, 6) + "..." + addr.slice(-4);
    }

    // --- BALANCE DISPLAY FUNCTION ---
    async function showBalances(address) {
        const balancesDiv = document.getElementById('wallet-balances');
        balancesDiv.innerHTML = 'Fetching balances...';
        let ethBal = "—";
        let usdcBal = "—";
        try {
            const provider = await getActiveProvider();

            // ETH balance
            const ethRaw = await provider.getBalance(address);
            ethBal = Number(ethers.formatEther(ethRaw)).toLocaleString(undefined, { maximumFractionDigits: 6 });

            // Detect network (robust: use chainId)
            const network = await provider.getNetwork();
            let USDC_ADDRESS;
            if (network.chainId === 11155111) { // Sepolia
                USDC_ADDRESS = "0x5c221e77624690fff6dd741493d735a17716c26b";
            } else {
                USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Mainnet fallback
            }

            const ERC20_ABI = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)"
            ];
            const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

            try {
                const decimals = await usdc.decimals();
                const raw = await usdc.balanceOf(address);
                usdcBal = Number(ethers.formatUnits(raw, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });
            } catch (err) {
                console.error("USDC fetch error:", err);
                usdcBal = "—";
            }
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

    // --- CONNECT WALLET ---
    connectBtn.addEventListener('click', async () => {
        if (typeof window.ethereum === "undefined") {
            alert("No Ethereum provider detected. Please install MetaMask.");
            walletData.textContent = "";
            addrDisplay.style.color = "#30B886";
            return;
        }
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                connectBtn.textContent = 'Connected';
                connectBtn.disabled = true;
                connectBtn.style.opacity = 0.7;
                fullWalletAddress = accounts[0];
                walletData.textContent = shortenAddress(fullWalletAddress);
                walletData.title = "Click to reveal full address";
                addrDisplay.style.color = "#30B886";
                showBalances(fullWalletAddress);
            } else {
                walletData.textContent = "";
                addrDisplay.style.color = "#30B886";
                alert('No accounts found.');
            }
        } catch (err) {
            walletData.textContent = "";
            addrDisplay.style.color = "#30B886";
            alert('User rejected connection or error occurred: ' + (err.message || err));
        }
    });

    // --- REVEAL ADDRESS ---
    walletData.addEventListener('click', function () {
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

    // --- COPY ANIMATION ---
    walletData.addEventListener('dblclick', function () {
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

    // --- SEND USDC TRANSACTION ---
    sendBtn.addEventListener('click', async function () {
        if (!fullWalletAddress) {
            sendFeedback.textContent = "Connect your wallet first.";
            return;
        }
        const recipient = recipientInput.value.trim();
        const amount = parseFloat(amountInput.value.trim());

        if (!recipient || !ethers.isAddress(recipient)) {
            sendFeedback.textContent = "Please enter a valid Ethereum wallet address.";
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            sendFeedback.textContent = "Please enter a valid USDC amount.";
            return;
        }

        sendFeedback.textContent = "Preparing transaction...";

        let chainId;
        try {
            chainId = await window.ethereum.request({ method: 'eth_chainId' });
        } catch {
            sendFeedback.textContent = "Failed to detect network.";
            return;
        }

        let USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Mainnet
        if (chainId === "0xaa36a7") USDC_ADDRESS = "0x5c221e77624690fff6dd741493d735a17716c26b"; // Sepolia

        const ERC20_ABI = [
            "function transfer(address to, uint256 value) public returns (bool)",
            "function decimals() view returns (uint8)"
        ];

        try {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const signer = await browserProvider.getSigner();
            const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

            const decimals = await usdc.decimals();
            const amountToSend = ethers.parseUnits(amount.toString(), decimals);

            showModal(
                `Send <span style="color:#FFD35C;font-weight:700">${amount} USDC</span> to<br>
                <span style="color:#30B886">${recipient}</span>?<br>
                <span style="font-size:.96em;opacity:.8;">Network: ${chainId === "0xaa36a7" ? "Sepolia" : "Mainnet"}</span>`,
                async () => {
                    try {
                        sendFeedback.textContent = "Sending...";
                        const tx = await usdc.transfer(recipient, amountToSend);
                        sendFeedback.textContent = "Transaction sent! Waiting for confirmation...";
                        await tx.wait();
                        sendFeedback.textContent = "✅ USDC sent successfully!";
                        showBalances(fullWalletAddress);
                    } catch (err) {
                        console.error(err);
                        sendFeedback.textContent = "❌ Transaction failed: " + (err.shortMessage || err.message || err);
                    }
                },
                () => {
                    sendFeedback.textContent = "Transaction cancelled.";
                }
            );
            return; // <--- Make sure to return here so code doesn't continue to tx before modal!

            sendFeedback.textContent = "Sending...";
            const tx = await usdc.transfer(recipient, amountToSend);
            sendFeedback.textContent = "Transaction sent! Waiting for confirmation...";
            await tx.wait();
            sendFeedback.textContent = "✅ USDC sent successfully!";

            showBalances(fullWalletAddress);
        } catch (err) {
            console.error(err);
            sendFeedback.textContent = "❌ Transaction failed: " + (err.shortMessage || err.message || err);
        }
    });

    function showModal(message, onConfirm, onCancel) {
        const overlay = document.getElementById('modal-overlay');
        const msgDiv = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        msgDiv.innerHTML = message;
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