// The vite-plugin-node-polyfills handles most of what we need
if (typeof window !== 'undefined') {
    (window as any).global = window;
} 