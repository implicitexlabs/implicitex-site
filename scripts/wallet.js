// Wait for the DOM to load before initializing wallet functionality
document.addEventListener('DOMContentLoaded', function () {
    // DOM elements for wallet connection and transfer initiation
    const connectBtn = document.getElementById('btn-connect');
    const createBtn = document.getElementById('btn-create');
    const walletData = document.getElementById('wallet-data');
    const addrDisplay = document.getElementById('wallet-address');
    let fullWalletAddress = ""; // Store the connected wallet address

    // Utility function to shorten wallet addresses for display
    function shortenAddress(addr) {
        return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";
    }

    // Providers for Ethereum, Sepolia, and Polygon networks
    const providers = {
        "0x1": new ethers.JsonRpcProvider("https://eth-mainnet.g.alchemy.com/v2/tNw9iRsScHuuRi9OzxX1lGHx83a3UNmt"),
        "0xaa36a7": new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/tNw9iRsScHuuRi9OzxX1lGHx83a3UNmt"),
        "0x89": new ethers.JsonRpcProvider("https://polygon-mainnet.g.alchemy.com/v2/tNw9iRsScHuuRi9OzxX1lGHx83a3UNmt")
    };

    // Determine the active provider based on the connected wallet's chain
    async function getActiveProvider() {
        if (!window.ethereum) return providers["0xaa36a7"]; // Fallback to Sepolia if no wallet
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        return providers[chainId] || providers["0xaa36a7"]; // Default to Sepolia if chainId unknown
    }

    // Display wallet balances (USDC and ETH) and transaction history
    async function showBalances(address) {
        const provider = await getActiveProvider();
        const ethBal = Number(ethers.formatEther(await provider.getBalance(address))).toLocaleString(undefined, { maximumFractionDigits: 6 });
        const chainId = (await provider.getNetwork()).chainId.toString();

        // USDC contract addresses for supported networks
        const USDC_ADDRESS = {
            "11155111": "0x5c221e77624690fff6dd741493d735a17716c26b", // Sepolia
            "137": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Polygon
            "1": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" // Ethereum mainnet
        }[chainId];

        // USDC contract interaction
        const usdc = new ethers.Contract(USDC_ADDRESS, [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "event Transfer(address indexed from, address indexed to, uint256 value)"
        ], provider);
        const decimals = await usdc.decimals();
        window.currentUSDCBalance = parseFloat(ethers.formatUnits(await usdc.balanceOf(address), decimals));

        // Update modal with address and balances
        document.getElementById('modal-wallet-address').textContent = shortenAddress(address);
        document.getElementById('modal-wallet-balances').textContent = `USDC: ${window.currentUSDCBalance.toFixed(2)} | ETH: ${ethBal}`;

        // Fetch and display last 10 transfers for the connected wallet
        const transferEvents = await usdc.queryFilter("Transfer", -1000);
        const historyHtml = transferEvents
            .filter(e => e.args.from === address || e.args.to === address)
            .slice(0, 10)
            .map(e => `<div>Transfer: ${ethers.formatUnits(e.args.value, decimals)} USDC to ${shortenAddress(e.args.to)} 
            (<a href="${chainId === "137" ? "https://polygonscan.com/tx/" : "https://sepolia.etherscan.io/tx/"}${e.transactionHash}" target="_blank">View</a>)</div>`)
            .join('');
        document.getElementById('modal-transaction-history').innerHTML = historyHtml || "No recent transfers.";
    }

    // Handle wallet connection via MetaMask
    connectBtn.addEventListener('click', async () => {
        if (!window.ethereum) return alert("No Ethereum provider detected. Please install MetaMask.");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            fullWalletAddress = accounts[0];
            connectBtn.textContent = 'Connected';
            connectBtn.disabled = true;
            walletData.textContent = shortenAddress(fullWalletAddress);
            addrDisplay.style.color = "#30B886";
            showBalances(fullWalletAddress);
            createBtn.disabled = false;
        } catch (err) {
            alert("Error: " + (err.message || err));
        }
    });

    // Handle transfer initiation and modal display
    createBtn.addEventListener('click', () => {
        if (!fullWalletAddress) {
            const hint = document.getElementById('wallet-hint');
            hint.classList.add('visible');
            hint.style.visibility = 'visible';
            hint.style.opacity = 1;
            hint.textContent = 'Please connect your wallet first.';
            setTimeout(() => hint.classList.remove('visible') && (hint.style.opacity = 0) && (hint.style.visibility = 'hidden'), 4000);
            return;
        }

        // Modal HTML for transfer input and confirmation
        const modalHtml = `
            <div class="modal-output-block">
                <label class="modal-label">Address</label>
                <div id="modal-wallet-address" class="output-field">Loading...</div>
                <div class="hint">Click to reveal. Double-click to copy.</div>
                <label class="modal-label">Balance(s)</label>
                <div id="modal-wallet-balances" class="output-field">USDC: — | ETH: —</div>
                <label class="modal-label">Transaction History</label>
                <div id="modal-transaction-history" class="output-field">Loading...</div>
                <hr class="modal-divider" />
            </div>
            <div class="modal-input-block">
                <label class="summary-label" for="modal-recipient">Recipient Address</label>
                <input id="modal-recipient" type="text" class="modal-input" placeholder="0x... or ENS name" />
                <div id="address-warning" class="hint"></div>
                <label class="summary-label" for="modal-amount">Amount (USDC)</label>
                <input id="modal-amount" type="number" step="0.01" class="modal-input" placeholder="e.g. 20.00" />
                <div id="amount-warning" class="hint">1% fee (0.5% with subscription)</div>
                <div class="modal-network-options">
                    <label for="network-select">Network:</label>
                    <select id="network-select">
                        <option value="0x1">Ethereum</option>
                        <option value="0x89">Polygon</option>
                    </select>
                </div>
                <div class="modal-fee-summary">
                    <div>Transfer Fee (USDC): <span id="fee-display">—</span></div>
                    <div>Transfer Total (USDC): <span id="total-display" class="total-highlight">—</span></div>
                    <div>Gas Estimate (ETH): <span id="gas-display">—</span></div>
                </div>
                <button id="subscribe-btn" class="modal-btn">Subscribe ($5/month for 0.5% fee)</button>
            </div>
        `;

        // Show modal and handle transfer confirmation
        showModal(modalHtml, async () => {
            let recipient = document.getElementById('modal-recipient').value.trim();
            const amount = parseFloat(document.getElementById('modal-amount').value.trim());
            const provider = new ethers.BrowserProvider(window.ethereum);
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });

            // Resolve ENS names if provided
            if (recipient.endsWith('.eth')) {
                recipient = await (await getActiveProvider()).resolveName(recipient) || recipient;
                if (!ethers.isAddress(recipient)) return alert("Invalid ENS name.");
                document.getElementById('modal-recipient').value = recipient;
            }

            // Validate recipient and amount
            if (!ethers.isAddress(recipient)) return alert("Invalid address.");
            if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

            // Network-specific USDC and contract addresses
            const USDC_ADDRESS = {
                "0xaa36a7": "0x5c221e77624690fff6dd741493d735a17716c26b",
                "0x89": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                "0x1": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            }[chainId];
            const TRANSFER_ADDRESS = "0xYourImplicitExTransferAddress"; // Replace with actual address
            const SUBSCRIPTION_ADDRESS = "0xYourSubscriptionContractAddress"; // Replace with actual address

            // Check subscription status and calculate fee
            const subscriptionContract = new ethers.Contract(SUBSCRIPTION_ADDRESS, ["function isSubscribed(address user) view returns (bool)"], provider);
            const isSubscribed = await subscriptionContract.isSubscribed(fullWalletAddress);
            const feeRate = isSubscribed ? 0.005 : 0.01;
            const fee = amount * feeRate;
            const total = amount + fee;

            if (total > window.currentUSDCBalance) return alert("Insufficient USDC.");

            // Estimate gas cost for the transfer
            const transferContract = new ethers.Contract(TRANSFER_ADDRESS, ["function transfer(address recipient, uint256 amount)"], provider);
            const gasPrice = await provider.getGasPrice();
            const gasEstimate = await transferContract.estimateGas.transfer(recipient, ethers.parseUnits(amount.toString(), 6));
            const gasCost = ethers.formatEther(gasPrice * gasEstimate);
            document.getElementById('gas-display').textContent = gasCost.slice(0, 8);

            // Prompt for Polygon if Ethereum gas is high
            if (chainId === "0x1" && parseFloat(ethers.formatUnits(gasPrice, 'gwei')) > 100) {
                if (confirm("High gas prices on Ethereum. Switch to Polygon?")) {
                    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] });
                    return;
                }
            }

            // Warn if recipient is a contract
            if ((await provider.getCode(recipient)) !== '0x' && !confirm("Recipient is a contract. Proceed?")) return;

            try {
                const signer = await provider.getSigner();
                const transferContract = new ethers.Contract(TRANSFER_ADDRESS, ["function transfer(address recipient, uint256 amount)"], signer);
                const tx = await transferContract.transfer(recipient, ethers.parseUnits(amount.toString(), 6));
                alert("Transaction sent...");
                await tx.wait();
                alert("✅ Confirmed!");
                showBalances(fullWalletAddress);
            } catch (err) {
                alert("Error: " + (err.message || err));
            }
        });

        // Handle subscription button click
        document.getElementById('subscribe-btn').addEventListener('click', async () => {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const subscriptionContract = new ethers.Contract("0xYourSubscriptionContractAddress", ["function subscribe()"], signer);
                const tx = await subscriptionContract.subscribe({ value: ethers.parseUnits("5", 6) });
                alert("Subscription transaction sent...");
                await tx.wait();
                alert("✅ Subscribed! Fee reduced to 0.5%.");
                showBalances(fullWalletAddress);
            } catch (err) {
                alert("Error: " + (err.message || err));
            }
        });

        bindModalValidation();
    });

    // Validate recipient address and amount inputs in the modal
    function bindModalValidation() {
        const recipientInput = document.getElementById('modal-recipient');
        const amountInput = document.getElementById('modal-amount');
        const feeDisplay = document.getElementById('fee-display');
        const totalDisplay = document.getElementById('total-display');
        const addressWarning = document.getElementById('address-warning');
        const amountWarning = document.getElementById('amount-warning');

        // Validate recipient address (including ENS resolution)
        recipientInput.addEventListener('input', async () => {
            let addr = recipientInput.value.trim();
            if (addr.endsWith('.eth')) {
                addr = await (await getActiveProvider()).resolveName(addr) || addr;
                addressWarning.textContent = addr && ethers.isAddress(addr) ? `Resolved ENS: ${shortenAddress(addr)}` : "Invalid ENS name.";
                recipientInput.style.border = addr && ethers.isAddress(addr) ? "" : "2px solid #FF4D4D";
            } else {
                addressWarning.textContent = addr && !ethers.isAddress(addr) ? "Invalid Ethereum address." : "";
                recipientInput.style.border = addr && !ethers.isAddress(addr) ? "2px solid #FF4D4D" : "";
            }
        });

        // Validate amount and update fee/total display
        amountInput.addEventListener('input', async () => {
            const val = parseFloat(amountInput.value.trim());
            if (isNaN(val) || val <= 0) {
                amountWarning.textContent = "Please enter a valid amount.";
                return;
            }
            const provider = await getActiveProvider();
            const subscriptionContract = new ethers.Contract("0xYourSubscriptionContractAddress", ["function isSubscribed(address user) view returns (bool)"], provider);
            const isSubscribed = await subscriptionContract.isSubscribed(fullWalletAddress);
            const feeRate = isSubscribed ? 0.005 : 0.01;
            const fee = val * feeRate;
            const total = val + fee;
            feeDisplay.textContent = fee.toFixed(2);
            totalDisplay.textContent = total.toFixed(2);
            amountWarning.textContent = total > window.currentUSDCBalance ? "Amount exceeds balance." : `Fee: ${feeRate * 100}%${isSubscribed ? ' (subscribed)' : ''}.`;
        });

        // Handle network selection and update balances/gas
        document.getElementById('network-select').addEventListener('change', async (e) => {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: e.target.value }] });
            showBalances(fullWalletAddress);
            const provider = await getActiveProvider();
            const gasPrice = await provider.getGasPrice();
            const gasEstimate = await provider.estimateGas({ to: "0xYourImplicitExTransferAddress", data: "0x" });
            document.getElementById('gas-display').textContent = ethers.formatEther(gasPrice * gasEstimate).slice(0, 8);
        });
    }

    // Display modal with transfer details and handle confirm/cancel
    function showModal(html, onConfirm) {
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

        function confirmHandler() { cleanup(); if (onConfirm) onConfirm(); }
        function cancelHandler() { cleanup(); }

        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);

        bindModalValidation();
        showBalances(fullWalletAddress);
    }
});