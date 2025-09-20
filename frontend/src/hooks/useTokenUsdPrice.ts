// frontend/src/hooks/useTokenUsdPrice.ts
import useSWR from 'swr';
import { resolveTokenAddress } from '../config/tokens';
import { useAptosClient } from './useAptosClient';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch price data');
  return res.json();
});

export function useTokenUsdPrice(tokenAddress?: string) {
  const { currentNetwork, networkInfo } = useAptosClient();
  
  // Resolve user input to the technical address needed for API queries
  const apiAddress = tokenAddress ? resolveTokenAddress(tokenAddress) : null;
  
  // Create network-specific cache key
  const cacheKey = apiAddress ? [apiAddress, currentNetwork] : null;
  
  const { data, error, isLoading } = useSWR(
    cacheKey,
    async ([address, network]) => {
      // For testnet/devnet, we might not have reliable price data
      // You could implement mock prices or use a different API endpoint
      if (network.toString().toLowerCase() !== 'mainnet') {
        console.warn(`⚠️ Price data may not be available for ${networkInfo.name} network`);
        // Return mock/default price data for non-mainnet networks
        return {
          pairs: [{
            priceUsd: '0.1', // Mock price
            baseToken: { address, name: 'Test Token', symbol: 'TEST' }
          }]
        };
      }
      
      // Use DexScreener for mainnet only
      return fetcher(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`);
    },
    { 
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60000 // 1 minute
    }
  );

  let priceUsd: number | null = null;
  let tokenInfo: any = null;

  if (data && data.pairs?.[0]) {
    priceUsd = parseFloat(data.pairs[0].priceUsd);
    tokenInfo = data.pairs[0].baseToken || data.pairs[0].quoteToken;
  }

  return { 
    priceUsd, 
    tokenInfo,
    error, 
    isLoading,
    network: currentNetwork 
  };
}

/**
 * Hook to calculate relative price between two tokens
 * Divides tokenA USD price by tokenB USD price
 */
export function useRelativePrice(tokenAAddress?: string, tokenBAddress?: string) {
  const tokenAPrice = useTokenUsdPrice(tokenAAddress);
  const tokenBPrice = useTokenUsdPrice(tokenBAddress);

  const relativePrice = tokenAPrice.priceUsd && tokenBPrice.priceUsd 
    ? tokenAPrice.priceUsd / tokenBPrice.priceUsd 
    : null;

  const isLoading = tokenAPrice.isLoading || tokenBPrice.isLoading;
  const error = tokenAPrice.error || tokenBPrice.error;

  return {
    relativePrice,
    tokenAPrice: tokenAPrice.priceUsd,
    tokenBPrice: tokenBPrice.priceUsd,
    tokenAInfo: tokenAPrice.tokenInfo,
    tokenBInfo: tokenBPrice.tokenInfo,
    isLoading,
    error,
    network: tokenAPrice.network
  };
}