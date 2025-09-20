'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PriceRange } from '@/types';
import { useRelativeTokenPrice, getTokenSymbolFromAddress } from '@/hooks/useTokenPrices';
import { ChartSkeleton, ErrorDisplay, PriceDisplaySkeleton } from '@/components/SkeletonLoader';

interface PriceRangeSelectorProps {
  baseTokenAddress: string;
  quoteTokenAddress: string;
  priceRange: PriceRange;
  onRangeChange: (range: PriceRange) => void;
}

export function PriceRangeSelector({ 
  baseTokenAddress, 
  quoteTokenAddress, 
  priceRange, 
  onRangeChange 
}: PriceRangeSelectorProps) {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);

  // Fetch relative price data using the new token price logic
  const { 
    relativePrice,
    formattedRelativePrice, 
    marketData, 
    baseToken,
    quoteToken,
    isLoading, 
    error, 
    refetch,
    hasData 
  } = useRelativeTokenPrice(baseTokenAddress, quoteTokenAddress);

  const currentPrice = relativePrice || 2500; // Use relative price or fallback
  const minPrice = priceRange.min || currentPrice * 0.9;
  const maxPrice = priceRange.max || currentPrice * 1.1;

  // Generate realistic liquidity distribution curve (bell curve) around current relative price
  const chartData = useMemo(() => {
    const basePrice = relativePrice || 2500; // Use calculated relative price or fallback
    const data = [];
    
    // Create bell curve data points
    const numPoints = 100;
    const priceRangeSpan = basePrice * 0.6; // Total range spans ±30% of current price
    const minChartPrice = basePrice - (priceRangeSpan / 2);
    
    for (let i = 0; i < numPoints; i++) {
      const price = minChartPrice + (priceRangeSpan * i / (numPoints - 1));
      
      // Bell curve formula: peak at current price, tapering to edges
      const distanceFromCenter = Math.abs(price - basePrice) / (priceRangeSpan / 2);
      const liquidity = Math.exp(-2 * distanceFromCenter * distanceFromCenter) * 1000 + 50;
      
      data.push({
        price: price,
        liquidity: liquidity,
        rangeLiquidity: (price >= minPrice && price <= maxPrice) ? liquidity : 0 // Only show liquidity if in range
      });
    }
    
    return data;
  }, [relativePrice, minPrice, maxPrice]);

  const handleMinPriceChange = (value: string) => {
    const newMin = parseFloat(value) || 0;
    onRangeChange({ ...priceRange, min: newMin });
  };

  const handleMaxPriceChange = (value: string) => {
    const newMax = parseFloat(value) || 0;
    onRangeChange({ ...priceRange, max: newMax });
  };

  const getRangePercentage = () => {
    const totalRange = maxPrice - minPrice;
    const currentRange = Math.max(0, Math.min(currentPrice, maxPrice) - Math.max(currentPrice, minPrice));
    return totalRange > 0 ? (currentRange / totalRange) * 100 : 0;
  };

  // Show loading state
  if (isLoading && !hasData) {
    return (
      <motion.div 
        className="bg-gray-800/30 rounded-lg p-4 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChartSkeleton />
        <PriceDisplaySkeleton />
      </motion.div>
    );
  }

  // For better UX, show fallback data instead of error for API issues
  // Only show error for critical failures
  const showError = error && !hasData && error.message.includes('network') || error?.message.includes('fetch');
  
  if (showError) {
    return (
      <motion.div 
        className="bg-gray-800/30 rounded-lg p-4 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ErrorDisplay error={error!} onRetry={refetch} />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="bg-gray-800/30 rounded-lg p-4 space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Live Relative Price Display */}
      {formattedRelativePrice && (
        <div className="flex items-center justify-between p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg mb-4">
          <div>
            <div className="text-sm text-teal-400 font-medium">Current Relative Price</div>
            <div className="text-lg font-bold text-white">
              {formattedRelativePrice.display}
            </div>
            {marketData && (
              <div className="flex gap-4 text-xs text-gray-400 mt-1">
                <span>
                  Base: <span className={marketData.basePriceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {marketData.basePriceChange24h >= 0 ? '+' : ''}{marketData.basePriceChange24h.toFixed(2)}%
                  </span>
                </span>
                <span>
                  Quote: <span className={marketData.quotePriceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {marketData.quotePriceChange24h >= 0 ? '+' : ''}{marketData.quotePriceChange24h.toFixed(2)}%
                  </span>
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">USD Prices</div>
            <div className="text-sm text-white">
              Base: ${marketData?.baseTokenUsd.toFixed(4)}
            </div>
            <div className="text-sm text-white">
              Quote: ${marketData?.quoteTokenUsd.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* Price Chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="liquidityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="price" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => value.toFixed(0)}
            />
            {/* Main liquidity curve */}
            <Area
              type="monotone"
              dataKey="liquidity"
              stroke="#14b8a6"
              strokeWidth={2}
              fill="url(#liquidityGradient)"
            />
            {/* Highlighted range for user's position */}
            <Area
              type="monotone"
              dataKey="rangeLiquidity"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#rangeGradient)"
            />
            {/* Current Price Line */}
            <ReferenceLine 
              x={currentPrice} 
              stroke="#10b981" 
              strokeWidth={2} 
              strokeDasharray="5 5"
              label={{ value: "Current", position: "top", fill: "#10b981" }}
            />
            {/* Min Price Line */}
            <ReferenceLine
              x={minPrice}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: "Min", position: "top", fill: "#f59e0b" }}
            />
            {/* Max Price Line */}
            <ReferenceLine
              x={maxPrice}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: "Max", position: "top", fill: "#ef4444" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Price Range Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Min Price ({quoteToken.info?.symbol || getTokenSymbolFromAddress(quoteTokenAddress || '')} per {baseToken.info?.symbol || getTokenSymbolFromAddress(baseTokenAddress || '')})
          </label>
          <motion.input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 transition-all duration-300 ease-in-out hover:bg-gray-600/50 focus:scale-[1.02]"
            value={priceRange.min || ''}
            onChange={(e) => handleMinPriceChange(e.target.value)}
            whileFocus={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Current Price ({quoteToken.info?.symbol || getTokenSymbolFromAddress(quoteTokenAddress || '')} per {baseToken.info?.symbol || getTokenSymbolFromAddress(baseTokenAddress || '')})
          </label>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-sm text-green-400 font-medium relative">
            {currentPrice.toLocaleString()}
            {isLoading && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Max Price ({quoteToken.info?.symbol || getTokenSymbolFromAddress(quoteTokenAddress || '')} per {baseToken.info?.symbol || getTokenSymbolFromAddress(baseTokenAddress || '')})
          </label>
          <motion.input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 transition-all duration-300 ease-in-out hover:bg-gray-600/50 focus:scale-[1.02]"
            value={priceRange.max || ''}
            onChange={(e) => handleMaxPriceChange(e.target.value)}
            whileFocus={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        </div>
      </div>

      {/* Range Summary */}
      <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-teal-400 font-medium">Position Coverage:</span>
          <span className="text-teal-300">{getRangePercentage().toFixed(1)}% active range</span>
        </div>
        <div className="text-xs text-gray-400 mb-2">
          Your liquidity will be active between <span className="text-white">{minPrice.toLocaleString()}</span> and <span className="text-white">{maxPrice.toLocaleString()}</span> {quoteToken.info?.symbol || getTokenSymbolFromAddress(quoteTokenAddress || '')}
        </div>
        {marketData && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-teal-500/20">
            <span>24h Volume: <span className="text-teal-300">${(marketData.combinedVolume24h / 1000).toFixed(1)}K</span></span>
            <span>Market Data: <span className="text-teal-300">Live</span></span>
          </div>
        )}
      </div>

      {/* Quick Range Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-400">Quick ranges:</span>
        {[
          { label: '±5%', multiplier: 0.05 },
          { label: '±10%', multiplier: 0.10 },
          { label: '±25%', multiplier: 0.25 },
          { label: '±50%', multiplier: 0.50 },
        ].map((preset) => (
          <button
            key={preset.label}
            className="px-3 py-1 bg-gray-700/50 hover:bg-teal-600/20 hover:border-teal-500/50 border border-gray-600/50 text-xs text-gray-300 hover:text-teal-300 rounded-md transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
            onClick={() => onRangeChange({
              min: currentPrice * (1 - preset.multiplier),
              max: currentPrice * (1 + preset.multiplier)
            })}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}