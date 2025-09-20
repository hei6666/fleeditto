"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { ArrowLeft, Send, ExternalLink, TrendingUp, DollarSign, Calendar, Target, Zap, Gift, X, RefreshCw } from 'lucide-react';

import { useHyperionSDK } from './HyperionSDKProvider';
import { useAptosClient } from '../hooks/useAptosClient';
import { Button } from './ui/button';
import { findTokenByAddress, extractTokenSymbol } from '../config/tokens';
import {tickToPrice} from "@hyperionxyz/sdk";

import { useAppContext } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supportedDEXes } from '../config/dexes';
interface UserPositionsProps {
  onBack: () => void;
}


// Format token amounts with proper decimal precision
const formatTokenAmount = (amount: string | number, decimals: number = 8) => {
  const num = Number(amount);

  // If the amount is 0 or very small, show 0
  if (num === 0) return '0';

  // Convert from smallest unit to human readable
  const humanReadable = num / Math.pow(10, decimals);

  // Format based on the size of the number
  if (humanReadable < 0.000001) return humanReadable.toFixed(8);
  if (humanReadable < 0.001) return humanReadable.toFixed(6);
  if (humanReadable < 1) return humanReadable.toFixed(4);
  if (humanReadable < 1000) return humanReadable.toFixed(2);

  // For large numbers, use compact notation
  if (humanReadable >= 1000000) {
    return (humanReadable / 1000000).toFixed(2) + 'M';
  }
  if (humanReadable >= 1000) {
    return (humanReadable / 1000).toFixed(2) + 'K';
  }

  return humanReadable.toFixed(2);
};

// Token display component with logo
interface TokenDisplayProps {
  coinType?: string;
  amount: string | number;
  decimals?: number;
  className?: string;
  amountColor?: string;
}



function TokenDisplay({ coinType, amount, decimals = 8, className = '', amountColor = 'text-teal-400' }: TokenDisplayProps) {
  const tokenInfo = coinType ? findTokenByAddress(coinType) : null;
  const symbol = tokenInfo?.symbol || (coinType ? extractTokenSymbol(coinType) : 'UNKNOWN');
  const name = tokenInfo?.name || symbol;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {tokenInfo?.logoUri ? (
          <img
            src={tokenInfo.logoUri}
            alt={symbol}
            className="w-5 h-5 rounded-full flex-shrink-0"
            onError={(e) => {
              // Fallback to generic icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-teal-500 to-cyan-500 flex-shrink-0 ${tokenInfo?.logoUri ? 'hidden' : ''}`}
        >
          {symbol.charAt(0)}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{symbol}</span>
          {name !== symbol && (
            <span className="text-xs text-white/50 truncate">{name}</span>
          )}
        </div>
      </div>
      <span className={`font-medium ml-auto flex-shrink-0 ${amountColor}`}>
        {formatTokenAmount(amount, decimals)}
      </span>
    </div>
  );
}

// Token ratio component
interface TokenRatioProps {
  tokenA: { coinType: string; amount: string; decimals: number };
  tokenB: { coinType: string; amount: string; decimals: number };
  t: (key: string) => string;
}

function TokenRatio({ tokenA, tokenB, t }: TokenRatioProps) {
  const tokenAInfo = findTokenByAddress(tokenA.coinType);
  const tokenBInfo = findTokenByAddress(tokenB.coinType);
  const symbolA = tokenAInfo?.symbol || extractTokenSymbol(tokenA.coinType);
  const symbolB = tokenBInfo?.symbol || extractTokenSymbol(tokenB.coinType);

  const amountA = Number(tokenA.amount) / Math.pow(10, tokenA.decimals);
  const amountB = Number(tokenB.amount) / Math.pow(10, tokenB.decimals);
  const total = amountA + amountB;

  const percentageA = total > 0 ? (amountA / total) * 100 : 50;
  const percentageB = 100 - percentageA;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{t('positions.token_ratio')}</span>
        <span className="text-white/60">{percentageA.toFixed(1)}% / {percentageB.toFixed(1)}%</span>
      </div>

      <div className="flex h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal-400 to-teal-500 flex items-center justify-center"
          style={{ width: `${percentageA}%` }}
        />
        <div
          className="bg-gradient-to-r from-purple-400 to-purple-500 flex items-center justify-center"
          style={{ width: `${percentageB}%` }}
        />
      </div>

      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
          <span className="text-white">{symbolA}: {formatTokenAmount(tokenA.amount, tokenA.decimals)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
          <span className="text-white">{symbolB}: {formatTokenAmount(tokenB.amount, tokenB.decimals)}</span>
        </div>
      </div>
    </div>
  );
}

export function UserPositions({ onBack }: UserPositionsProps) {
  const { account, connected ,signAndSubmitTransaction} = useWallet();
  const sdk = useHyperionSDK();
  const { currentNetwork , aptos} = useAptosClient();
  const ownerAddress = account?.address?.toString();
  const { t } = useLanguage();

  // Helper function to get DEX info by ID
  const getDexInfo = (dexId: string) => {
    return supportedDEXes.find(dex => dex.id.toLowerCase() === dexId.toLowerCase()) || {
      id: dexId,
      name: dexId.charAt(0).toUpperCase() + dexId.slice(1),
      logoUrl: '',
      contractAddress: ''
    };
  };

  const [userPositions, setUserPositions] = useState<any[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [positionAmounts, setPositionAmounts] = useState<{[key: string]: {tokenA: string, tokenB: string}}>({});


  // Clear messages after a delay
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  const showError = (message: string) => {
    setError(message);
    setSuccessMessage(null);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setError(null);
  };

  // Function to fetch position amounts
  const fetchPositionAmounts = async (positionAddress: string) => {
    try {
      const result = await aptos.view({
        payload:{
          function: "0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::router_v3::get_amount_by_liquidity",
          functionArguments: [positionAddress]
      }
      });

      if (result && result.length >= 2 && result[0] !=null && result[1] !=null) {
        return {
          tokenA: result[0].toString(),
          tokenB: result[1].toString()
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching amounts for position ${positionAddress}:`, error);
      return null;
    }
  };

  // Function to fetch amounts for all positions
  const fetchAllPositionAmounts = async (positions: any[]) => {
    const amounts: {[key: string]: {tokenA: string, tokenB: string}} = {};

    await Promise.all(
      positions.map(async (position) => {
        const positionId = position.position.objectId;
        const result = await fetchPositionAmounts(positionId);
        if (result) {
          amounts[positionId] = result;
        }
      })
    );

    setPositionAmounts(amounts);
  };

  // Unified function to refresh positions
  const refreshPositions = async () => {
    if (ownerAddress && sdk && connected) {
      try {
        setLoadingPositions(true);
        console.log('Refreshing positions...');
        const positions = await sdk.SDK.Position.fetchAllPositionsByAddress({
          address: String(ownerAddress)
        });
        console.log('Fetched positions:', positions);
        setUserPositions(positions || []);

        // Fetch amounts for all positions
        if (positions && positions.length > 0) {
          await fetchAllPositionAmounts(positions);
        }
      } catch (error) {
        console.error('Error refreshing positions:', error);
        showError('Failed to refresh positions');
      } finally {
        setLoadingPositions(false);
      }
    }
  };

  const remove_single_position = async (positionId: string, which_dex: string = "hyperion") => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    // Store original positions for potential rollback
    const originalPositions = userPositions;

    try {
      setOperationLoading(`removing-${positionId}`);

      switch(which_dex) {
        case "hyperion": {
          const txn = await signAndSubmitTransaction({
            sender: account.address,
            data: {
              function: "0x3a911a96b4d6736392120b4af910db1aeda07c4e0b19e9059e1aedb35b4fc10a::batch::remove_hyperion",
              functionArguments: [positionId]
            }
          });

          console.log('Position removed successfully:', txn);
          showSuccess('Position removed successfully!');

          // Immediately remove the position from UI (optimistic update)
          setUserPositions(prevPositions =>
            prevPositions.filter(p => p.position.objectId !== positionId)
          );

          // Also refresh from API in background (in case of any inconsistencies)
          setTimeout(() => {
            refreshPositions();
          }, 2000);
          break;
        }
        case "tapp": {
          showError('TAPP position removal not yet implemented');
          throw new Error('TAPP position removal not yet implemented');
        }
        case "thala": {
          showError('Thala position removal not yet implemented');
          throw new Error('Thala position removal not yet implemented');
        }
        default:
          throw new Error(`Unsupported DEX: ${which_dex}`);
      }
    } catch (error) {
      console.error('Error removing position:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove position';
      showError(errorMessage);

      // Rollback UI changes on error
      setUserPositions(originalPositions);
    } finally {
      setOperationLoading(null);
    }
  };

  const remove_all_position = async (positionIds?: string[], which_dex: string = "hyperion") => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    // Use provided IDs, or all positions as fallback
    const positionsToRemove = positionIds || userPositions.map(p => p.position.objectId);

    if (positionsToRemove.length === 0) {
      throw new Error('No positions available for removal');
    }

    // Store original positions for potential rollback
    const originalPositions = userPositions;

    try {
      setOperationLoading('removing-all');

      switch(which_dex) {
        case "hyperion": {
          const txn = await signAndSubmitTransaction({
            sender: account.address,
            data: {
              function: "0x3a911a96b4d6736392120b4af910db1aeda07c4e0b19e9059e1aedb35b4fc10a::batch::remove_all_hyperion",
              functionArguments: [positionsToRemove]
            }
          });

          console.log('All positions removed successfully:', txn);
          showSuccess(`Successfully removed ${positionsToRemove.length} position(s)!`);

          // Immediately remove positions from UI (optimistic update)
          setUserPositions(prevPositions =>
            prevPositions.filter(p => !positionsToRemove.includes(p.position.objectId))
          );

          // Also refresh from API in background (in case of any inconsistencies)
          setTimeout(() => {
            refreshPositions();
          }, 2000);
          break;
        }
        case "tapp": {
          showError('TAPP batch position removal not yet implemented');
          throw new Error('TAPP batch position removal not yet implemented');
        }
        case "thala": {
          showError('Thala batch position removal not yet implemented');
          throw new Error('Thala batch position removal not yet implemented');
        }
        default:
          throw new Error(`Unsupported DEX: ${which_dex}`);
      }
    } catch (error) {
      console.error('Error removing positions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove positions';
      showError(errorMessage);

      // Rollback UI changes on error
      setUserPositions(originalPositions);
    } finally {
      setOperationLoading(null);
    }
  };

  const claim_all_position_fee_and_reward = async (positionIds?: string[], which_dex: string = "hyperion") => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    // Use all positions if no specific IDs provided
    const positionsToClaim = positionIds || userPositions.map(p => p.position.objectId);

    if (positionsToClaim.length === 0) {
      throw new Error('No positions available for claiming');
    }

    // Store original positions for potential rollback
    const originalPositions = userPositions;

    try {
      setOperationLoading('claiming-all');

      switch(which_dex) {
        case "hyperion": {
          const txn = await signAndSubmitTransaction({
            sender: account.address,
            data: {
              function: "0x3a911a96b4d6736392120b4af910db1aeda07c4e0b19e9059e1aedb35b4fc10a::batch::batch_claim_hyperion",
              functionArguments: [positionsToClaim]
            }
          });

          console.log('All fees and rewards claimed successfully:', txn);
          showSuccess(`Successfully claimed rewards from ${positionsToClaim.length} position(s)!`);

          // Immediately clear unclaimed fees/rewards from UI (optimistic update)
          setUserPositions(prevPositions =>
            prevPositions.map(position => {
              if (positionsToClaim.includes(position.position.objectId)) {
                return {
                  ...position,
                  fees: {
                    ...position.fees,
                    unclaimed: []
                  },
                  farm: {
                    ...position.farm,
                    unclaimed: []
                  }
                };
              }
              return position;
            })
          );

          // Also refresh from API in background (in case of any inconsistencies)
          setTimeout(() => {
            refreshPositions();
          }, 2000);
          break;
        }
        case "tapp": {
          showError('TAPP batch claiming not yet implemented');
          throw new Error('TAPP batch claiming not yet implemented');
        }
        case "thala": {
          showError('Thala batch claiming not yet implemented');
          throw new Error('Thala batch claiming not yet implemented');
        }
        default:
          throw new Error(`Unsupported DEX: ${which_dex}`);
      }
    } catch (error) {
      console.error('Error claiming fees and rewards:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim rewards';
      showError(errorMessage);

      // Rollback UI changes on error
      setUserPositions(originalPositions);
    } finally {
      setOperationLoading(null);
    }
  };

  // Helper function to get Aptos Explorer URL
  const getExplorerUrl = (objectId: string) => {
    const networkName = currentNetwork.toString().toLowerCase();
    return `https://explorer.aptoslabs.com/object/${objectId}?network=${networkName}`;
  };

  // Fetch positions when component mounts
  useEffect(() => {
    const fetchPositions = async () => {
      if (ownerAddress && sdk && connected) {
        try {
          setLoadingPositions(true);
          const positions = await sdk.SDK.Position.fetchAllPositionsByAddress({
            address: String(ownerAddress)
          });
          console.log("User positions:", positions);
          setUserPositions(positions || []);

          // Fetch amounts for all positions
          if (positions && positions.length > 0) {
            await fetchAllPositionAmounts(positions);
          }
        } catch (error) {
          console.error("Error fetching positions:", error);
          setUserPositions([]);
        } finally {
          setLoadingPositions(false);
        }
      }
    };

    fetchPositions();
  }, [ownerAddress, sdk, connected]);

  const formatValue = (value: string | number) => {
    const num = Number(value);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(2);
  };

  // Convert fee tier index to actual percentage (same logic as FeeTierSelector)
  const getFeeTierPercentageFromIndex = (index: number) => {
    const tickSpacingToFee: { [key: number]: number } = {
      1: 0.01,   // tick spacing 1 -> 0.01%
      10: 0.05,  // tick spacing 10 -> 0.05%
      60: 0.1,   // tick spacing 60 -> 0.1%
      200: 1.0,  // tick spacing 200 -> 1.0%
      20: 0.25,  // tick spacing 20 -> 0.25%
      50: 0.3    // tick spacing 50 -> 0.3%
    };

    const tickSpacingVec = [1, 10, 60, 200, 20, 50];
    const tickSpacing = tickSpacingVec[index];
    return tickSpacingToFee[tickSpacing] || 0;
  };

  const formatFeeTier = (feeTierIndex: number) => {
    const percentage = getFeeTierPercentageFromIndex(feeTierIndex);
    if (percentage < 0.1) {
      return percentage.toFixed(2) + '%';  // 0.01%, 0.05%
    } else if (percentage < 1) {
      return percentage.toFixed(1) + '%';   // 0.1%, 0.3%
    } else {
      return percentage.toFixed(0) + '%';   // 1%
    }
  };

  const getPositionStatus = (position: any) => {
    const currentTick = position.position.pool.currentTick;
    const { tickLower, tickUpper } = position.position;

    if (currentTick >= tickLower && currentTick <= tickUpper) {
      return { status: 'In Range', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' };
    } else {
      return { status: 'Out of Range', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' };
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={onBack}
            variant="outline"
            className="mb-6 border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('positions.back')}
          </Button>

          <div className="glass p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">{t('common.connect_wallet')}</h2>
            <p className="text-white/70">{t('positions.connect_prompt')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 rounded-lg">
      <div className="max-w-6xl mx-auto">
        {/* Notifications */}
        {(error || successMessage) && (
          <motion.div
            className={`mb-6 p-4 rounded-lg border ${
              error
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {error || successMessage}
              </span>
              <Button
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                }}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-current hover:bg-current/10"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile Header Layout */}
          <div className="block md:hidden space-y-4">
            {/* Top Row: Back Button + Title */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onBack}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 px-3 py-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">{t('positions.title')}</h1>
                <p className="text-sm text-white/70">{userPositions.length} {t('pending.total_positions')}</p>
              </div>
              <Button
                onClick={refreshPositions}
                disabled={loadingPositions}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 px-3 py-2"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPositions ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Action Buttons Row */}
            {userPositions.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => claim_all_position_fee_and_reward()}
                  disabled={operationLoading === 'claiming-all'}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  {operationLoading === 'claiming-all' ? (
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : (
                    <Gift className="w-4 h-4 mr-2" />
                  )}
                  {t('positions.harvest')}
                </Button>
                <Button
                  onClick={() => remove_all_position()}
                  disabled={operationLoading === 'removing-all'}
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 px-3 py-2 text-sm disabled:opacity-50"
                >
                  {operationLoading === 'removing-all' ? (
                    <div className="w-4 h-4 border border-red-400/30 border-t-red-400 rounded-full animate-spin mr-2" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  {t('positions.close_all')}
                </Button>
              </div>
            )}
          </div>

          {/* Desktop Header Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('positions.back')}
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">{t('positions.title')}</h1>
                <p className="text-white/70">{t('positions.manage_desc')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-white/70">{t('pending.total_positions')}</div>
                <div className="text-2xl font-bold text-white">{userPositions.length}</div>
              </div>

              <Button
                onClick={refreshPositions}
                disabled={loadingPositions}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 px-3 py-2"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPositions ? 'animate-spin' : ''}`} />
              </Button>

              {/* Action Buttons */}
              {userPositions.length > 0 && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => claim_all_position_fee_and_reward()}
                    disabled={operationLoading === 'claiming-all'}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {operationLoading === 'claiming-all' ? (
                      <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <Gift className="w-4 h-4 mr-2" />
                    )}
                    {t('positions.harvest')}
                  </Button>
                  <Button
                    onClick={() => remove_all_position()}
                    disabled={operationLoading === 'removing-all'}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {operationLoading === 'removing-all' ? (
                      <div className="w-4 h-4 border border-red-400/30 border-t-red-400 rounded-full animate-spin mr-2" />
                    ) : (
                      <X className="w-4 h-4 mr-2" />
                    )}
                    {t('positions.close_all')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {loadingPositions ? (
          <motion.div
            className="glass p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-12 h-12 border-2 border-teal-400/20 border-t-teal-400 rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">{t('positions.loading')}</h3>
            <p className="text-white/70">{t('positions.fetching_desc')}</p>
          </motion.div>
        ) : userPositions.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
            {userPositions.map((position, index) => {
              const positionStatus = getPositionStatus(position);

              return (
                <motion.div
                  key={index}
                  className="glass glass-hover border border-white/10 hover:border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {/* Mobile/Small Screen Layout */}
                  <div className="block md:hidden p-4">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                          {(() => {
                            const dexInfo = getDexInfo('hyperion'); // Currently all positions are from Hyperion
                            return dexInfo.logoUrl ? (
                              <img
                                src={dexInfo.logoUrl}
                                alt={dexInfo.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to text if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null;
                          })()}
                          <span className="text-white font-bold text-xs hidden">H</span>
                        </div>
                        <div>
                          {position.fees?.unclaimed?.length >= 2 ? (
                            <div className="flex items-center gap-1">
                              {position.fees.unclaimed.slice(0, 2).map((fee: any, tokenIndex: number) => {
                                const tokenInfo = findTokenByAddress(fee.token);
                                const symbol = tokenInfo?.symbol || extractTokenSymbol(fee.token);
                                return (
                                  <span key={tokenIndex} className="text-sm font-medium text-white">
                                    {symbol}{tokenIndex === 0 && '/'}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-white">{t('positions.position')} #{index + 1}</span>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${positionStatus.bgColor} ${positionStatus.color} border ${positionStatus.borderColor}`}>
                              {positionStatus.status}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                              {formatFeeTier(position.position.pool.feeTier)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => remove_single_position(position.position.objectId)}
                        disabled={operationLoading === `removing-${position.position.objectId}`}
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 px-2 py-1 h-6 text-xs"
                      >
                        {operationLoading === `removing-${position.position.objectId}` ? (
                          <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </Button>
                    </div>

                    {/* Compact Stats - 2 columns */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-xs text-white/60 mb-1">{t('positions.total_value')}</div>
                        <div className="text-sm font-bold text-white">{formatValue(position.value)}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <div className="text-xs text-white/60 mb-1">{t('common.current_price')}</div>
                        <div className="text-sm font-bold text-white">
                          {(() => {
                            try {
                              const currentPrice = tickToPrice({
                                tick: position.position.pool.currentTick,
                                decimalsRatio: 1
                              });
                              return formatValue(currentPrice);
                            } catch (error) {
                              return position.position.pool.currentTick;
                            }
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Simplified Fees and Rewards */}
                    {(position.fees?.unclaimed?.length > 0 || position.farm?.unclaimed?.length > 0) && (
                      <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-lg p-2">
                        <div className="text-xs text-teal-400 mb-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {t('positions.fees_earned')} & {t('positions.unclaimed_rewards')}
                        </div>
                        <div className="text-xs text-white/80">
                          {position.fees?.unclaimed?.length || 0} fees + {position.farm?.unclaimed?.length || 0} rewards
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop/Large Screen Layout */}
                  <div className="hidden md:block p-6">
                    {/* Position Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center relative overflow-hidden">
                          {(() => {
                            const dexInfo = getDexInfo('hyperion'); // Currently all positions are from Hyperion
                            return dexInfo.logoUrl ? (
                              <img
                                src={dexInfo.logoUrl}
                                alt={dexInfo.name}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  // Fallback to text if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null;
                          })()}
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hidden">
                            <span className="text-blue-600 font-bold text-sm">H</span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {/* Token Pair Display */}
                            {position.fees?.unclaimed?.length >= 2 ? (
                              <div className="flex items-center gap-1">
                                {position.fees.unclaimed.slice(0, 2).map((fee: any, tokenIndex: number) => {
                                  const tokenInfo = findTokenByAddress(fee.token);
                                  const symbol = tokenInfo?.symbol || extractTokenSymbol(fee.token);
                                  return (
                                    <div key={tokenIndex} className="flex items-center">
                                      {tokenInfo?.logoUri ? (
                                        <img
                                          src={tokenInfo.logoUri}
                                          alt={symbol}
                                          className="w-5 h-5 rounded-full"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.nextElementSibling?.classList.remove('hidden');
                                          }}
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-teal-500 to-cyan-500">
                                          {symbol.charAt(0)}
                                        </div>
                                      )}
                                      <span className="text-sm font-medium text-white ml-1">{symbol}</span>
                                      {tokenIndex === 0 && <span className="text-white/60 mx-1">/</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <h3 className="text-lg font-semibold text-white">{t('positions.position')} #{index + 1}</h3>
                            )}
                            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                              Hyperion
                            </span>
                          </div>
                          <p className="text-sm text-white/60">{t('positions.pool')}: {position.position.poolId.slice(0, 8)}...</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full ${positionStatus.bgColor} ${positionStatus.color} border ${positionStatus.borderColor}`}>
                          {positionStatus.status}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${position.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                        <Button
                          onClick={() => remove_single_position(position.position.objectId)}
                          disabled={operationLoading === `removing-${position.position.objectId}`}
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 px-2 py-1 h-6 text-xs disabled:opacity-50"
                        >
                          {operationLoading === `removing-${position.position.objectId}` ? (
                            <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Position Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-3 h-3 text-teal-400" />
                          <span className="text-xs text-white/70">{t('positions.total_value')}</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                          {formatValue(position.value)}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-white/70">{t('pending.fee_tier')}</span>
                        </div>
                        <div className="text-lg font-bold text-white">{formatFeeTier(position.position.pool.feeTier)}</div>
                      </div>
                    </div>

                    {/* Position Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">{t('pending.price_range')}:</span>
                        <span className="text-white font-mono">
                          {(() => {
                            try {
                              // Use default decimals ratio of 1 (assuming same decimals for both tokens)
                              const lowerPrice = tickToPrice({
                                tick: position.position.tickLower,
                                decimalsRatio: 1
                              });
                              const upperPrice = tickToPrice({
                                tick: position.position.tickUpper,
                                decimalsRatio: 1
                              });
                              return `${formatValue(lowerPrice)} - ${formatValue(upperPrice)}`;
                            } catch (error) {
                              return `${position.position.tickLower} - ${position.position.tickUpper}`;
                            }
                          })()}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">{t('common.current_price')}:</span>
                        <span className="text-white font-mono">
                          {(() => {
                            try {
                              const currentPrice = tickToPrice({
                                tick: position.position.pool.currentTick,
                                decimalsRatio: 1
                              });
                              return formatValue(currentPrice);
                            } catch (error) {
                              return position.position.pool.currentTick;
                            }
                          })()}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">{t('positions.pool_fee_rate')}:</span>
                        <span className="text-white font-mono">{position.position.pool.feeRate}</span>
                      </div>
                    </div>

                    {/* Token Ratio Display */}
                    {positionAmounts[position.position.objectId] && position.fees?.unclaimed?.length >= 2 && (
                      <div className="bg-white/5 rounded-lg p-3 mb-4">
                        <TokenRatio
                          tokenA={{
                            coinType: position.fees.unclaimed[0].token,
                            amount: positionAmounts[position.position.objectId].tokenA,
                            decimals: position.fees.unclaimed[0].decimals || 8
                          }}
                          tokenB={{
                            coinType: position.fees.unclaimed[1].token,
                            amount: positionAmounts[position.position.objectId].tokenB,
                            decimals: position.fees.unclaimed[1].decimals || 8
                          }}
                          t={t}
                        />
                      </div>
                    )}

                    {/* Unclaimed Fees */}
                    {position.fees?.unclaimed?.length > 0 && (
                      <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-3 h-3 text-teal-400" />
                          <span className="text-xs font-medium text-teal-400">{t('positions.fees_earned')}</span>
                        </div>
                        <div className="space-y-2">
                          {position.fees.unclaimed.map((fee: any, feeIndex: number) => (
                            <div key={feeIndex} className="bg-white/5 rounded-md p-2">
                              <TokenDisplay
                                coinType={fee.token}
                                amount={fee.amount || 0}
                                decimals={fee.decimals || 8}
                                className="w-full text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unclaimed Farm Rewards */}
                    {position.farm?.unclaimed?.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-3 h-3 text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">{t('positions.unclaimed_rewards')}</span>
                        </div>
                        <div className="space-y-2">
                          {position.farm.unclaimed.map((reward: any, rewardIndex: number) => (
                            <div key={rewardIndex} className="bg-white/5 rounded-md p-2">
                              <TokenDisplay
                                coinType={reward.token}
                                amount={reward.amount || 0}
                                decimals={reward.decimals || 8}
                                className="w-full text-xs"
                                amountColor="text-purple-400"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Position Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <Calendar className="w-3 h-3" />
                        <span>{t('positions.created')} {new Date(position.position.createdAt).toLocaleDateString()}</span>
                      </div>

                      <a
                        href={getExplorerUrl(position.position.objectId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors duration-200"
                      >
                        <span>{t('positions.view_details')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            className="glass p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="w-10 h-10 text-white/30" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">{t('positions.no_positions')}</h3>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              {t('positions.no_positions_desc')}
            </p>
            <Button
              onClick={onBack}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {t('positions.add_first')}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}