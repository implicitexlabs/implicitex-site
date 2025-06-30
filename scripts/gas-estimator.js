// scripts/gas-estimator.js

// Providers (mainnet and polygon, can use Infura, Alchemy, or public endpoints)
const ethProvider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/99f7c194b3bc486c9bd50152e06d55bc');
const polygonProvider = new ethers.JsonRpcProvider('https://polygon-rpc.com/');

const ETH_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const POLYGON_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

const ERC20_ABI = [
  "function transfer(address to, uint256 value) public returns (bool)",
  "function decimals() view returns (uint8)"
];

// Helper to estimate gas cost on a given provider
async function estimateGasCostOnNetwork(provider, usdcAddress, recipient, amount, unit) {
  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient) || isNaN(amount) || amount <= 0) return '—';
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
    const decimals = await usdc.decimals();
    const value = ethers.parseUnits(amount.toString(), decimals);
    const tx = await usdc.populateTransaction.transfer(recipient, value);

    // "from" is required for static providers, use a random address (not for real transactions)
    const from = "0x000000000000000000000000000000000000dead";
    const gas = await provider.estimateGas({
      ...tx,
      from,
      to: usdcAddress
    });

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
    if (!gasPrice) return 'n/a';

    const gasCost = ethers.formatUnits(gas * gasPrice, 'ether');
    return `${parseFloat(gasCost).toFixed(6)} ${unit}`;
  } catch (e) {
    return 'n/a';
  }
}

// Main function to call from wallet.js
window.estimateGasBothNetworks = async function(recipient, amount) {
  // ETH
  const ethGasEl = document.getElementById('eth-gas-display');
  if (ethGasEl)
    ethGasEl.textContent = await estimateGasCostOnNetwork(
      ethProvider, ETH_USDC, recipient, amount, "ETH"
    );
  // Polygon
  const polygonGasEl = document.getElementById('polygon-gas-display');
  if (polygonGasEl)
    polygonGasEl.textContent = await estimateGasCostOnNetwork(
      polygonProvider, POLYGON_USDC, recipient, amount, "MATIC"
    );
}
