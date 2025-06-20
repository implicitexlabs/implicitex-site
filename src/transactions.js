// src/transactions.js

import { getWalletAddress } from './wallet.js';
import { logEvent } from './utils/logger.js';

// Constants for fee logic
const BASE_FEE_PERCENTAGE = 1; // 1% base fee
const SUBSCRIPTION_DISCOUNT = 0.2; // 0.2% discount for subscribers

/**
 * Calclulates the transaction fee and net amount to be sent.
 * @param {number} amount - Total amount of USDC to send
 * @param {boolean} isSubscribed - Whether sender has subscription
 * @returns {object} - Fee breakdown
 */
export function calculateFees(amount, isSubscribed = false) {
    const feeRate = isSubscribed ? BASE_FEE_PERCENTAGE - SUBSCRIPTION_DISCOUNT : BASE_FEE_PERCENTAGE;
    const fee = +(amount * (feeRate / 100)).toFixed(2);
    const receipientAmount = +(amount - fee).toFixed(2);

    return { total: amount, fee, recipientAmount };
}

/**
* Simulates sending a transaction
* In production, replace with smart contract or API call
* @param {string} recipient - Wallet address
* @param {number} amount - USDC amount
* @param {boolean} isSubscribed - Is user on subscription plan
*/
export async function sendTransaction(recipient, amount, isSubscribed = false) {
    try {
        const sender = await getWalletAddress();
        const { fee, recipientAmount } = calculateFees(amount, isSubscribed);
        // Placeholder tranaction simiulation
        logEvent (`Sending ${recipientAmount} USDC from ${sender} to ${recipient} )fee: ${fee} USDC)`);

        //Simulatd response
        return {
            status: 'success',
            txHash: '0xSIMULATED_TX_HASH',
            sender,
            recipient,
            fee,
            recipientAmount,
            timestamp: new Date().toISOString(),
        };
    }   catch (err) {
        logEvent('Tranaction failed', err);
        throw err;
    }
}