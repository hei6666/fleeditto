import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Fleeditto DeFi Dashboard',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get this from https://cloud.walletconnect.com
  chains: [mainnet, polygon, optimism, arbitrum, sepolia],
  ssr: true,
});