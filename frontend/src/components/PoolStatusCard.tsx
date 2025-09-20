'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Plus, DollarSign, Activity, RefreshCw } from 'lucide-react';
import { PoolStats } from '../lib/dex_adapters/interface';

interface PoolStatusCardProps {
  poolState: 'idle' | 'loading' | 'exists' | 'not_exists';
  poolStats: PoolStats | null;
  tokenASymbol?: string;
  tokenBSymbol?: string;
}

export function PoolStatusCard({ poolState, poolStats, tokenASymbol, tokenBSymbol }: PoolStatusCardProps) {
  if (poolState === 'idle') {
    return null;
  }

  return (
    <motion.div
      className="glass glass-hover p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {poolState === 'loading' && (
        <div className="flex items-center justify-center space-x-3 py-8">
          <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
          <p className="text-white text-lg">Checking for existing pool...</p>
        </div>
      )}

      {poolState === 'exists' && poolStats && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Pool Found on Hyperion!</h3>
              <p className="text-sm text-green-400">
                {tokenASymbol}/{tokenBSymbol} pool already exists
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-white/60">TVL</span>
              </div>
              <p className="text-lg font-semibold text-white">
                ${poolStats.tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-white/60">Fee APR</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {poolStats.feeAPR.toFixed(2)}%
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/60">Farm APR</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {poolStats.farmAPR.toFixed(2)}%
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white/60">24h Volume</span>
              </div>
              <p className="text-lg font-semibold text-white">
                ${poolStats.dailyVolumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-300 font-medium mb-2">Adding to Existing Pool</h4>
            <p className="text-sm text-white/70">
              You will be adding liquidity to an existing Hyperion pool. Your transaction will go directly to Hyperion's smart contract.
            </p>
          </div>
        </div>
      )}

      {poolState === 'not_exists' && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Plus className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Create a New Pool</h3>
              <p className="text-sm text-orange-400">
                {tokenASymbol}/{tokenBSymbol} pool does not exist on Hyperion
              </p>
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <h4 className="text-orange-300 font-medium mb-2">Creating New Pool</h4>
            <p className="text-sm text-white/70 mb-3">
              You can be the first to create this pool! This includes selecting a price range and setting the initial price. 
              Your transaction will go to our custom smart contract to create this pool.
            </p>
            <div className="text-xs text-white/50">
              💡 As the first liquidity provider, you'll set the initial price ratio for this pair.
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}