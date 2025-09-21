"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

interface LiquidityChartProps {
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  feeTier?: number;
  onRangeChange?: (minPrice: number, maxPrice: number) => void;
}

interface ChartDataPoint {
  price: number;
  liquidity: number;
  isSelected: boolean;
  selectedLiquidity: number;
}

export function LiquidityChart({
  currentPrice,
  minPrice,
  maxPrice,
  tokenASymbol = 'TOKEN_A',
  tokenBSymbol = 'TOKEN_B',
  feeTier,
  onRangeChange
}: LiquidityChartProps) {

  // Dragging state
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [tempRange, setTempRange] = useState<{ minPrice: number; maxPrice: number } | null>(null);
  const pendingRangeChangeRef = useRef<{ minPrice: number; maxPrice: number } | null>(null);

  // Helper function to get price range multiplier based on fee tier
  const getPriceRangeMultiplier = (feeTierIndex?: number): number => {
    if (feeTierIndex === undefined || feeTierIndex === null) {
      return 0.5; // Default 50% range
    }

    // Map fee tier indices to appropriate price range multipliers
    // Lower fee tiers (more stable) need much finer granularity
    const feeRangeMap: { [key: number]: number } = {
      0: 0.002,   // 0.01% fee tier - Ultra stable, 0.2% range (0.9990-1.0010 for price ~1)
      1: 0.005,   // 0.05% fee tier - Stable, 0.5% range
      2: 0.02,    // 0.1% fee tier - Blue chip, 2% range
      3: 0.1,     // 1.0% fee tier - Volatile, 10% range
      4: 0.05,    // 0.25% fee tier - Standard, 5% range
      5: 0.08     // 0.3% fee tier - Most pairs, 8% range
    };

    return feeRangeMap[feeTierIndex] || 0.5; // Default to 50% if not found
  };

  // Use temporary range while dragging, otherwise use props
  const displayMinPrice = tempRange?.minPrice ?? minPrice;
  const displayMaxPrice = tempRange?.maxPrice ?? maxPrice;

  // Get chart dimensions and price range for coordinate conversion
  const chartDimensions = useMemo(() => {
    const rangeMultiplier = getPriceRangeMultiplier(feeTier) == 0.002 ? getPriceRangeMultiplier(feeTier) : getPriceRangeMultiplier(feeTier)*12;
    const priceRange = currentPrice * rangeMultiplier;
    const minChartPrice = Math.max(0.001, currentPrice - priceRange);
    const maxChartPrice = currentPrice + priceRange;
    return { minChartPrice, maxChartPrice };
  }, [currentPrice, feeTier]);

  // Generate liquidity distribution curve data
  const chartData = useMemo(() => {
    const dataPoints: ChartDataPoint[] = [];
    const numPoints = 200;

    // Create a range around the current price based on fee tier
    const rangeMultiplier = getPriceRangeMultiplier(feeTier) == 0.002 ? getPriceRangeMultiplier(feeTier) : getPriceRangeMultiplier(feeTier)*12;
    const priceRange = currentPrice * rangeMultiplier;
    const minChartPrice = Math.max(0.001, currentPrice - priceRange);
    const maxChartPrice = currentPrice + priceRange;
    const step = (maxChartPrice - minChartPrice) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const price = minChartPrice + i * step;

      // Generate a normal distribution (bell curve) centered on current price
      const mean = currentPrice;
      // Adjust standard deviation based on fee tier for more realistic liquidity distribution
      const baseStdDevRatio = getPriceRangeMultiplier(feeTier) == 0.002 ?getPriceRangeMultiplier(feeTier) * 0.3:getPriceRangeMultiplier(feeTier)*4; // 30% of the price range
      const standardDeviation = currentPrice * baseStdDevRatio;
      const variance = standardDeviation ** 2;

      // Normal distribution formula
      const exponent = -((price - mean) ** 2) / (2 * variance);
      const liquidity = Math.exp(exponent) / Math.sqrt(2 * Math.PI * variance);

      // Normalize to 0-100 range for better visualization
      const normalizedLiquidity = liquidity * 100 * Math.sqrt(2 * Math.PI * variance);

      // Check if this price point is within the selected range
      const isSelected = price >= displayMinPrice && price <= displayMaxPrice;

      dataPoints.push({
        price: parseFloat(price.toFixed(6)),
        liquidity: parseFloat(normalizedLiquidity.toFixed(2)),
        isSelected,
        // Add separate field for selected range liquidity
        selectedLiquidity: isSelected ? parseFloat(normalizedLiquidity.toFixed(2)) : 0
      });
    }

    return dataPoints;
  }, [currentPrice, displayMinPrice, displayMaxPrice, feeTier]);

  // Convert mouse position to price value
  const mouseToPrice = useCallback((mouseX: number): number => {
    if (!chartRef.current || !chartData || chartData.length === 0) return currentPrice;

    const rect = chartRef.current.getBoundingClientRect();
    // Use the same margins as AreaChart component
    const chartMarginLeft = 20 + 16; // 20px from AreaChart + 16px from div padding
    const chartMarginRight = 30 + 16; // 30px from AreaChart + 16px from div padding
    const chartWidth = rect.width - chartMarginLeft - chartMarginRight;

    const relativeX = (mouseX - rect.left - chartMarginLeft) / chartWidth;
    const clampedX = Math.max(0, Math.min(1, relativeX));

    // Use the actual chart data range to match Recharts domain
    const dataMinPrice = Math.min(...chartData.map(d => d.price));
    const dataMaxPrice = Math.max(...chartData.map(d => d.price));
    const price = dataMinPrice + (dataMaxPrice - dataMinPrice) * clampedX;

    return Math.max(0.001, price);
  }, [chartData, currentPrice]);

  // Handle mouse down on range handles
  const handleMouseDown = useCallback((type: 'min' | 'max', event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(type);
    setTempRange({ minPrice, maxPrice });

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame for smoother updates
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const newPrice = mouseToPrice(e.clientX);

        setTempRange(prevRange => {
          if (!prevRange) return null;

          let newRange;
          if (type === 'min') {
            const newMinPrice = Math.max(0.001, Math.min(newPrice, prevRange.maxPrice - 0.001));
            newRange = { ...prevRange, minPrice: newMinPrice };
          } else if (type === 'max') {
            const newMaxPrice = Math.max(newPrice, prevRange.minPrice + 0.001);
            newRange = { ...prevRange, maxPrice: newMaxPrice };
          } else {
            return prevRange;
          }

          // Only update if the price actually changed to avoid unnecessary re-renders
          if (newRange.minPrice !== prevRange.minPrice || newRange.maxPrice !== prevRange.maxPrice) {
            return newRange;
          }
          return prevRange;
        });
      });
    };

    const handleMouseUp = () => {
      // Clean up animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Store the final range change for later execution
      setTempRange(currentTempRange => {
        if (currentTempRange) {
          pendingRangeChangeRef.current = {
            minPrice: currentTempRange.minPrice,
            maxPrice: currentTempRange.maxPrice
          };
        }
        return null;
      });

      setIsDragging(null);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minPrice, maxPrice, mouseToPrice, onRangeChange]);

  // Calculate position percentage for handles (matching Recharts coordinate system)
  const getHandlePosition = useCallback((price: number): number => {
    // Use the actual chart data range instead of fixed dimensions
    if (!chartData || chartData.length === 0) return 0;

    const dataMinPrice = Math.min(...chartData.map(d => d.price));
    const dataMaxPrice = Math.max(...chartData.map(d => d.price));

    return ((price - dataMinPrice) / (dataMaxPrice - dataMinPrice)) * 100;
  }, [chartData]);

  // Calculate absolute position with proper margins
  const getHandleStyle = useCallback((price: number) => {
    const positionPercent = getHandlePosition(price);
    const chartMarginLeft = 20 + 16; // AreaChart left margin + div padding

    return {
      left: `calc(${positionPercent}% + ${chartMarginLeft}px)`,
      transform: 'translateX(-50%)'
    };
  }, [getHandlePosition]);

  // Handle pending range changes after render
  useEffect(() => {
    if (pendingRangeChangeRef.current && onRangeChange && !isDragging) {
      const { minPrice, maxPrice } = pendingRangeChangeRef.current;
      pendingRangeChangeRef.current = null;
      onRangeChange(minPrice, maxPrice);
    }
  }, [onRangeChange, isDragging]);

  // Cleanup effect to ensure dragging state is reset
  useEffect(() => {
    return () => {
      setIsDragging(null);
      setTempRange(null);
      pendingRangeChangeRef.current = null;
    };
  }, []);


  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean; 
    payload?: Array<{ value: number }>; 
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-filter backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-white text-sm font-medium">
            Price: {parseFloat(label || '0').toFixed(6)} {tokenBSymbol}/{tokenASymbol}
          </p>
          <p className="text-teal-400 text-sm">
            Liquidity: {payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Format price for axis labels
  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return price.toFixed(4);
    } else if (price < 1) {
      return price.toFixed(4);
    } else if (price < 1000) {
      return price.toFixed(4);
    } else {
      return price.toLocaleString();
    }
  };

  return (
    <motion.div
      className="glass glass-hover p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2 font-inter">
          Liquidity Distribution
        </h2>
        <p className="text-sm text-white/60 mb-2">
          Visualization of liquidity concentration around the current market price
        </p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-sm text-blue-300 mb-2">
            <span className="text-blue-400 font-medium">🎯 Blue highlighted area</span> shows your selected price range where your liquidity will be active
          </p>
          {onRangeChange && (
            <p className="text-xs text-teal-300">
              <span className="text-teal-400 font-medium">📍 Interactive:</span> Drag the Min/Max handles on the chart to adjust your price range
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Price Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className={`bg-white/5 rounded-lg p-3 backdrop-filter backdrop-blur-sm transition-all ${isDragging === 'min' ? 'bg-teal-500/20 border border-teal-400/50' : ''}`}>
            <div className="text-xs text-white/60 mb-1">Min Price {isDragging === 'min' && '(Dragging)'}</div>
            <div className="text-teal-400 font-mono text-sm">
              {formatPrice(displayMinPrice)} {tokenBSymbol}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 backdrop-filter backdrop-blur-sm">
            <div className="text-xs text-white/60 mb-1">Current Price</div>
            <div className="text-white font-mono text-sm">
              {formatPrice(currentPrice)} {tokenBSymbol}
            </div>
          </div>
          <div className={`bg-white/5 rounded-lg p-3 backdrop-filter backdrop-blur-sm transition-all ${isDragging === 'max' ? 'bg-teal-500/20 border border-teal-400/50' : ''}`}>
            <div className="text-xs text-white/60 mb-1">Max Price {isDragging === 'max' && '(Dragging)'}</div>
            <div className="text-teal-400 font-mono text-sm">
              {formatPrice(displayMaxPrice)} {tokenBSymbol}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div
          ref={chartRef}
          className={`relative h-80 w-full bg-white/5 rounded-xl p-4 backdrop-filter backdrop-blur-sm ${isDragging ? 'cursor-grabbing' : 'cursor-auto'}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 40,
              }}
            >
              <defs>
                <linearGradient id="liquidityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="selectedRangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.1)" 
                horizontal={true}
                vertical={false}
              />
              
              <XAxis
                dataKey="price"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                tickFormatter={formatPrice}
                domain={['dataMin', 'dataMax']}
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                domain={[0, 'dataMax']}
                tickFormatter={(value) => `${value}%`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Main liquidity curve */}
              <Area
                type="monotone"
                dataKey="liquidity"
                stroke="#14b8a6"
                strokeWidth={2}
                fill="url(#liquidityGradient)"
              />

              {/* Selected range liquidity highlight */}
              <Area
                type="monotone"
                dataKey="selectedLiquidity"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#selectedRangeGradient)"
                strokeDasharray="0"
              />
              
              {/* Current price reference line */}
              <ReferenceLine
                x={currentPrice}
                stroke="#ff6b35"
                strokeWidth={3}
                strokeDasharray="0"
                label={{
                  value: "Current Price",
                  position: "insideTopRight",
                  fill: "#ff6b35",
                  fontSize: 14,
                  fontWeight: "bold"
                }}
              />
              
              {/* Selected range area */}
              <ReferenceArea
                x1={displayMinPrice}
                x2={displayMaxPrice}
                fill="url(#selectedGradient)"
                fillOpacity={0.3}
                stroke="#06b6d4"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* Price range boundary lines */}
              <ReferenceLine
                x={displayMinPrice}
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: "Min",
                  position: "insideBottomLeft",
                  fill: "#06b6d4",
                  fontSize: 11
                }}
              />

              <ReferenceLine
                x={displayMaxPrice}
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: "Max",
                  position: "insideBottomRight",
                  fill: "#06b6d4",
                  fontSize: 11
                }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Draggable handles */}
          {onRangeChange && (
            <>

              {/* Min price handle */}
              <div
                className={`absolute top-4 bg-teal-500 text-white text-xs px-2 py-1 rounded-lg cursor-grab active:cursor-grabbing shadow-lg hover:bg-teal-400 select-none z-20 transform-gpu transition-transform duration-75 ${
                  isDragging === 'min'
                    ? 'scale-110 bg-teal-400 shadow-xl ring-2 ring-teal-300/50'
                    : 'hover:scale-105'
                }`}
                style={{
                  ...getHandleStyle(displayMinPrice),
                  willChange: 'transform'
                }}
                onMouseDown={(e) => handleMouseDown('min', e)}
                title="Drag to adjust minimum price"
              >
                📍 Min
              </div>

              {/* Max price handle */}
              <div
                className={`absolute top-4 bg-teal-500 text-white text-xs px-2 py-1 rounded-lg cursor-grab active:cursor-grabbing shadow-lg hover:bg-teal-400 select-none z-20 transform-gpu transition-transform duration-75 ${
                  isDragging === 'max'
                    ? 'scale-110 bg-teal-400 shadow-xl ring-2 ring-teal-300/50'
                    : 'hover:scale-105'
                }`}
                style={{
                  ...getHandleStyle(displayMaxPrice),
                  willChange: 'transform'
                }}
                onMouseDown={(e) => handleMouseDown('max', e)}
                title="Drag to adjust maximum price"
              >
                📍 Max
              </div>

              {/* Real-time price display during dragging */}
              {isDragging === 'min' && (
                <div
                  className="absolute bg-teal-500 text-white text-xs px-2 py-1 rounded-lg shadow-lg pointer-events-none z-30 animate-pulse"
                  style={{
                    ...getHandleStyle(displayMinPrice),
                    bottom: '20px'
                  }}
                >
                  {formatPrice(displayMinPrice)} {tokenBSymbol}
                </div>
              )}

              {isDragging === 'max' && (
                <div
                  className="absolute bg-teal-500 text-white text-xs px-2 py-1 rounded-lg shadow-lg pointer-events-none z-30 animate-pulse"
                  style={{
                    ...getHandleStyle(displayMaxPrice),
                    bottom: '20px'
                  }}
                >
                  {formatPrice(displayMaxPrice)} {tokenBSymbol}
                </div>
              )}

              {/* Instructions overlay */}
              {!isDragging && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
                    💡 Drag the Min/Max handles to adjust price range
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chart Legend */}
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-500 to-teal-400"></div>
            <span className="text-white/70">Total Liquidity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-green-500"></div>
            <span className="text-white/70">🎯 Your Selected Range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-orange-500"></div>
            <span className="text-white/70">📍 Current Price</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}