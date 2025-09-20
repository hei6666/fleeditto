import useSWR from 'swr';

// DexScreener API response type
export interface DexScreenerPairData {
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
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  pairCreatedAt: number;
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPairData[];
}

// Mock pair addresses for testing - replace with dynamic lookup later
// For now, using placeholder addresses that will trigger fallback behavior
export const MOCK_PAIR_ADDRESSES: Record<string, string> = {
  // These are example addresses - in production, these would be actual Aptos pool addresses
  'APT/USDC': 'test_apt_usdc_pair', // Triggers graceful fallback
  'APT/USDT': 'test_apt_usdt_pair', // Triggers graceful fallback
  'USDC/USDT': 'test_usdc_usdt_pair', // Triggers graceful fallback
  'APT/WETH': 'test_apt_weth_pair', // Triggers graceful fallback
};

// Fetcher function for SWR
const fetcher = async (url: string): Promise<DexScreenerResponse> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Handle different possible response formats from DexScreener
  // Sometimes the API returns { pairs: [...] }, sometimes { pair: {...} }, or null
  let normalizedData = data;
  
  if (data && data.pair && !data.pairs) {
    // Single pair response - convert to pairs array format
    normalizedData = {
      schemaVersion: data.schemaVersion || '1.0.0',
      pairs: [data.pair]
    };
  } else if (data && !data.pairs) {
    // No pairs found - create empty response
    normalizedData = {
      schemaVersion: data.schemaVersion || '1.0.0',
      pairs: []
    };
  } else if (!data) {
    // Null response
    normalizedData = {
      schemaVersion: '1.0.0',
      pairs: []
    };
  }
  
  // Validate final structure
  if (!normalizedData.pairs || !Array.isArray(normalizedData.pairs)) {
    console.warn('Unexpected DexScreener API response format:', data);
    // Return empty pairs instead of throwing error
    return {
      schemaVersion: '1.0.0',
      pairs: []
    };
  }
  
  return normalizedData;
};

/**
 * Custom hook to fetch live price data from DexScreener API
 * 
 * @param pairAddress - The pair address to fetch price data for
 * @param enabled - Whether to enable the API call (default: true)
 * @returns SWR response with price data, loading state, and error handling
 */
export function useDexScreenerPrice(pairAddress: string | null, enabled: boolean = true) {
  const apiUrl = pairAddress 
    ? `https://api.dexscreener.com/latest/dex/pairs/aptos/${pairAddress}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    enabled && apiUrl ? apiUrl : null,
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes as requested
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      onError: (error) => {
        console.error('DexScreener API error:', error);
      }
    }
  );

  // Extract the first pair data (most relevant)
  const pairData = data?.pairs?.[0] || null;
  
  // Parse price data
  const currentPrice = pairData ? {
    native: parseFloat(pairData.priceNative),
    usd: parseFloat(pairData.priceUsd),
    formatted: {
      native: parseFloat(pairData.priceNative).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      }),
      usd: parseFloat(pairData.priceUsd).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      })
    }
  } : null;

  // Extract volume and price change data
  const marketData = pairData ? {
    volume24h: pairData.volume?.h24 || 0,
    priceChange24h: pairData.priceChange?.h24 || 0,
    liquidity: pairData.liquidity?.usd || 0,
    fdv: pairData.fdv || 0
  } : null;

  return {
    // Core price data
    currentPrice,
    marketData,
    pairData,
    
    // SWR states
    isLoading,
    error: error as Error | null,
    
    // Utility functions
    refetch: mutate,
    
    // Helper computed values
    isError: !!error,
    isSuccess: !!pairData && !error,
    hasData: !!pairData
  };
}

/**
 * Helper hook to get pair address by token symbols
 * In a real implementation, this would lookup the actual pair address
 * For now, it returns mock addresses for testing
 */
export function usePairAddress(token0Symbol: string, token1Symbol: string) {
  const pairKey = `${token0Symbol}/${token1Symbol}`;
  const reversePairKey = `${token1Symbol}/${token0Symbol}`;
  
  // Check both directions of the pair
  const pairAddress = MOCK_PAIR_ADDRESSES[pairKey] || MOCK_PAIR_ADDRESSES[reversePairKey] || null;
  
  return {
    pairAddress,
    pairKey: pairAddress ? pairKey : reversePairKey,
    isSupported: !!pairAddress
  };
}