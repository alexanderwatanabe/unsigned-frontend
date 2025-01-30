import type { WalletInfo } from '$lib/services/wallet';

// Rename the file to wallet.state.ts since we're not using stores anymore
let walletInfo = $state<WalletInfo | null>(null);
let availableWallets = $state<WalletInfo[]>([]);
let walletBalance = $state<bigint>(BigInt(0));

export function updateWalletInfo(info: WalletInfo | null) {
    walletInfo = info;
}

export function updateAvailableWallets(wallets: WalletInfo[]) {
    availableWallets = wallets;
}

export function updateWalletBalance(balance: bigint) {
    walletBalance = balance;
}

export function resetWallet() {
    walletInfo = null;
    walletBalance = BigInt(0);
}

export { walletInfo, availableWallets, walletBalance }; 
