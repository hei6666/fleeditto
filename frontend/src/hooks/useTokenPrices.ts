import useSWR from 'swr';
import { useMemo } from 'react';

// DexScreener single token API response type
export interface DexScreenerTokenData {
  chainId: string;
  tokenAddress: string;
  price: number;
  priceUsd: string;
  price24hChange: number;
  liquidity: number;
  volume24h: number;
  marketCap?: number;
  name?: string;
  symbol?: string;
}

export interface DexScreenerTokenResponse {
  schemaVersion: string;
  pairs: Array<{
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
      address: string;
      name: string;
      symbol: string;
    };
    quoteToken: {
      address: string;
      name: string;
      symbol: string;
    };
    priceNative: string;
    priceUsd: string;
    volume: {
      h24: number;
      h6: number;
      h1: number;
      m5: number;
    };
    priceChange: {
      h24: number;
      h6: number;
      h1: number;
      m5: number;
    };
  }>;
}

// Official Aptos Fungible Asset (FA) Addresses for testing
export const OFFICIAL_APTOS_TOKENS = {
  APT: '0xa', // Special case - APT still uses full type name
  USDC: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b', // Native USDC (Circle)
  USDT: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b', // Native USDT (Tether)
} as const;

// Fetcher function for individual token prices
const tokenFetcher = async (url: string): Promise<DexScreenerTokenResponse> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Handle different response formats from DexScreener
  if (!data || (!data.pairs && !data.pair)) {
    console.warn('No price data found for token');
    return {
      schemaVersion: '1.0.0',
      pairs: []
    };
  }
  
  // Normalize response format
  let normalizedData = data;
  if (data.pair && !data.pairs) {
    normalizedData = {
      schemaVersion: data.schemaVersion || '1.0.0',
      pairs: [data.pair]
    };
  }
  
  return normalizedData;
};

/**
 * Hook to fetch price data for a single token
 */
export function useTokenPrice(tokenAddress: string | null, enabled: boolean = true) {
  const apiUrl = tokenAddress && enabled 
    ? `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    apiUrl,
    tokenFetcher,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      onError: (error) => {
        console.error(`Token price fetch error for ${tokenAddress}:`, error);
      }
    }
  );

  // Extract the best price data from available pairs
  const priceData = data?.pairs?.[0];
  const priceUsd = priceData ? parseFloat(priceData.priceUsd) : null;
  
  return {
    priceUsd,
    priceChange24h: priceData?.priceChange?.h24 || 0,
    volume24h: priceData?.volume?.h24 || 0,
    tokenInfo: priceData?.baseToken || priceData?.quoteToken,
    isLoading,
    error: error as Error | null,
    refetch: mutate,
    hasData: !!priceData && !!priceUsd
  };
}

/**
 * Hook to fetch prices for two tokens and calculate their relative price
 * This is the core hook for creating new liquidity positions
 */
export function useRelativeTokenPrice(
  baseTokenAddress: string | null, 
  quoteTokenAddress: string | null,
  enabled: boolean = true
) {
  const shouldFetch = enabled && !!baseTokenAddress && !!quoteTokenAddress;
  
  // Fetch both token prices in parallel
  const baseToken = useTokenPrice(baseTokenAddress, shouldFetch);
  const quoteToken = useTokenPrice(quoteTokenAddress, shouldFetch);
  
  // Calculate relative price: baseToken / quoteToken
  const relativePrice = useMemo(() => {
    if (!baseToken.priceUsd || !quoteToken.priceUsd || baseToken.priceUsd <= 0 || quoteToken.priceUsd <= 0) {
      return null;
    }
    
    return baseToken.priceUsd / quoteToken.priceUsd;
  }, [baseToken.priceUsd, quoteToken.priceUsd]);

  // Loading state - true if either token is loading
  const isLoading = baseToken.isLoading || quoteToken.isLoading;
  
  // Error state - if either token has an error
  const error = baseToken.error || quoteToken.error;
  
  // Success state - both tokens have data
  const hasData = baseToken.hasData && quoteToken.hasData;

  // Format the relative price for display
  const formattedRelativePrice = relativePrice ? {
    value: relativePrice,
    formatted: relativePrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }),
    display: `1 ${baseToken.tokenInfo?.symbol || 'BASE'} = ${relativePrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })} ${quoteToken.tokenInfo?.symbol || 'QUOTE'}`
  } : null;

  // Market data aggregated from both tokens
  const marketData = hasData ? {
    baseTokenUsd: baseToken.priceUsd!,
    quoteTokenUsd: quoteToken.priceUsd!,
    basePriceChange24h: baseToken.priceChange24h,
    quotePriceChange24h: quoteToken.priceChange24h,
    baseVolume24h: baseToken.volume24h,
    quoteVolume24h: quoteToken.volume24h,
    combinedVolume24h: baseToken.volume24h + quoteToken.volume24h
  } : null;

  return {
    // Core relative price data
    relativePrice,
    formattedRelativePrice,
    marketData,
    
    // Individual token data
    baseToken: {
      address: baseTokenAddress,
      priceUsd: baseToken.priceUsd,
      info: baseToken.tokenInfo,
      isLoading: baseToken.isLoading,
      error: baseToken.error
    },
    quoteToken: {
      address: quoteTokenAddress,
      priceUsd: quoteToken.priceUsd,
      info: quoteToken.tokenInfo,
      isLoading: quoteToken.isLoading,
      error: quoteToken.error
    },
    
    // Combined states
    isLoading,
    error,
    hasData,
    
    // Utility functions
    refetch: () => {
      baseToken.refetch();
      quoteToken.refetch();
    }
  };
}

/**
 * Utility function to validate Aptos FA addresses
 */
export function isValidAptosAddress(address: string): boolean {
  // Modern FA addresses use standard Aptos account address format: 0x[64 hex chars]
  // Special case: APT still uses full type format
  if (address === '0xa') {
    return true;
  }
  
  // Standard FA address format: 0x followed by 64 hexadecimal characters
  const faAddressRegex = /^0x[a-fA-F0-9]{64}$/;
  return faAddressRegex.test(address);
}

/**
 * Helper function to get token symbol from address (for known tokens)
 */
export function getTokenSymbolFromAddress(address: string): string {
  const knownTokens = Object.entries(OFFICIAL_APTOS_TOKENS).find(([_, addr]) => addr === address);
  if (knownTokens) {
    return knownTokens[0];
  }
  
  // For APT special case
  if (address === '0xa') {
    return 'APT';
  }
  
  // For unknown FA addresses, show shortened version
  if (address.startsWith('0x') && address.length === 66) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return 'UNKNOWN';
}