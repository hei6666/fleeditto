// src/lib/services/price.ts

import useSWR from 'swr';

export interface TokenPriceData {
  address: string;
  priceUsd: string;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
  marketCap: number;
}

export interface DexScreenerResponse {
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
    txns: {
      m5: { buys: number; sells: number };
      h1: { buys: number; sells: number };
      h6: { buys: number; sells: number };
      h24: { buys: number; sells: number };
    };
    volume: {
      h24: number;
      h6: number;
      h1: number;
      m5: number;
    };
    priceChange: {
      m5: number;
      h1: number;
      h6: number;
      h24: number;
    };
    liquidity: {
      usd: number;
      base: number;
      quote: number;
    };
    fdv: number;
    marketCap: number;
  }>;
}

export class PriceService {
  private static readonly BASE_URL = 'https://api.dexscreener.com/latest/dex';
  
  /**
   * Fetch token price data from DexScreener API
   * @param tokenAddress The token address to fetch price for
   * @returns Promise<TokenPriceData | null>
   */
  static async fetchTokenPrice(tokenAddress: string): Promise<TokenPriceData | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/tokens/${tokenAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DexScreenerResponse = await response.json();
      
      // Find the most liquid pair for this token
      if (!data.pairs || data.pairs.length === 0) {
        return null;
      }
      
      // Sort by liquidity and take the highest
      const bestPair = data.pairs
        .filter(pair => pair.liquidity?.usd > 0)
        .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      
      if (!bestPair) {
        return null;
      }
      
      return {
        address: tokenAddress,
        priceUsd: bestPair.priceUsd || '0',
        priceChange24h: bestPair.priceChange?.h24 || 0,
        volume24h: bestPair.volume?.h24 || 0,
        liquidity: bestPair.liquidity?.usd || 0,
        fdv: bestPair.fdv || 0,
        marketCap: bestPair.marketCap || 0
      };
    } catch (error) {
      console.error('Failed to fetch token price:', error);
      return null;
    }
  }
  
  /**
   * Calculate relative price between two tokens
   * @param tokenAPrice Price of token A in USD
   * @param tokenBPrice Price of token B in USD
   * @returns Relative price (tokenA/tokenB)
   */
  static calculateRelativePrice(tokenAPrice: string, tokenBPrice: string): number {
    const priceA = parseFloat(tokenAPrice);
    const priceB = parseFloat(tokenBPrice);
    
    if (priceB === 0) {
      return 0;
    }
    
    return priceA / priceB;
  }
  
  /**
   * Format price for display
   * @param price Price as string
   * @param decimals Number of decimal places
   * @returns Formatted price string
   */
  static formatPrice(price: string, decimals: number = 6): string {
    const numPrice = parseFloat(price);
    
    if (numPrice === 0) {
      return '0.00';
    }
    
    // For very small prices, show more decimals
    if (numPrice < 0.001) {
      return numPrice.toExponential(3);
    }
    
    // For normal prices, format with appropriate decimals
    if (numPrice < 1) {
      return numPrice.toFixed(Math.min(decimals, 8));
    } else if (numPrice < 1000) {
      return numPrice.toFixed(Math.min(decimals, 4));
    } else {
      return numPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }
  
  /**
   * Format percentage change for display
   * @param change Percentage change as number
   * @returns Formatted percentage string with color class
   */
  static formatPriceChange(change: number): { text: string; className: string } {
    const isPositive = change >= 0;
    const formatted = Math.abs(change).toFixed(2);
    
    return {
      text: `${isPositive ? '+' : '-'}${formatted}%`,
      className: isPositive ? 'text-green-400' : 'text-red-400'
    };
  }
}

// Custom hooks for using with SWR
export function useTokenPrice(tokenAddress: string | null, refreshInterval: number = 300000) {
  const { data, error, isLoading, mutate } = useSWR(
    tokenAddress ? `token-price-${tokenAddress}` : null,
    () => tokenAddress ? PriceService.fetchTokenPrice(tokenAddress) : null,
    {
      refreshInterval, // 5 minutes by default
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  );

  return {
    price: data,
    error,
    isLoading,
    refetch: mutate
  };
}

export function useRelativePrice(
  tokenAAddress: string | null, 
  tokenBAddress: string | null, 
  refreshInterval: number = 300000
) {
  const { price: priceA, isLoading: loadingA, error: errorA } = useTokenPrice(tokenAAddress, refreshInterval);
  const { price: priceB, isLoading: loadingB, error: errorB } = useTokenPrice(tokenBAddress, refreshInterval);

  const relativePrice = (priceA && priceB) 
    ? PriceService.calculateRelativePrice(priceA.priceUsd, priceB.priceUsd)
    : null;

  return {
    relativePrice,
    priceA,
    priceB,
    isLoading: loadingA || loadingB,
    error: errorA || errorB
  };
}