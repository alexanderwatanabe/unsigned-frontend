import type { WalletAsset } from '$lib/types';
import { BrowserWalletState } from '@meshsdk/svelte';

export async function getWalletAssets(): Promise<WalletAsset[]> {
    if (!BrowserWalletState.connected || !BrowserWalletState.wallet) {
        throw new Error('No wallet connected');
    }
    
    const assets = await BrowserWalletState.wallet.getAssets();
    return assets;
} 