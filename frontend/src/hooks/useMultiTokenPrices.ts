import { useMemo } from 'react';

export interface TokenPriceInfo {
  symbol: string;
  address: string;
  priceUsd: number | null;
  isLoading: boolean;
  error: Error | null;
}

// Mock price data for now - in a real implementation this would come from an API
const MOCK_PRICES: Record<string, number> = {
  'APT': 12.50,
  'USDC': 1.00,
  'USDT': 1.00,
  'WETH': 2500.00,
  'BTC': 45000.00,
  'ETH': 2500.00
};

/**
 * Simplified hook for multi-token pricing that doesn't violate Rules of Hooks
 * For now uses mock data - will be replaced with real API integration later
 */
export function useMultiTokenPrices(tokens: Array<{ symbol: string; address: string }>) {
  // Get unique token symbols to avoid duplicate calculations
  const uniqueTokens = useMemo(() => {
    const seen = new Set<string>();
    return tokens.filter(token => {
      if (seen.has(token.symbol)) {
        return false;
      }
      seen.add(token.symbol);
      return true;
    });
  }, [tokens]);

  // Create price data for unique tokens
  const priceData = useMemo(() => {
    return uniqueTokens.map(token => ({
      symbol: token.symbol,
      address: token.address,
      priceUsd: MOCK_PRICES[token.symbol] || null,
      isLoading: false,
      error: MOCK_PRICES[token.symbol] ? null : new Error(`Price not available for ${token.symbol}`)
    }));
  }, [uniqueTokens]);

  // Create a map for easy lookup
  const priceMap = useMemo(() => {
    const map = new Map<string, TokenPriceInfo>();
    priceData.forEach(price => {
      map.set(price.symbol, price);
    });
    return map;
  }, [priceData]);

  // Return price info for all requested tokens (including duplicates)
  const tokenPrices = useMemo(() => {
    return tokens.map(token => {
      const priceInfo = priceMap.get(token.symbol);
      return priceInfo || {
        symbol: token.symbol,
        address: token.address,
        priceUsd: null,
        isLoading: false,
        error: new Error(`Price not found for ${token.symbol}`)
      };
    });
  }, [tokens, priceMap]);

  const isLoading = priceData.some(price => price.isLoading);
  const hasError = priceData.some(price => price.error);
  const allLoaded = true; // All mock data is immediately available

  return {
    tokenPrices,
    priceMap,
    isLoading,
    hasError,
    allLoaded
  };
}