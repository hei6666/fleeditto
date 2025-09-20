"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext, useAppActions, PendingPosition } from '../contexts/AppContext';
import { X, Plus, DollarSign, Shield, Zap, Package } from 'lucide-react';
import { Button } from './ui/button';
import {getFeeTierPercentageFromIndex} from "@/components/FeeTierSelector";
import { useMultiTokenPrices } from '../hooks/useMultiTokenPrices';
import { useMemo } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { priceToTick } from "@hyperionxyz/sdk";
export function PendingPositions() {
  const {account,signAndSubmitTransaction}=useWallet();
  const { state } = useAppContext();
  const actions = useAppActions();

  // Extract all unique tokens from pending positions for price fetching
  const tokensForPricing = useMemo(() => {
    const tokens: Array<{ symbol: string; address: string }> = [];

    state.pendingPositions.forEach(position => {
      tokens.push({
        symbol: position.tokenA.metadata.symbol,
        address: position.tokenA.address
      });
      tokens.push({
        symbol: position.tokenB.metadata.symbol,
        address: position.tokenB.address
      });
    });

    return tokens;
  }, [state.pendingPositions]);

  // Fetch prices for all tokens efficiently
  const { priceMap, isLoading: isPricesLoading } = useMultiTokenPrices(tokensForPricing);

  const handleRemovePosition = (id: string) => {
    actions.removePendingPosition(id);
  };

  const handleClearAll = () => {
    actions.clearPendingPositions();
  };

  const handleBatchSubmit = async () => {
    if (state.pendingPositions.length === 0) return;

    actions.setSubmitting(true);
    actions.setError(null);

    try {
      let current_price_input: number[] = [];
      let tick_upper: number[] = [];
      let tick_lower: number[] = [];
      let fee_tier: number[] = [];
      let token_a: string[] = [];
      let token_b: string[] = [];
      let amount_a: number[] = [];
      let amount_b: number[] = [];

      switch(state.selectedDex) {
        case "hyperion": {
          // Fixed: use i < length instead of just length
          for(let i = 0; i < state.pendingPositions.length; i++) {
            const position = state.pendingPositions[i];
            let ratio =1;
            if(position.tokenA.metadata.decimals > position.tokenB.metadata.decimals){
              ratio =  Math.pow(10, position.tokenA.metadata.decimals - position.tokenB.metadata.decimals);
            }else{ 
              ratio =  Math.pow(10, position.tokenB.metadata.decimals - position.tokenA.metadata.decimals);
            }
            console.log("current Pending position" , position.maxPrice,position.minPrice, position.currentPrice)
            // Convert prices to ticks using SDK
            const tickCurrent = priceToTick({
              price: position.currentPrice,
              feeTierIndex: position.feeTier,
              decimalsRatio: ratio // Assuming 1:1 decimal ratio, may need adjustment
            });
            const tickUpper = priceToTick({
              price: position.maxPrice,
              feeTierIndex: position.feeTier,
              decimalsRatio: ratio // Assuming 1:1 decimal ratio, may need adjustment
            });
            const tickLower = priceToTick({
              price: position.minPrice,
              feeTierIndex: position.feeTier,
              decimalsRatio: ratio // Assuming 1:1 decimal ratio, may need adjustment
            });
            
          // console.log("Pending position" , upperTick,lowerTick,tickCurrent_input)
            // Handle BigNumber/null return from priceToTick
            let upperTick = tickUpper ? Number(tickUpper) : 0;
            let lowerTick = tickLower ? Number(tickLower) : 0;
            let tickCurrent_input = tickCurrent ? Number(tickCurrent) : 0;
            console.log("Pending position" , upperTick,lowerTick,tickCurrent_input)

            // If tick is negative, add 2^32 to get correct tick value
            if (upperTick < 0) {
              upperTick += Math.pow(2, 32);
            }
            if (lowerTick < 0) {
              lowerTick += Math.pow(2, 32);
            }
            if (tickCurrent_input < 0) {
              tickCurrent_input += Math.pow(2, 32);
            }
            current_price_input.push(tickCurrent_input);
            tick_upper.push(upperTick);
            tick_lower.push(lowerTick);
            fee_tier.push(position.feeTier);
            token_a.push(position.tokenA.address);
            token_b.push(position.tokenB.address);

            // Convert formatted amounts to proper numbers
            amount_a.push(Number((parseFloat(position.tokenA.amount) * Math.pow(10,Number(state.tokenA.metadata?.decimals))).toFixed(0)));
            amount_b.push(Number((parseFloat(position.tokenB.amount) * Math.pow(10,Number(state.tokenB.metadata?.decimals))).toFixed(0)));
          }

          console.log('Batch transaction data:', {
            token_a,
            token_b,
            fee_tier,
            tick_lower,
            tick_upper,
            current_price_input,
            amount_a,
            amount_b
          });

          if (!account?.address) {
            throw new Error('Wallet not connected');
          }

          const txn = await signAndSubmitTransaction({
            sender: account.address,
            data: {
              function: "0x3a911a96b4d6736392120b4af910db1aeda07c4e0b19e9059e1aedb35b4fc10a::batch::batch_hyperion",
              functionArguments: [token_a, token_b, fee_tier, tick_lower, tick_upper, current_price_input, amount_a, amount_b]
            }
          });
          console.log('Transaction submitted:', txn);

          // Set transaction hash if available
          if (txn.hash) {
            actions.setTransactionHash(txn.hash);
          }

          // Clear pending positions on success
          actions.clearPendingPositions();
          actions.setSubmitting(false);

          break;
        }
        default:
          throw new Error(`Unsupported DEX: ${state.selectedDex}`);
      }

    } catch (error) {
      console.error('Batch transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      actions.setError(`Batch transaction failed: ${errorMessage}`);
      actions.setSubmitting(false);
    }
  };

  const formatTokenAmount = (amount: string, symbol: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    return `${num.toFixed(4)} ${symbol}`;
  };

  const formatPrice = (price: number) => {
    return price.toFixed(6);
  };

  const getPositionValue = (position: PendingPosition) => {
    let positionValue = 0;

    // Get prices for both tokens
    const tokenAPrice = priceMap.get(position.tokenA.metadata.symbol);
    const tokenBPrice = priceMap.get(position.tokenB.metadata.symbol);

    // Calculate value for token A
    if (tokenAPrice?.priceUsd && position.tokenA.amount) {
      const tokenAAmount = parseFloat(position.tokenA.amount);
      if (!isNaN(tokenAAmount)) {
        positionValue += tokenAAmount * tokenAPrice.priceUsd;
      }
    }

    // Calculate value for token B
    if (tokenBPrice?.priceUsd && position.tokenB.amount) {
      const tokenBAmount = parseFloat(position.tokenB.amount);
      if (!isNaN(tokenBAmount)) {
        positionValue += tokenBAmount * tokenBPrice.priceUsd;
      }
    }

    return positionValue;
  };

  const getTotalValue = () => {
    return state.pendingPositions.reduce((total, position) => {
      return total + getPositionValue(position);
    }, 0);
  };

  const getWeightedAverageAPR = () => {
    let totalWeightedAPR = 0;
    let totalValue = 0;

    state.pendingPositions.forEach(position => {
      const positionValue = getPositionValue(position);
      const positionAPR = position.aprData?.totalAPR || 0;

      if (positionValue > 0 && positionAPR > 0) {
        totalWeightedAPR += positionValue * positionAPR;
        totalValue += positionValue;
      }
    });

    return totalValue > 0 ? totalWeightedAPR / totalValue : 0;
  };

  const getEstimatedAnnualIncome = () => {
    const totalValue = getTotalValue();
    const avgAPR = getWeightedAverageAPR();
    return (totalValue * avgAPR) / 100;
  };

  return (
    <motion.div
      className="glass glass-hover p-6 h-fit sticky top-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pending Positions</h3>
            <p className="text-sm text-white/60">
              {state.pendingPositions.length} position{state.pendingPositions.length !== 1 ? 's' : ''} ready
            </p>
          </div>
        </div>

        {state.pendingPositions.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* MEV Protection Badge */}
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-6">
        <Shield className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-400 font-medium">MEV Protected Batch Execution</span>
      </div>

      {/* Positions List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {state.pendingPositions.map((position, index) => (
            <motion.div
              key={position.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {/* Position Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-1 rounded-full">
                    {position.dex.toUpperCase()}
                  </span>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                    {getFeeTierPercentageFromIndex(position.feeTier)}%
                  </span>
                
                </div>
                <button
                  onClick={() => handleRemovePosition(position.id)}
                  className="w-6 h-6 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>

              {/* Token Pair */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{position.tokenA.metadata.symbol}</span>
                  <span className="text-white font-mono">
                    {formatTokenAmount(position.tokenA.amount, position.tokenA.metadata.symbol)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{position.tokenB.metadata.symbol}</span>
                  <span className="text-white font-mono">
                    {formatTokenAmount(position.tokenB.amount, position.tokenB.metadata.symbol)}
                  </span>
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Price Range</span>
                  <span className="text-white/80">
                    {formatPrice(position.minPrice)} - {formatPrice(position.maxPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Current Price</span>
                  <span className="text-teal-400">{formatPrice(position.currentPrice)}</span>
                </div>
              </div>

              {/* APR Information */}
              {position.aprData && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Fee APR</span>
                      <span className="text-green-400 font-semibold">
                        {position.aprData.feeAPR.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Farm APR</span>
                      <span className="text-blue-400 font-semibold">
                        {position.aprData.farmAPR.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-white/60">Total APR</span>
                      <span className="text-purple-400 font-bold">
                        {position.aprData.totalAPR.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {state.pendingPositions.length === 0 && (
          <div className="text-center py-8">
            <Plus className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No pending positions</p>
            <p className="text-white/30 text-xs">Configure liquidity and add to batch</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {state.pendingPositions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Total Positions</span>
              <span className="text-white">{state.pendingPositions.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Estimated Value</span>
              <span className="text-white">
                {isPricesLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `$${getTotalValue().toLocaleString()}`
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Total APR</span>
              <span className="text-purple-400 font-semibold">
                {isPricesLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                  </span>
                ) : (
                  `${getWeightedAverageAPR().toFixed(2)}%`
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Est. Annual Income</span>
              <span className="text-green-400 font-semibold">
                {isPricesLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                  </span>
                ) : (
                  `$${getEstimatedAnnualIncome().toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Gas Optimization</span>
              <span className="text-blue-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ~{Math.round((1 - 1 / state.pendingPositions.length) * 100)}% savings
              </span>
            </div>
          </div>

          {/* Batch Submit Button */}
          <Button
            onClick={handleBatchSubmit}
            disabled={state.isSubmitting}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            {state.isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Executing Batch...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Execute Batch ({state.pendingPositions.length})</span>
              </div>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
}