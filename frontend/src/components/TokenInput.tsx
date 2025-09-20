"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { TokenService, TokenBalance, TokenMetadata } from '../lib/services/token';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { useAptosClient } from '../hooks/useAptosClient';
import { Button } from './ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { debounce } from 'lodash-es';
import { TokenBadges } from './TokenBadges';
import { popularTokens } from '../config/tokens';
import { findTokenByAddress } from '../config/tokens';
interface TokenInputProps {
  label: string;
  placeholder: string;
  value: string;
  tokenAddress?: string;
  onAddressChange?: (address: string) => void;
  onChange: (value: string) => void;
  onTokenChange?: (token: TokenMetadata | null) => void;
  onBalanceChange?: (balance: TokenBalance | null) => void;
  readOnly?: boolean;
  // New props for smart liquidity calculation
  isCalculating?: boolean;
  isPrimaryInput?: boolean; // true if this is the input field user is actively typing in
  onPrimaryInputChange?: (isPrimary: boolean) => void; // callback when user starts typing
  // Available balance (after pending positions)
  availableBalance?: string;
  // Only show address input, hide amount input
  addressOnly?: boolean;
  // Only show amount input and token info, hide address input
  amountOnly?: boolean;
}

export function TokenInput({
  label,
  placeholder,
  value,
  tokenAddress = '',
  onAddressChange,
  onChange,
  onTokenChange,
  onBalanceChange,
  readOnly = false,
  isCalculating = false,
  isPrimaryInput = false,
  onPrimaryInputChange,
  availableBalance,
  addressOnly = false,
  amountOnly = false
}: TokenInputProps) {
  const { account, connected } = useWallet();
  const { aptos, networkInfo } = useAptosClient(); // Get dynamic Aptos client
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [token_url,set_token_url]=useState("");
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenInfo = tokenMetadata?.address ? findTokenByAddress(tokenMetadata.address) : null;
  // Stable fetch function to prevent infinite loops
  const fetchTokenMetadata = useCallback(async (address: string) => {
    if (!TokenService.isValidAddress(address)) {
      setError('Invalid token address format');
      setTokenMetadata(null);
      setTokenBalance(null);
      onTokenChange?.(null);
      onBalanceChange?.(null);
      return;
    }

    setIsLoadingMetadata(true);
    setError(null);

    try {
      const metadata = await TokenService.getTokenMetadata(address, aptos);
      setTokenMetadata(metadata);
      onTokenChange?.(metadata);

      // Also fetch balance if wallet is connected
      if (connected && account?.address) {
        setIsLoadingBalance(true);
        const balance = await TokenService.getTokenBalance(account.address.toString(), address, aptos);
        setTokenBalance(balance);
        onBalanceChange?.(balance);
        setIsLoadingBalance(false);
      }
    } catch (err) {
      console.error('Error fetching token metadata:', err);
      setError('Failed to fetch token information');
      setTokenMetadata(null);
      setTokenBalance(null);
      onTokenChange?.(null);
      onBalanceChange?.(null);
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [connected, account?.address, aptos]); // Remove callback props from dependencies

  // Debounced function to fetch token metadata
  const debouncedFetchMetadata = useCallback(
    debounce((address: string) => {
      fetchTokenMetadata(address);
    }, 500),
    [fetchTokenMetadata]
  );

  // Handle token address input
  const handleAddressChange = (newAddress: string) => {
    onAddressChange?.(newAddress);
    
    if (newAddress.trim() === '') {
      setTokenMetadata(null);
      setTokenBalance(null);
      setError(null);
      onTokenChange?.(null);
      onBalanceChange?.(null);
      return;
    }

    debouncedFetchMetadata(newAddress.trim());
  };

  // Handle token badge selection
  const handleTokenBadgeSelect = (address: string) => {
    handleAddressChange(address);
  };

  // Handle amount input change
  const handleAmountChange = (newValue: string) => {
    // Mark this as the primary input when user starts typing
    if (onPrimaryInputChange && !isPrimaryInput) {
      onPrimaryInputChange(true);
    }
    onChange(newValue);
  };

  // Handle max button click
  const handleMaxClick = () => {
    const maxAmount = availableBalance || tokenBalance?.formattedBalance;
    if (maxAmount && maxAmount !== '0' && maxAmount !== '0.00') {
      // Mark this as the primary input when max is clicked
      if (onPrimaryInputChange && !isPrimaryInput) {
        onPrimaryInputChange(true);
      }
      onChange(maxAmount);
    }
  };

  // Use the new reliable balance hook  
  const { balance: rawBalance, isLoading: isBalanceLoading, error: balanceError } = useWalletBalance(
    tokenAddress && TokenService.isValidAddress(tokenAddress) ? tokenAddress : undefined
  );

  // Convert raw balance to TokenBalance format when available
  useEffect(() => {
    if (tokenMetadata && rawBalance && rawBalance !== '0') {
      const formattedBalance = TokenService.formatBalance(rawBalance, tokenMetadata.decimals);
      const balance: TokenBalance = {
        address: tokenAddress,
        balance: rawBalance,
        formattedBalance,
        decimals: tokenMetadata.decimals
      };
      setTokenBalance(balance);
      onBalanceChange?.(balance);
    } else {
      setTokenBalance(null);
      onBalanceChange?.(null);
    }
  }, [rawBalance, tokenMetadata, tokenAddress]); // Remove onBalanceChange from dependencies

  // In amountOnly mode, fetch metadata when tokenAddress is provided externally
  useEffect(() => {
    if (amountOnly && tokenAddress && TokenService.isValidAddress(tokenAddress)) {
      fetchTokenMetadata(tokenAddress);
    }
  }, [amountOnly, tokenAddress, fetchTokenMetadata]);

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Token Address Input - hide in amountOnly mode */}
      {!amountOnly && (
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2 font-inter">
            {label} Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 backdrop-filter backdrop-blur-sm focus:outline-none focus:border-teal-400/50 focus:bg-white/10 transition-all duration-300 font-mono text-sm"
            />
            {isLoadingMetadata && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Popular Token Badges */}
          <TokenBadges
            tokens={popularTokens}
            onSelectToken={handleTokenBadgeSelect}
            selectedAddress={tokenAddress}
            label="Quick select:"
          />
        </div>
      )}

      {/* Token Metadata Display */}
      {tokenMetadata && (
        <motion.div
          className="glass p-4 rounded-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              {tokenInfo?.logoUri ? (
                  <img
                    src={tokenInfo.logoUri}
                    alt={tokenMetadata .symbol}
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    onError={(e) => {
                      // Fallback to generic icon if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
              <h4 className="font-semibold text-white font-inter">{tokenMetadata.symbol}</h4>
              <p className="text-sm text-white/60">{tokenMetadata.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Decimals: {tokenMetadata.decimals}</p>
            </div>
          </div>

          {/* Balance Display */}
          {connected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Available Balance:</span>
                  <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-400 rounded-full border border-teal-500/30">
                    {networkInfo.name}
                  </span>
                </div>
                {isBalanceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                ) : (
                  <span className="text-sm font-mono text-white">
                    {availableBalance ? `${availableBalance} ${tokenMetadata.symbol}` : `${tokenBalance?.formattedBalance || '0.00'} ${tokenMetadata.symbol}`}
                  </span>
                )}
              </div>

              {/* Amount Input - only show if not addressOnly */}
              {!addressOnly && (
                !readOnly ? (
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder={isCalculating && !isPrimaryInput ? "Calculating..." : "0.00"}
                        step="any"
                        min="0"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 backdrop-filter backdrop-blur-sm focus:outline-none focus:border-teal-400/50 hover:bg-white/10 transition-all duration-300 font-mono text-sm"
                      />
                      {/* Show loading spinner for non-primary input when calculating */}
                      {!isPrimaryInput && isCalculating && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                        </div>
                      )}
                      {/* Show input type indicator */}
                      <div className={`absolute -top-2 right-2 px-2 py-0.5 text-xs rounded-full border ${
                        isPrimaryInput
                          ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                          : 'bg-gray-700/50 text-gray-400 border-gray-600/30'
                      }`}>
                        {isPrimaryInput ? 'Input' : 'Auto'}
                      </div>
                    </div>
                    <Button
                      onClick={handleMaxClick}
                      disabled={(() => {
                        const maxAmount = availableBalance || tokenBalance?.formattedBalance;
                        return !maxAmount || maxAmount === '0' || maxAmount === '0.00';
                      })()}
                      size="sm"
                      variant="outline"
                      className="px-4 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-teal-400/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Max
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <span className="text-2xl font-mono text-white font-semibold">
                      {value && value !== '0' ? value : '—'}
                    </span>
                    {tokenMetadata && (
                      <p className="text-sm text-white/60 mt-1">{tokenMetadata.symbol}</p>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-white/40">Connect wallet to view balance</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}