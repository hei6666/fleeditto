'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { LiquidityPosition } from '@/types';
import { OFFICIAL_APTOS_TOKENS, isValidAptosAddress, getTokenSymbolFromAddress } from '@/hooks/useTokenPrices';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface PoolSelectionProps {
  onPoolAdd: (position: LiquidityPosition) => void;
}

export function PoolSelection({ onPoolAdd }: PoolSelectionProps) {
  const [baseTokenAddress, setBaseTokenAddress] = useState('');
  const [quoteTokenAddress, setQuoteTokenAddress] = useState('');
  const [selectedFee, setSelectedFee] = useState(3000); // Default 0.3% fee

  // Wallet connection
  const { account, connected } = useWallet();
  const walletAddress = account?.address?.toString();

  // Validation states
  const isBaseTokenValid = baseTokenAddress ? isValidAptosAddress(baseTokenAddress) : false;
  const isQuoteTokenValid = quoteTokenAddress ? isValidAptosAddress(quoteTokenAddress) : false;
  const canCreatePosition = isBaseTokenValid && isQuoteTokenValid && baseTokenAddress !== quoteTokenAddress;

  // Balance checking
  const baseBalance = useWalletBalance(connected && isBaseTokenValid ? baseTokenAddress : undefined);
  const quoteBalance = useWalletBalance(connected && isQuoteTokenValid ? quoteTokenAddress : undefined);

  // Quick token insertion helpers
  const insertQuickToken = (field: 'base' | 'quote', address: string) => {
    if (field === 'base') {
      setBaseTokenAddress(address);
    } else {
      setQuoteTokenAddress(address);
    }
  };

  const handleCreatePosition = () => {
    if (!canCreatePosition) return;

    // Create a mock pool structure for the new position
    const pool = {
      id: `custom_${baseTokenAddress.slice(0, 10)}_${quoteTokenAddress.slice(0, 10)}_${selectedFee}`,
      token0: {
        address: baseTokenAddress,
        symbol: getTokenSymbolFromAddress(baseTokenAddress),
        name: getTokenSymbolFromAddress(baseTokenAddress),
        decimals: 8 // Default, could be fetched from on-chain data
      },
      token1: {
        address: quoteTokenAddress,
        symbol: getTokenSymbolFromAddress(quoteTokenAddress),
        name: getTokenSymbolFromAddress(quoteTokenAddress),
        decimals: 8 // Default, could be fetched from on-chain data
      },
      fee: selectedFee,
      liquidity: '0', // Will be populated when position is created
      sqrtPriceX96: '0',
      tick: 0,
      protocol: 'custom' as const
    };

    const newPosition: LiquidityPosition = {
      poolId: pool.id,
      pool,
      token0Amount: '',
      token1Amount: '',
      priceRange: { min: 0, max: 0 }
    };

    onPoolAdd(newPosition);
    
    // Reset form
    setBaseTokenAddress('');
    setQuoteTokenAddress('');
    setSelectedFee(3000);
  };

  return (
    <motion.div 
      className="glass p-6 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6">Create New Liquidity Position</h2>
      
      <div className="space-y-6">
        {/* Base Token Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Base Token FA Address (e.g., your project's token)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="APT"
              className={`w-full bg-gray-800/50 border rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out hover:bg-gray-700/50 focus:scale-[1.02] ${
                baseTokenAddress && !isBaseTokenValid 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                  : baseTokenAddress && isBaseTokenValid
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                    : 'border-gray-600 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
              value={baseTokenAddress}
              onChange={(e) => setBaseTokenAddress(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {baseTokenAddress && (
                isBaseTokenValid ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )
              )}
            </div>
          </div>
          
          {/* Balance Display for Base Token */}
          {connected && isBaseTokenValid && (
            <div className="mt-2 p-2 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {baseBalance.isLoading && (
                    <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                  )}
                  <span className="text-xs text-gray-400">Balance:</span>
                  <span className="text-xs text-white font-medium">
                    {baseBalance.error ? 'Error' : baseBalance.balance}
                  </span>
                </div>
                {!baseBalance.error && parseFloat(baseBalance.balance) > 0 && (
                  <button
                    onClick={() => {/* TODO: Set max amount */}}
                    className="px-2 py-1 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/50 text-xs text-teal-300 rounded transition-all duration-200"
                  >
                    MAX
                  </button>
                )}
              </div>
              {baseBalance.error && (
                <div className="text-xs text-red-400 mt-1">Could not fetch balance</div>
              )}
            </div>
          )}
          
          {/* Quick Token Buttons for Base */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-gray-500">Quick select:</span>
            {Object.entries(OFFICIAL_APTOS_TOKENS).map(([symbol, address]) => (
              <button
                key={symbol}
                onClick={() => insertQuickToken('base', address)}
                className="px-2 py-1 bg-gray-700/50 hover:bg-teal-600/20 hover:border-teal-500/50 border border-gray-600/50 text-xs text-gray-300 hover:text-teal-300 rounded transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Quote Token Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Quote Token FA Address (e.g., APT or USDC)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="USDC"
              className={`w-full bg-gray-800/50 border rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out hover:bg-gray-700/50 focus:scale-[1.02] ${
                quoteTokenAddress && !isQuoteTokenValid 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                  : quoteTokenAddress && isQuoteTokenValid
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                    : 'border-gray-600 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
              value={quoteTokenAddress}
              onChange={(e) => setQuoteTokenAddress(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {quoteTokenAddress && (
                isQuoteTokenValid ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )
              )}
            </div>
          </div>
          
          {/* Balance Display for Quote Token */}
          {connected && isQuoteTokenValid && (
            <div className="mt-2 p-2 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {quoteBalance.isLoading && (
                    <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                  )}
                  <span className="text-xs text-gray-400">Balance:</span>
                  <span className="text-xs text-white font-medium">
                    {quoteBalance.error ? 'Error' : quoteBalance.balance}
                  </span>
                </div>
                {!quoteBalance.error && parseFloat(quoteBalance.balance) > 0 && (
                  <button
                    onClick={() => {/* TODO: Set max amount */}}
                    className="px-2 py-1 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/50 text-xs text-teal-300 rounded transition-all duration-200"
                  >
                    MAX
                  </button>
                )}
              </div>
              {quoteBalance.error && (
                <div className="text-xs text-red-400 mt-1">Could not fetch balance</div>
              )}
            </div>
          )}
          
          {/* Quick Token Buttons for Quote */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-gray-500">Quick select:</span>
            {Object.entries(OFFICIAL_APTOS_TOKENS).map(([symbol, address]) => (
              <button
                key={symbol}
                onClick={() => insertQuickToken('quote', address)}
                className="px-2 py-1 bg-gray-700/50 hover:bg-teal-600/20 hover:border-teal-500/50 border border-gray-600/50 text-xs text-gray-300 hover:text-teal-300 rounded transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Fee Tier Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fee Tier
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 500, label: '0.05%', desc: 'Stablecoins' },
              { value: 3000, label: '0.3%', desc: 'Most tokens' },
              { value: 10000, label: '1%', desc: 'Volatile' },
              { value: 30000, label: '3%', desc: 'Very volatile' },
            ].map((fee) => (
              <button
                key={fee.value}
                onClick={() => setSelectedFee(fee.value)}
                className={`p-3 rounded-lg border text-center transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 ${
                  selectedFee === fee.value
                    ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                    : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-teal-500/50 hover:bg-teal-500/10'
                }`}
              >
                <div className="font-medium">{fee.label}</div>
                <div className="text-xs text-gray-400">{fee.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Create Position Button */}
        <button
          onClick={handleCreatePosition}
          disabled={!canCreatePosition}
          className={`w-full py-4 px-6 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-300 ease-in-out ${
            canCreatePosition
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Create Liquidity Position</span>
        </button>

        {/* Validation Messages */}
        {baseTokenAddress && !isBaseTokenValid && (
          <div className="text-sm text-red-400">
            Invalid base token address format
          </div>
        )}
        {quoteTokenAddress && !isQuoteTokenValid && (
          <div className="text-sm text-red-400">
            Invalid quote token address format
          </div>
        )}
        {baseTokenAddress && quoteTokenAddress && baseTokenAddress === quoteTokenAddress && (
          <div className="text-sm text-red-400">
            Base and quote tokens cannot be the same
          </div>
        )}
      </div>
    </motion.div>
  );
}