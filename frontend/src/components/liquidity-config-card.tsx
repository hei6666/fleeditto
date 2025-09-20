'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, RefreshCw } from 'lucide-react';
import { LiquidityPosition } from '@/types';
import { PriceRangeSelector } from './price-range-selector';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface LiquidityConfigCardProps {
  position: LiquidityPosition;
  onUpdate: (position: LiquidityPosition) => void;
  onRemove: () => void;
}

export function LiquidityConfigCard({ position, onUpdate, onRemove }: LiquidityConfigCardProps) {
  const [localPosition, setLocalPosition] = useState(position);
  
  // Wallet connection
  const { account, connected } = useWallet();
  const walletAddress = account?.address?.toString();

  // Balance checking for both tokens
  const baseBalance = useWalletBalance(connected ? position.pool.token0.address : undefined);
  const quoteBalance = useWalletBalance(connected ? position.pool.token1.address : undefined);

  const updateLocalPosition = (updates: Partial<LiquidityPosition>) => {
    const newPosition = { ...localPosition, ...updates };
    setLocalPosition(newPosition);
    onUpdate(newPosition);
  };

  const formatFee = (fee: number) => {
    return (fee / 10000).toString() + '%';
  };

  return (
    <motion.div 
      className="glass p-6 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/20"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white border-2 border-gray-700">
              {position.pool.token0.symbol.charAt(0)}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-sm font-bold text-white border-2 border-gray-700">
              {position.pool.token1.symbol.charAt(0)}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {position.pool.token0.symbol}/{position.pool.token1.symbol}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Fee: {formatFee(position.pool.fee)}</span>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
        
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Amount Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {position.pool.token0.symbol} Amount
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.0"
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 pr-16 text-white placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 ease-in-out hover:bg-gray-700/50 focus:scale-[1.02]"
              value={localPosition.token0Amount}
              onChange={(e) => updateLocalPosition({ token0Amount: e.target.value })}
            />
            {connected && !baseBalance.error && parseFloat(baseBalance.balance) > 0 && (
              <button
                onClick={() => updateLocalPosition({ token0Amount: baseBalance.balance })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/50 text-xs text-teal-300 rounded transition-all duration-200"
              >
                MAX
              </button>
            )}
          </div>
          {connected && (
            <div className="mt-1 flex items-center space-x-2 text-xs">
              {baseBalance.isLoading && (
                <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
              )}
              <span className="text-gray-400">Balance:</span>
              <span className="text-white font-medium">
                {baseBalance.error ? 'Error' : baseBalance.balance}
              </span>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {position.pool.token1.symbol} Amount
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.0"
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 pr-16 text-white placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 ease-in-out hover:bg-gray-700/50 focus:scale-[1.02]"
              value={localPosition.token1Amount}
              onChange={(e) => updateLocalPosition({ token1Amount: e.target.value })}
            />
            {connected && !quoteBalance.error && parseFloat(quoteBalance.balance) > 0 && (
              <button
                onClick={() => updateLocalPosition({ token1Amount: quoteBalance.balance })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/50 text-xs text-teal-300 rounded transition-all duration-200"
              >
                MAX
              </button>
            )}
          </div>
          {connected && (
            <div className="mt-1 flex items-center space-x-2 text-xs">
              {quoteBalance.isLoading && (
                <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
              )}
              <span className="text-gray-400">Balance:</span>
              <span className="text-white font-medium">
                {quoteBalance.error ? 'Error' : quoteBalance.balance}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Price Range Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-4">
          Concentrated Liquidity Price Range
        </label>
        <PriceRangeSelector
          baseTokenAddress={position.pool.token0.address}
          quoteTokenAddress={position.pool.token1.address}
          priceRange={localPosition.priceRange}
          onRangeChange={(priceRange) => updateLocalPosition({ priceRange })}
        />
      </div>
    </motion.div>
  );
}