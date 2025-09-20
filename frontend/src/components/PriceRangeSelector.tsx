"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import {priceToTick, tickToPrice} from "@hyperionxyz/sdk";
interface PriceRangeSelectorProps {
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  onRangeChange: (minPrice: number, maxPrice: number) => void;
  tokenASymbol?: string;
  tokenBSymbol?: string;
}

export function PriceRangeSelector({
  currentPrice,
  minPrice,
  maxPrice,
  onRangeChange,
  tokenASymbol = 'TOKEN_A',
  tokenBSymbol = 'TOKEN_B'
}: PriceRangeSelectorProps) {
  const [localMinPrice, setLocalMinPrice] = useState(minPrice.toString());
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice.toString());
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const { state } = useAppContext();

  // Helper function to get tick spacing based on fee tier
  const getTickSpacing = (feeTierIndex: number | null): number => {
    if (feeTierIndex === null || feeTierIndex === undefined) {
      return 60; // Default tick spacing
    }

    const tickSpacingVec = [1, 10, 60, 200, 20, 50];
    return tickSpacingVec[feeTierIndex] || 60;
  };

  // Special handling for ultra-stable pairs (fee tier index 0)
  const calculatePrecisePriceRange = (currentPrice: number, absoluteRange: number) => {
    return {
      minPrice: currentPrice - absoluteRange,
      maxPrice: currentPrice + absoluteRange
    };
  };

  // Helper function to calculate tick-based prices for percentage ranges
  const calculateTickBasedPrices = (currentPrice: number, percentageRange: number, feeTierIndex: number | null) => {
    // Special handling for fee tier index 0 (0.01% fee tier) - ultra stable pairs
    if (feeTierIndex === 0) {
      // For ultra-stable pairs, use absolute price differences instead of percentages
      const absoluteRangeMap = {
        0.01: 0.0001,  // ±0.0001
        0.05: 0.0002,  // ±0.0002
        0.10: 0.0005   // ±0.0005
      };

      const absoluteRange = absoluteRangeMap[percentageRange as keyof typeof absoluteRangeMap] || 0.0001;
      return calculatePrecisePriceRange(currentPrice, absoluteRange);
    }

    if (!state.tokenA.metadata || !state.tokenB.metadata) {
      // Fallback to percentage-based calculation if token metadata not available
      return {
        minPrice: currentPrice * (1 - percentageRange),
        maxPrice: currentPrice * (1 + percentageRange)
      };
    }

    try {
      const decimalsRatio = Math.pow(10, state.tokenA.metadata.decimals - state.tokenB.metadata.decimals);
      const tickSpacing = getTickSpacing(feeTierIndex);

      // Convert current price to tick
      const currentTickResult = priceToTick({
        price: currentPrice.toString(),
        feeTierIndex: feeTierIndex || 2,
        decimalsRatio: decimalsRatio
      });

      if (!currentTickResult) {
        throw new Error('Failed to convert price to tick');
      }

      const currentTick = Number(currentTickResult);

      // Calculate approximate tick range for the desired percentage
      // For a rough estimate, 1% price change ≈ 100 ticks (this varies)
      const ticksPerPercent = 100;
      const desiredTickRange = Math.round(percentageRange * ticksPerPercent * 100);

      // Round to tick spacing multiples
      const tickRange = Math.max(tickSpacing, Math.round(desiredTickRange / tickSpacing) * tickSpacing);

      // Calculate min and max ticks
      const minTick = currentTick - tickRange;
      const maxTick = currentTick + tickRange;

      // Convert back to prices
      const minPriceResult = tickToPrice({
        tick: minTick,
        decimalsRatio: decimalsRatio
      });

      const maxPriceResult = tickToPrice({
        tick: maxTick,
        decimalsRatio: decimalsRatio
      });

      return {
        minPrice: Number(minPriceResult),
        maxPrice: Number(maxPriceResult)
      };

    } catch (error) {
      console.warn('Failed to calculate tick-based prices, falling back to percentage-based:', error);
      // Fallback to percentage-based calculation
      return {
        minPrice: currentPrice * (1 - percentageRange),
        maxPrice: currentPrice * (1 + percentageRange)
      };
    }
  };

  // Update local state when props change
  useEffect(() => {
    setLocalMinPrice(minPrice.toString());
    setLocalMaxPrice(maxPrice.toString());
  }, [minPrice, maxPrice]);

  // Preset ranges - using smaller values for tick-based calculations
  const presets = [
    { id: 'tight', name: 'Tight', range: 0.01, icon: Target }, // ±1%
    { id: 'medium', name: 'Medium', range: 0.05, icon: TrendingUp }, // ±5%
    { id: 'wide', name: 'Wide', range: 0.10, icon: TrendingDown }, // ±10%
  ];

  // Get appropriate range multiplier based on fee tier for presets
  const getFeeTierRangeMultiplier = (feeTierIndex: number | null): number => {
    if (feeTierIndex === null || feeTierIndex === undefined) {
      return 1.0; // Default multiplier
    }

    // For ultra-stable pairs (0.01% fee), use much tighter ranges
    // For volatile pairs, use standard ranges
    const feeRangeMultipliers: { [key: number]: number } = {
      0: 0.01,    // 0.01% fee tier - Ultra stable, very tight ranges (1% instead of 5%)
      1: 0.05,    // 0.05% fee tier - Stable, tight ranges (5% instead of 5%)
      2: 0.2,     // 0.1% fee tier - Blue chip, moderate ranges
      3: 1.0,     // 1.0% fee tier - Volatile, standard ranges
      4: 0.5,     // 0.25% fee tier - Standard, slightly tighter
      5: 0.8      // 0.3% fee tier - Most pairs, moderate
    };

    return feeRangeMultipliers[feeTierIndex] || 1.0;
  };

  // Handle preset selection
  const handlePresetSelect = (preset: typeof presets[0]) => {
    let { minPrice: newMinPrice, maxPrice: newMaxPrice } = { minPrice: 0, maxPrice: 0 };

    if (state.feeTier === 0) {
      // For fee tier 0 (ultra-stable), use direct absolute price differences
      const absoluteRangeMap = {
        0.01: 0.0001,  // Tight: ±0.0001
        0.05: 0.0002,  // Medium: ±0.0002
        0.10: 0.0005   // Wide: ±0.0005
      };

      const absoluteRange = absoluteRangeMap[preset.range as keyof typeof absoluteRangeMap] || 0.0001;
      newMinPrice = currentPrice - absoluteRange;
      newMaxPrice = currentPrice + absoluteRange;
    } else {
      // For other fee tiers, use the existing logic
      const rangeMultiplier = getFeeTierRangeMultiplier(state.feeTier);
      const adjustedRange = preset.range ;

      // Use tick-based calculation for more accurate price ranges
      const result = calculateTickBasedPrices(
        currentPrice,
        adjustedRange,
        state.feeTier
      );
      newMinPrice = result.minPrice;
      newMaxPrice = result.maxPrice;
    }

    setLocalMinPrice(newMinPrice.toFixed(6));
    setLocalMaxPrice(newMaxPrice.toFixed(6));
    setSelectedPreset(preset.id);
    onRangeChange(newMinPrice, newMaxPrice);
  };

  // Handle manual input changes
  const handleMinPriceChange = useCallback((value: string) => {
    setLocalMinPrice(value);
    setSelectedPreset(null);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue < maxPrice) {
      onRangeChange(numValue, maxPrice);
    }
  }, [maxPrice, onRangeChange]);

  const handleMaxPriceChange = useCallback((value: string) => {
    setLocalMaxPrice(value);
    setSelectedPreset(null);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > minPrice) {
      onRangeChange(minPrice, numValue);
    }
  }, [minPrice, onRangeChange]);

  // Calculate price range percentage
  const priceRangePercentage = ((maxPrice - minPrice) / currentPrice) * 100;

  // Format price for display
  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return price.toExponential(3);
    } else if (price < 1) {
      return price.toFixed(6);
    } else if (price < 1000) {
      return price.toFixed(4);
    } else {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  };

  return (
    <motion.div
      className="glass glass-hover p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="w-5 h-5 text-teal-400" />
          <h2 className="text-xl font-semibold text-white font-inter">
            Configure Price Range
          </h2>
        </div>
        <p className="text-sm text-white/60">
          Set the price range for your concentrated liquidity position
        </p>
      </div>

      {/* Current Price Display */}
      <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-xl p-4 mb-6 border border-teal-500/20">
        <div className="text-center">
          <div className="text-sm text-white/60 mb-1">Current Market Price</div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatPrice(currentPrice)} {tokenBSymbol}/{tokenASymbol}
          </div>
          <div className="text-sm text-white/60 mt-1">
            Range: {priceRangePercentage.toFixed(1)}% around current price
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="mb-6">
        <div className="text-sm font-medium text-white/80 mb-3">Quick Presets</div>
        <div className="grid grid-cols-3 gap-3">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            const rangeMultiplier = getFeeTierRangeMultiplier(state.feeTier);
            const adjustedRange = preset.range * rangeMultiplier ;

            // For fee tier 0 (ultra-stable), directly map to absolute values
            const isUltraStable = state.feeTier === 0;
            let actualRange: number;
            // Direct mapping for ultra-stable pairs
              const absoluteRangeMap = {
                0.01: 0.0001,  // Tight: ±0.0001
                0.05: 0.0002,  // Medium: ±0.0002
                0.10: 0.0005   // Wide: ±0.0005
              };
            if (isUltraStable) {
              
              actualRange = absoluteRangeMap[preset.range as keyof typeof absoluteRangeMap] || 0.0001;
            } else {
              // Calculate actual tick-based range for display for other fee tiers
              const { minPrice: testMinPrice, maxPrice: testMaxPrice } = calculateTickBasedPrices(
                currentPrice,
                adjustedRange,
                state.feeTier
              );
              // actualRange = Math.abs(testMaxPrice - testMinPrice) / (2 * currentPrice);
              actualRange = absoluteRangeMap[preset.range as keyof typeof absoluteRangeMap] *10
            }

            return (
              <motion.button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  isSelected
                    ? 'border-teal-400 bg-teal-500/20 shadow-lg shadow-teal-500/25'
                    : 'border-white/20 bg-white/5 hover:border-teal-400/50 hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-teal-300' : 'text-white/70'}`} />
                  <div className="text-sm font-medium text-white">{preset.name}</div>
                  <div className="text-xs text-white/50">
                    {isUltraStable
                      ? `±${actualRange.toFixed(4)}`
                      : `±${(actualRange * 100).toFixed(actualRange < 0.01 ? 3 : 1)}%`
                    }
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Manual Price Range Inputs */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-white/80 mb-3">Manual Configuration</div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Min Price */}
          <div className="space-y-2">
            <label className="block text-sm text-white/70">
              Minimum Price ({tokenBSymbol}/{tokenASymbol})
            </label>
            <div className="relative">
              <input
                type="number"
                value={parseFloat(localMinPrice).toFixed(5)}
                onChange={(e) => handleMinPriceChange(e.target.value)}
                step="any"
                min="0"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 backdrop-filter backdrop-blur-sm focus:outline-none focus:border-teal-400/50 focus:bg-white/10 transition-all duration-300 font-mono"
                placeholder="0.000000"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-white/40">
                MIN
              </div>
            </div>
            <div className="text-xs text-white/50">
              {((parseFloat(localMinPrice) - currentPrice) / currentPrice * 100).toFixed(1)}% from current
            </div>
          </div>

          {/* Max Price */}
          <div className="space-y-2">
            <label className="block text-sm text-white/70">
              Maximum Price ({tokenBSymbol}/{tokenASymbol})
            </label>
            <div className="relative">
              <input
                type="number"
                value={parseFloat(localMaxPrice).toFixed(5)}
                onChange={(e) => handleMaxPriceChange(e.target.value)}
                step="any"
                min="0"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 backdrop-filter backdrop-blur-sm focus:outline-none focus:border-teal-400/50 focus:bg-white/10 transition-all duration-300 font-mono"
                placeholder="0.000000"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-white/40">
                MAX
              </div>
            </div>
            <div className="text-xs text-white/50">
              +{((parseFloat(localMaxPrice) - currentPrice) / currentPrice * 100).toFixed(1)}% from current
            </div>
          </div>
        </div>

        {/* Range Validation */}
        {parseFloat(localMinPrice) >= parseFloat(localMaxPrice) && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            ⚠️ Minimum price must be less than maximum price
          </div>
        )}

        {parseFloat(localMinPrice) >= currentPrice && (
          <div className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            ⚠️ Your position will be out of range (above current price)
          </div>
        )}

        {parseFloat(localMaxPrice) <= currentPrice && (
          <div className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            ⚠️ Your position will be out of range (below current price)
          </div>
        )}
      </div>

      {/* Range Summary */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl backdrop-filter backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-white/60 mb-1">Price Range Width</div>
            <div className="text-white font-mono">
              {formatPrice(parseFloat(localMaxPrice) - parseFloat(localMinPrice))} {tokenBSymbol}
            </div>
          </div>
          <div>
            <div className="text-white/60 mb-1">Capital Efficiency</div>
            <div className="text-teal-400 font-medium">
              {(100 / (priceRangePercentage / 100)).toFixed(1)}x
            </div>
          </div>
          <div>
            <div className="text-white/60 mb-1">IL Risk</div>
            <div className={`font-medium ${
              priceRangePercentage < 20 ? 'text-red-400' :
              priceRangePercentage < 50 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {priceRangePercentage < 20 ? 'High' :
               priceRangePercentage < 50 ? 'Medium' :
               'Low'}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}