"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import { TokenMetadata, TokenBalance, TokenService } from '../lib/services/token';
import { useRelativePrice } from '../hooks/useTokenUsdPrice';
import { updateTokensForNetwork } from '../config/tokens';
import { useAptosClient } from '../hooks/useAptosClient';
import { PoolStats } from '../lib/dex_adapters/interface';

export interface PendingPosition {
  id: string;
  dex: string;
  feeTier: number;
  tokenA: {
    address: string;
    metadata: TokenMetadata;
    amount: string;
  };
  tokenB: {
    address: string;
    metadata: TokenMetadata;
    amount: string;
  };
  minPrice: number;
  maxPrice: number;
  currentPrice: number;
  slippageTolerance: number;
  poolState: 'exists' | 'not_exists';
  timestamp: number;
  aprData?: {
    farmAPR: number;
    feeAPR: number;
    totalAPR: number;
    dailyVolume: number;
  } | null;
}

export interface AppState {
  // DEX Selection
  selectedDex: string | null;
  feeTier: number; // Fee tier in basis points (e.g., 30 for 0.3%)
  
  // Token Configuration
  tokenA: {
    address: string;
    metadata: TokenMetadata | null;
    balance: TokenBalance | null;
    walletBalance: TokenBalance | null; // Original wallet balance
    amount: string;
  };

  tokenB: {
    address: string;
    metadata: TokenMetadata | null;
    balance: TokenBalance | null;
    walletBalance: TokenBalance | null; // Original wallet balance
    amount: string;
  };
  
  // Price Configuration
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  slippageTolerance: number;
  
  // Pool State (new for Hyperion integration)
  poolState: 'idle' | 'loading' | 'exists' | 'not_exists';
  poolStats: PoolStats | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Transaction State
  isSubmitting: boolean;
  transactionHash: string | null;

  // Position Management
  pendingPositions: PendingPosition[];
}

export type AppAction =
  | { type: 'SET_SELECTED_DEX'; payload: string }
  | { type: 'SET_FEE_TIER'; payload: number }
  | { type: 'SET_TOKEN_A_ADDRESS'; payload: string }
  | { type: 'SET_TOKEN_A_METADATA'; payload: TokenMetadata | null }
  | { type: 'SET_TOKEN_A_BALANCE'; payload: TokenBalance | null }
  | { type: 'SET_TOKEN_A_WALLET_BALANCE'; payload: TokenBalance | null }
  | { type: 'SET_TOKEN_A_AMOUNT'; payload: string }
  | { type: 'SET_TOKEN_B_ADDRESS'; payload: string }
  | { type: 'SET_TOKEN_B_METADATA'; payload: TokenMetadata | null }
  | { type: 'SET_TOKEN_B_BALANCE'; payload: TokenBalance | null }
  | { type: 'SET_TOKEN_B_WALLET_BALANCE'; payload: TokenBalance | null }
  | { type: 'SET_TOKEN_B_AMOUNT'; payload: string }
  | { type: 'SET_CURRENT_PRICE'; payload: number }
  | { type: 'SET_PRICE_RANGE'; payload: { minPrice: number; maxPrice: number } }
  | { type: 'SET_SLIPPAGE_TOLERANCE'; payload: number }
  | { type: 'SET_POOL_STATE'; payload: 'idle' | 'loading' | 'exists' | 'not_exists' }
  | { type: 'SET_POOL_STATS'; payload: PoolStats | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_TRANSACTION_HASH'; payload: string | null }
  | { type: 'ADD_PENDING_POSITION'; payload: PendingPosition }
  | { type: 'REMOVE_PENDING_POSITION'; payload: string }
  | { type: 'CLEAR_PENDING_POSITIONS' }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  selectedDex: null,
  feeTier: 30, // Default to 0.3% fee tier
  tokenA: {
    address: '',
    metadata: null,
    balance: null,
    walletBalance: null,
    amount: ''
  },
  tokenB: {
    address: '',
    metadata: null,
    balance: null,
    walletBalance: null,
    amount: ''
  },
  currentPrice: 0,
  minPrice: 0,
  maxPrice: 0,
  slippageTolerance: 0.5, // 0.5% default
  poolState: 'idle',
  poolStats: null,
  isLoading: false,
  error: null,
  isSubmitting: false,
  transactionHash: null,
  pendingPositions: []
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SELECTED_DEX':
      return { ...state, selectedDex: action.payload, poolState: 'idle', poolStats: null };
      
    case 'SET_FEE_TIER':
      return { ...state, feeTier: action.payload, poolState: 'idle', poolStats: null };
      
    case 'SET_TOKEN_A_ADDRESS':
      return {
        ...state,
        tokenA: { ...state.tokenA, address: action.payload },
        poolState: 'idle',
        poolStats: null
      };
      
    case 'SET_TOKEN_A_METADATA':
      return {
        ...state,
        tokenA: { ...state.tokenA, metadata: action.payload }
      };
      
    case 'SET_TOKEN_A_BALANCE':
      return {
        ...state,
        tokenA: { ...state.tokenA, balance: action.payload }
      };

    case 'SET_TOKEN_A_WALLET_BALANCE':
      return {
        ...state,
        tokenA: { ...state.tokenA, walletBalance: action.payload, balance: action.payload }
      };
      
    case 'SET_TOKEN_A_AMOUNT':
      return {
        ...state,
        tokenA: { ...state.tokenA, amount: action.payload }
      };
      
    case 'SET_TOKEN_B_ADDRESS':
      return {
        ...state,
        tokenB: { ...state.tokenB, address: action.payload },
        poolState: 'idle',
        poolStats: null
      };
      
    case 'SET_TOKEN_B_METADATA':
      return {
        ...state,
        tokenB: { ...state.tokenB, metadata: action.payload }
      };
      
    case 'SET_TOKEN_B_BALANCE':
      return {
        ...state,
        tokenB: { ...state.tokenB, balance: action.payload }
      };

    case 'SET_TOKEN_B_WALLET_BALANCE':
      return {
        ...state,
        tokenB: { ...state.tokenB, walletBalance: action.payload, balance: action.payload }
      };
      
    case 'SET_TOKEN_B_AMOUNT':
      return {
        ...state,
        tokenB: { ...state.tokenB, amount: action.payload }
      };
      
    case 'SET_CURRENT_PRICE':
      return { ...state, currentPrice: action.payload };
      
    case 'SET_PRICE_RANGE':
      return {
        ...state,
        minPrice: action.payload.minPrice,
        maxPrice: action.payload.maxPrice
      };
      
    case 'SET_SLIPPAGE_TOLERANCE':
      return { ...state, slippageTolerance: action.payload };
      
    case 'SET_POOL_STATE':
      return { ...state, poolState: action.payload };
      
    case 'SET_POOL_STATS':
      return { ...state, poolStats: action.payload };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
      
    case 'SET_TRANSACTION_HASH':
      return { ...state, transactionHash: action.payload };

    case 'ADD_PENDING_POSITION': {
      const newPosition = action.payload;

      // Calculate new balances after deducting the position amounts
      const updateTokenBalance = (currentToken: typeof state.tokenA, newPosition: PendingPosition, isTokenA: boolean) => {
        const positionToken = isTokenA ? newPosition.tokenA : newPosition.tokenB;

        if (currentToken.address === positionToken.address && currentToken.balance?.balance && currentToken.metadata) {
          // Convert formatted amounts to raw balance for calculations
          const currentFormattedBalance = parseFloat(currentToken.balance.formattedBalance);
          const deductFormattedAmount = parseFloat(positionToken.amount || '0');

          if (!isNaN(currentFormattedBalance) && !isNaN(deductFormattedAmount)) {
            const newFormattedBalance = Math.max(0, currentFormattedBalance - deductFormattedAmount);

            // Convert back to raw balance
            const newRawBalance = TokenService.parseBalance(newFormattedBalance.toString(), currentToken.metadata.decimals);
            const newFormattedBalanceString = TokenService.formatBalance(newRawBalance, currentToken.metadata.decimals);

            return {
              ...currentToken,
              balance: {
                ...currentToken.balance,
                balance: newRawBalance,
                formattedBalance: newFormattedBalanceString
              }
            };
          }
        }

        return currentToken;
      };

      const updatedTokenA = updateTokenBalance(state.tokenA, newPosition, true);
      const updatedTokenB = updateTokenBalance(state.tokenB, newPosition, false);

      return {
        ...state,
        tokenA: updatedTokenA,
        tokenB: updatedTokenB,
        pendingPositions: [...state.pendingPositions, action.payload]
      };
    }

    case 'REMOVE_PENDING_POSITION': {
      const positionToRemove = state.pendingPositions.find(pos => pos.id === action.payload);

      if (!positionToRemove) {
        return state;
      }

      // Restore balances by adding back the removed position amounts
      const restoreTokenBalance = (currentToken: typeof state.tokenA, removedPosition: PendingPosition, isTokenA: boolean) => {
        const positionToken = isTokenA ? removedPosition.tokenA : removedPosition.tokenB;

        if (currentToken.address === positionToken.address && currentToken.balance?.balance && currentToken.metadata) {
          // Convert formatted amounts to raw balance for calculations
          const currentFormattedBalance = parseFloat(currentToken.balance.formattedBalance);
          const restoreFormattedAmount = parseFloat(positionToken.amount || '0');

          if (!isNaN(currentFormattedBalance) && !isNaN(restoreFormattedAmount)) {
            const newFormattedBalance = currentFormattedBalance + restoreFormattedAmount;

            // Convert back to raw balance
            const newRawBalance = TokenService.parseBalance(newFormattedBalance.toString(), currentToken.metadata.decimals);
            const newFormattedBalanceString = TokenService.formatBalance(newRawBalance, currentToken.metadata.decimals);

            return {
              ...currentToken,
              balance: {
                ...currentToken.balance,
                balance: newRawBalance,
                formattedBalance: newFormattedBalanceString
              }
            };
          }
        }

        return currentToken;
      };

      const updatedTokenA = restoreTokenBalance(state.tokenA, positionToRemove, true);
      const updatedTokenB = restoreTokenBalance(state.tokenB, positionToRemove, false);

      return {
        ...state,
        tokenA: updatedTokenA,
        tokenB: updatedTokenB,
        pendingPositions: state.pendingPositions.filter(pos => pos.id !== action.payload)
      };
    }

    case 'CLEAR_PENDING_POSITIONS': {
      // Restore all balances to original wallet balances
      const restoreTokenA = state.tokenA.walletBalance
        ? { ...state.tokenA, balance: state.tokenA.walletBalance }
        : state.tokenA;

      const restoreTokenB = state.tokenB.walletBalance
        ? { ...state.tokenB, balance: state.tokenB.walletBalance }
        : state.tokenB;

      return {
        ...state,
        tokenA: restoreTokenA,
        tokenB: restoreTokenB,
        pendingPositions: []
      };
    }

    case 'RESET_STATE':
      return initialState;
      
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const hasSetDefaultRange = useRef(false);
  const { currentNetwork, networkInfo } = useAptosClient();

  // Update token configuration when network changes
  useEffect(() => {
    updateTokensForNetwork(currentNetwork.toString().toLowerCase());
    console.log(`🏷️  Updated popular tokens for ${networkInfo.name} network`);
  }, [currentNetwork, networkInfo.name]);

  // Use the reliable price fetching hook
  const { relativePrice, isLoading: isPriceLoading, error: priceError } = useRelativePrice(
    state.tokenA.address || undefined,
    state.tokenB.address || undefined
  );

  // Update current price when relative price changes
  useEffect(() => {
    if (relativePrice && relativePrice > 0) {
      dispatch({ type: 'SET_CURRENT_PRICE', payload: relativePrice });
      
      // Set default price range (±15% around current price) only once
      if (!hasSetDefaultRange.current) {
        const defaultRange = relativePrice * 0.15;
        dispatch({ 
          type: 'SET_PRICE_RANGE', 
          payload: { 
            minPrice: relativePrice - defaultRange,
            maxPrice: relativePrice + defaultRange
          }
        });
        hasSetDefaultRange.current = true;
      }
    }
  }, [relativePrice]);

  // Reset default range flag when token addresses change
  useEffect(() => {
    hasSetDefaultRange.current = false;
  }, [state.tokenA.address, state.tokenB.address]);

  // Update error state from price fetching
  useEffect(() => {
    if (priceError) {
      dispatch({ type: 'SET_ERROR', payload: priceError });
    }
  }, [priceError]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Convenience hooks for specific actions
export function useAppActions() {
  const { dispatch } = useAppContext();

  return {
    setSelectedDex: (dexId: string) => dispatch({ type: 'SET_SELECTED_DEX', payload: dexId }),
    setFeeTier: (feeTier: number) => dispatch({ type: 'SET_FEE_TIER', payload: feeTier }),
    
    setTokenAAddress: (address: string) => 
      dispatch({ type: 'SET_TOKEN_A_ADDRESS', payload: address }),
    setTokenAMetadata: (metadata: TokenMetadata | null) => 
      dispatch({ type: 'SET_TOKEN_A_METADATA', payload: metadata }),
    setTokenABalance: (balance: TokenBalance | null) =>
      dispatch({ type: 'SET_TOKEN_A_BALANCE', payload: balance }),
    setTokenAWalletBalance: (balance: TokenBalance | null) =>
      dispatch({ type: 'SET_TOKEN_A_WALLET_BALANCE', payload: balance }),
    setTokenAAmount: (amount: string) => 
      dispatch({ type: 'SET_TOKEN_A_AMOUNT', payload: amount }),
    
    setTokenBAddress: (address: string) => 
      dispatch({ type: 'SET_TOKEN_B_ADDRESS', payload: address }),
    setTokenBMetadata: (metadata: TokenMetadata | null) => 
      dispatch({ type: 'SET_TOKEN_B_METADATA', payload: metadata }),
    setTokenBBalance: (balance: TokenBalance | null) =>
      dispatch({ type: 'SET_TOKEN_B_BALANCE', payload: balance }),
    setTokenBWalletBalance: (balance: TokenBalance | null) =>
      dispatch({ type: 'SET_TOKEN_B_WALLET_BALANCE', payload: balance }),
    setTokenBAmount: (amount: string) => 
      dispatch({ type: 'SET_TOKEN_B_AMOUNT', payload: amount }),
    
    setCurrentPrice: (price: number) => 
      dispatch({ type: 'SET_CURRENT_PRICE', payload: price }),
    setPriceRange: (minPrice: number, maxPrice: number) => 
      dispatch({ type: 'SET_PRICE_RANGE', payload: { minPrice, maxPrice } }),
    setSlippageTolerance: (tolerance: number) => 
      dispatch({ type: 'SET_SLIPPAGE_TOLERANCE', payload: tolerance }),
    
    setPoolState: (state: 'idle' | 'loading' | 'exists' | 'not_exists') => 
      dispatch({ type: 'SET_POOL_STATE', payload: state }),
    setPoolStats: (stats: PoolStats | null) => 
      dispatch({ type: 'SET_POOL_STATS', payload: stats }),
    
    setLoading: (loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }),
    
    setSubmitting: (submitting: boolean) => 
      dispatch({ type: 'SET_SUBMITTING', payload: submitting }),
    setTransactionHash: (hash: string | null) =>
      dispatch({ type: 'SET_TRANSACTION_HASH', payload: hash }),

    addPendingPosition: (position: PendingPosition) =>
      dispatch({ type: 'ADD_PENDING_POSITION', payload: position }),
    removePendingPosition: (id: string) =>
      dispatch({ type: 'REMOVE_PENDING_POSITION', payload: id }),
    clearPendingPositions: () =>
      dispatch({ type: 'CLEAR_PENDING_POSITIONS' }),

    resetState: () => dispatch({ type: 'RESET_STATE' })
  };
}

// Hook to check available balances (now using actual balance which is updated in real-time)
export function useAvailableBalances() {
  const { state } = useAppContext();

  const getAvailableBalance = (tokenAddress: string) => {
    // Get the current available balance (which is already reduced by pending positions)
    const currentBalance = tokenAddress === state.tokenA.address
      ? state.tokenA.balance
      : tokenAddress === state.tokenB.address
        ? state.tokenB.balance
        : null;

    return currentBalance?.formattedBalance || '0.00';
  };

  const getAvailableBalanceRaw = (tokenAddress: string) => {
    // Get raw balance for calculations
    const currentBalance = tokenAddress === state.tokenA.address
      ? state.tokenA.balance
      : tokenAddress === state.tokenB.address
        ? state.tokenB.balance
        : null;

    return parseFloat(currentBalance?.formattedBalance || '0');
  };

  const checkSufficientBalance = (tokenAAddress: string, tokenAAmount: string, tokenBAddress: string, tokenBAmount: string) => {
    const availableTokenA = getAvailableBalanceRaw(tokenAAddress);
    const availableTokenB = getAvailableBalanceRaw(tokenBAddress);

    const requiredTokenA = parseFloat(tokenAAmount || '0');
    const requiredTokenB = parseFloat(tokenBAmount || '0');

    const hasEnoughTokenA = isNaN(requiredTokenA) || requiredTokenA <= availableTokenA;
    const hasEnoughTokenB = isNaN(requiredTokenB) || requiredTokenB <= availableTokenB;

    return {
      hasEnoughTokenA,
      hasEnoughTokenB,
      hasSufficientBalance: hasEnoughTokenA && hasEnoughTokenB,
      availableTokenA: getAvailableBalance(tokenAAddress),
      availableTokenB: getAvailableBalance(tokenBAddress)
    };
  };

  return {
    getAvailableBalance,
    checkSufficientBalance
  };
}