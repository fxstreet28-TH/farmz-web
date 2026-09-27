/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // WalletConnect / MetaMask SDK pull in optional node-only deps; stub them for the browser bundle.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Typed via src/types/ecctrl-lib.d.ts (the package's own d.ts pulls in raw .tsx sources).
    config.resolve.alias = { ...config.resolve.alias, "ecctrl-lib": "ecctrl" };
    // @base-org/account -> @coinbase/cdp-sdk optionally imports x402 payment packages we never use.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
    };
    return config;
  },
};

export default nextConfig;
