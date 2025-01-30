<script lang="ts" context="module">
    import type { WalletInfo } from '$lib/services/wallet';

    let walletInfo = $state<WalletInfo | null>(null);
    let availableWallets = $state<WalletInfo[]>([]);
    let walletBalance = $state<bigint>(BigInt(0));

    export function getWalletState() {
        return {
            info: walletInfo,
            wallets: availableWallets,
            balance: walletBalance,
            updateInfo(info: WalletInfo | null) { walletInfo = info; },
            updateWallets(wallets: WalletInfo[]) { availableWallets = wallets; },
            updateBalance(balance: bigint) { walletBalance = balance; },
            reset() {
                walletInfo = null;
                walletBalance = BigInt(0);
            }
        };
    }
</script>

<script lang="ts">
    // This component doesn't need to render anything
</script> 
