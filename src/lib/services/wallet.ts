import { BrowserWallet } from '@meshsdk/core';

export type WalletInfo = {
    name: string;
    icon: string;
    connected: boolean;
    address?: string;
};

class WalletService {
    private static instance: WalletService;
    private currentWallet: BrowserWallet | null = null;

    private constructor() {}

    public static getInstance(): WalletService {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService();
        }
        return WalletService.instance;
    }

    async getAvailableWallets(): Promise<WalletInfo[]> {
        const wallets = await BrowserWallet.getInstalledWallets();
        return wallets.map(wallet => ({
            name: wallet.name,
            icon: wallet.icon,
            connected: false
        }));
    }

    async connectWallet(walletName: string): Promise<WalletInfo> {
        try {
            this.currentWallet = await BrowserWallet.enable(walletName);
            const addresses = await this.currentWallet.getUsedAddresses();
            const address = addresses[0];

            return {
                name: walletName,
                icon: (await this.getAvailableWallets()).find(w => w.name === walletName)?.icon || '',
                connected: true,
                address
            };
        } catch (error) {
            console.error('Error connecting wallet:', error);
            throw new Error('Failed to connect wallet');
        }
    }

    async disconnectWallet(): Promise<void> {
        this.currentWallet = null;
    }

    async getBalance(): Promise<bigint> {
        if (!this.currentWallet) {
            throw new Error('No wallet connected');
        }
        const balance = await this.currentWallet.getBalance();
        return BigInt(balance[0].quantity);
    }

    isConnected(): boolean {
        return this.currentWallet !== null;
    }

    getCurrentWallet(): BrowserWallet | null {
        return this.currentWallet;
    }
}

export const walletService = WalletService.getInstance(); 
