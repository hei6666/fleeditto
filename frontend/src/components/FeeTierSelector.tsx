'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getDexAdapter } from '../lib/dex_adapters/factory';
import { useHyperionSDK } from './HyperionSDKProvider';
import { TrendingUp, CheckCircle } from 'lucide-react';

interface PoolData {
  exists: boolean;
  tvl: number;
  volume24h?: number;
}

interface FeeTierSelectorProps {
  selectedDex: string;
  selectedFeeTier: number;
  onFeeTierSelect: (feeTier: number) => void;
  tokenX?: string;
  tokenY?: string;
}
export const getFeeTierPercentageFromIndex = (index: number) => {
    const tickSpacingToFee: { [key: number]: number } = {
      1: 0.01,   // tick spacing 1 -> 0.01%
      10: 0.05,  // tick spacing 10 -> 0.05%
      60: 0.1,   // tick spacing 60 -> 0.1%
      200: 1.0,  // tick spacing 200 -> 1.0% (if needed)
      20: 0.25,  // tick spacing 20 -> 0.25%
      50: 0.3    // tick spacing 50 -> 0.3%
    };

    const tickSpacingVec = [1, 10, 60, 200, 20, 50];
    const tickSpacing = tickSpacingVec[index];
    return tickSpacingToFee[tickSpacing] || 0;
  };

export function FeeTierSelector({ selectedDex, selectedFeeTier, onFeeTierSelect, tokenX, tokenY }: FeeTierSelectorProps) {
  const adapter = getDexAdapter(selectedDex);
  const supportedFeeTiers = adapter.getSupportedFeeTiers();
  const sdk = useHyperionSDK();

  // State for pool data
  const [poolData, setPoolData] = useState<Record<number, PoolData>>({});
  const [loading, setLoading] = useState(false);
  const [highestTvlTier, setHighestTvlTier] = useState<number | null>(null);

  // Function to fetch pool data for all fee tiers
  const fetchPoolData = async () => {
    if (!tokenX || !tokenY || !sdk || selectedDex !== 'hyperion') {
      return;
    }

    try {
      setLoading(true);
      const newPoolData: Record<number, PoolData> = {};
      let maxTvl = 0;
      let maxTvlTier: number | null = null;

      // Fetch data for each supported fee tier
      for (const feeTier of supportedFeeTiers) {
        try {
          
          const poolInfo = await sdk.SDK.Pool.getPoolByTokenPairAndFeeTier({
            token1: tokenX,
            token2: tokenY,
            feeTier: feeTier
          });
          console.log("poolInfo",poolInfo);
          if (poolInfo && poolInfo.poolId) {
            // Get pool statistics using the poolId
            try {
              
              const poolStats = await sdk.SDK.Pool.fetchPoolById({ poolId: String(poolInfo.poolId) });
              console.log("pool stats full response:", poolStats);

              // Access the nested structure correctly
              const statsData = poolStats?.api?.getPoolStat || poolStats;
              console.log("stats data:", statsData[0]);
              console.log("tvlUSD raw:", statsData[0]?.tvlUSD);
              console.log("dailyVolumeUSD raw:", statsData[0]?.dailyVolumeUSD);

              const tvl = Number(statsData[0]?.tvlUSD) || 0;
              const volume24h = Number(statsData[0]?.dailyVolumeUSD) || 0;

              console.log("processed tvl:", tvl, "volume24h:", volume24h);

              newPoolData[feeTier] = {
                exists: true,
                tvl: tvl,
                volume24h: volume24h
              };

              // Track highest TVL
              if (tvl > maxTvl) {
                maxTvl = tvl;
                maxTvlTier = feeTier;
              }
            } catch (statsError) {
              console.log(`Failed to get stats for pool ${poolInfo.poolId}:`, statsError);
              // Pool exists but no stats available
              newPoolData[feeTier] = {
                exists: true,
                tvl: 0,
                volume24h: 0
              };
            }
          } else {
            newPoolData[feeTier] = {
              exists: false,
              tvl: 0
            };
          }
        } catch (error) {
          console.log(`Pool not found for fee tier ${feeTier}:`, error);
          // Check if it's a JSON parsing error or actual pool not found
          if (error instanceof Error && error.message && error.message.includes('not a valid json value')) {
            console.log(`JSON parsing error for fee tier ${feeTier}, treating as no pool exists`);
          }
          newPoolData[feeTier] = {
            exists: false,
            tvl: 0
          };
        }
      }

      setPoolData(newPoolData);
      setHighestTvlTier(maxTvlTier);
    } catch (error) {
      console.error('Error fetching pool data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pool data when tokens change
  useEffect(() => {
    if (tokenX && tokenY && tokenX !== tokenY) {
      fetchPoolData();
    } else {
      // Reset data when tokens are not selected
      setPoolData({});
      setHighestTvlTier(null);
    }
  }, [tokenX, tokenY, selectedDex]);

  // Helper function to format TVL
  const formatTVL = (tvl: number) => {
    if (tvl === 0) return 'No Pool';
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(1)}M`;
    }
    if (tvl >= 1000) {
      return `$${(tvl / 1000).toFixed(1)}K`;
    }
    return `$${tvl.toFixed(0)}`;
  };

  // Get pool status styling
  const getPoolStatusStyle = (feeTier: number) => {
    const pool = poolData[feeTier];
    const isSelected = selectedFeeTier === feeTier;
    const isHighestTvl = highestTvlTier === feeTier && pool?.exists;

    // Base styles for selected and unselected states
    const selectedBaseStyle = 'ring-2 ring-offset-2 ring-offset-gray-900 transform scale-105 shadow-2xl';
    const unselectedBaseStyle = 'opacity-70 hover:opacity-90 hover:scale-[1.02]';

    if (!pool) {
      // Loading or no data
      return {
        className: isSelected
          ? `bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border-2 border-teal-400 ring-teal-400 ${selectedBaseStyle}`
          : `bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-400/30 ${unselectedBaseStyle}`,
        textColor: isSelected ? 'text-white' : 'text-white/70',
        badgeType: isSelected ? 'selected' : null
      };
    }

    if (!pool.exists) {
      // Pool doesn't exist
      return {
        className: isSelected
          ? `bg-gradient-to-br from-red-500/30 to-red-400/30 border-2 border-red-400 ring-red-400 ${selectedBaseStyle}`
          : `bg-red-500/10 border border-red-400/30 hover:bg-red-500/20 ${unselectedBaseStyle}`,
        textColor: isSelected ? 'text-white' : 'text-red-400/70',
        badgeType: isSelected ? 'no-pool' : null
      };
    }

    if (isHighestTvl) {
      // Highest TVL pool
      return {
        className: isSelected
          ? `bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-green-400 ring-green-400 ${selectedBaseStyle}`
          : `bg-green-500/15 border border-green-400/40 hover:bg-green-500/25 hover:border-green-400/60 ${unselectedBaseStyle}`,
        textColor: isSelected ? 'text-white' : 'text-green-400/70',
        badgeType: isSelected ? 'best-tvl' : null
      };
    }

    // Pool exists but not highest TVL
    return {
      className: isSelected
        ? `bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border-2 border-teal-400 ring-teal-400 ${selectedBaseStyle}`
        : `bg-blue-500/10 border border-blue-400/30 hover:bg-blue-500/20 hover:border-blue-400/50 ${unselectedBaseStyle}`,
      textColor: isSelected ? 'text-white' : 'text-blue-300/70',
      badgeType: isSelected ? 'selected' : null
    };
  };

  // Render badge based on selection and pool status
  const renderBadge = (badgeType: string | null) => {
    if (!badgeType) return null;

    switch (badgeType) {
      case 'best-tvl':
        return (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
        );
      case 'no-pool':
        return (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-red-400 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        );
      case 'selected':
        return (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  // TICK_SPACING_VEC mapping: [1, 10, 60, 200, 20, 50]
  // Index to fee percentage mapping


  const formatFeeTier = (feeTierIndex: number) => {
    const percentage = getFeeTierPercentageFromIndex(feeTierIndex);
    if (percentage < 0.1) {
      return percentage.toFixed(2) + '%';  // 0.01%, 0.05%
    } else if (percentage < 1) {
      return percentage + '%';   // 0.1%, 0.3%
    } else {
      return percentage.toFixed(0) + '%';   // 1%
    }
  };

  const getFeeTierDescription = (feeTierIndex: number) => {
    const percentage = getFeeTierPercentageFromIndex(feeTierIndex);
    if (percentage <= 0.01) return 'Ultra Stable'; // 0.01%
    if (percentage <= 0.05) return 'Stable'; // 0.05%
    if (percentage <= 0.1) return 'Blue Chip'; // 0.1%
    if (percentage <= 0.25) return 'Standard'; // 0.25%
    if (percentage <= 0.3) return 'Most Pairs'; // 0.3%
    return 'Volatile';
  };

  return (
    <motion.div 
      className="glass glass-hover p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2 font-inter">Fee Tier</h3>
        <div className="text-sm text-white/60">
          {tokenX && tokenY ? (
            loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                Fetching pool data...
              </span>
            ) : (
              'Pool data loaded. Green indicates highest TVL, red indicates no pool exists.'
            )
          ) : (
            'Choose the fee tier for your liquidity position'
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {supportedFeeTiers.map((feeTier) => {
          const poolStatus = getPoolStatusStyle(feeTier);
          const pool = poolData[feeTier];
          const isSelected = selectedFeeTier === feeTier;

          return (
            <motion.button
              key={feeTier}
              onClick={() => onFeeTierSelect(feeTier)}
              className={`p-4 rounded-xl backdrop-filter backdrop-blur-xl transition-all duration-300 ease-in-out relative ${poolStatus.className}`}
              whileHover={{ scale: isSelected ? 1.05 : 1.02 }}
              whileTap={{ scale: isSelected ? 1.02 : 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              disabled={loading}
            >
              {/* Dynamic badge based on selection and pool status */}
              {renderBadge(poolStatus.badgeType)}

              {/* Selected indicator overlay */}
              {isSelected && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              )}

              <div className="text-center relative z-10">
                <div className={`text-lg sm:text-xl font-bold transition-all duration-300 ${poolStatus.textColor} ${isSelected ? 'text-shadow-sm' : ''}`}>
                  {formatFeeTier(feeTier)}
                </div>
                <div className={`text-xs mt-1 transition-all duration-300 ${isSelected ? 'text-white/80' : 'text-white/50'}`}>
                  {getFeeTierDescription(feeTier)}
                </div>

                {/* TVL Information */}
                {tokenX && tokenY && (
                  <div className={`mt-3 pt-2 border-t transition-all duration-300 ${isSelected ? 'border-white/30' : 'border-white/10'}`}>
                    {loading ? (
                      <div className="text-xs text-white/40">Loading...</div>
                    ) : pool ? (
                      <div className={`text-xs font-medium transition-all duration-300 ${poolStatus.textColor}`}>
                        {formatTVL(pool.tvl)}
                      </div>
                    ) : (
                      <div className="text-xs text-white/40">-</div>
                    )}
                  </div>
                )}

                {/* Selected label */}
                {isSelected && (
                  <div className="mt-2 text-xs font-semibold text-white/90 bg-white/20 rounded-full px-2 py-1">
                    SELECTED
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}