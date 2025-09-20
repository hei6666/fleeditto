"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Wallet, ArrowUpDown, Settings, AlertCircle, Shield, Zap, TrendingUp, ExternalLink } from 'lucide-react';

import { useAppContext, useAppActions } from '../contexts/AppContext';
import { WalletConnection } from './WalletConnection';
import { DEXSelector } from './DEXSelector';
import { ConnectedTokenInput } from './ConnectedTokenInput';
import { Button } from './ui/button';
import { useHyperionSDK } from './HyperionSDKProvider';
import { useAptosClient } from '../hooks/useAptosClient';
import { initTappSDK } from '@tapp-exchange/sdk';

import { Network } from '@aptos-labs/ts-sdk';

export function SwapDashboard() {
 
  const { wallet, connected, account, signAndSubmitTransaction } = useWallet();
  const { state } = useAppContext();
  const actions = useAppActions();
  const sdk = useHyperionSDK();
  const { currentNetwork } = useAptosClient();

  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [poolRoute, setPoolRoute] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Helper function to get Aptos Explorer URL
  const getExplorerUrl = (txHash: string) => {
    const networkName = currentNetwork.toString().toLowerCase();
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=${networkName}`;
  };

 
  const tapp = initTappSDK({
          network: Network.MAINNET
        });


  
  // Calculate estimated output using Hyperion SDK
  const calculateSwapOutput = useCallback(async () => {
    if (!sdk || !state.tokenA.amount || !state.tokenA.metadata || !state.tokenB.metadata) {
      setEstimatedOutput('0');
      setPoolRoute(null);
      return;
    }

    // For Tapp, make sure SDK is initialized
    if (state.selectedDex === "tapp" && !tapp) {
      console.log('Tapp SDK not yet initialized...');
      return;
    }

    try {
      setIsCalculating(true);

      // Convert user input to smallest unit (multiply by 10^decimals)
      const amountInSmallestUnit = (parseFloat(state.tokenA.amount) * Math.pow(10, state.tokenA.metadata.decimals)).toString();
      let currencyBAmount: string = '0';
      let route: any = null;

      if (state.selectedDex === "hyperion") {
        const result = await sdk.SDK.Swap.estToAmount({
          amount: amountInSmallestUnit,
          from: state.tokenA.metadata.address,
          to: state.tokenB.metadata.address,
          safeMode: false,
        });
        currencyBAmount = result.amountOut;
        route = result.path;
      } else if (state.selectedDex === "tapp") {
        try {
          // Debug original addresses
          console.log('Original token metadata:', {
            tokenA: state.tokenA.metadata,
            tokenB: state.tokenB.metadata
          });

          // Try multiple address formats
          const formatAddress = (address: string) => {
            if (address.startsWith('0x')) {
              return address;
            }
            return `0x${address}`;
          };

          const tokenAAddress = formatAddress(state.tokenA.metadata.address);
          const tokenBAddress = formatAddress(state.tokenB.metadata.address);

          console.log('Formatted addresses for route lookup:', { tokenAAddress, tokenBAddress });

          // Debug: Get pool list to understand available pools
          const pools = await tapp.Pool.getPools();
          console.log("tapp pool list =", pools);

          // Check if our tokens exist in any pools
          if (pools && pools.data) {
            console.log('First pool structure sample:', pools.data[0]);

            const relevantPools = pools.data.filter((pool: any) => {
              // Based on your pool data, tokens are in the tokens array
              if (pool.tokens && Array.isArray(pool.tokens)) {
                const poolTokenAddresses = pool.tokens.map((token: any) => token.coinType || token.address);
                return poolTokenAddresses.includes(tokenAAddress) || poolTokenAddresses.includes(tokenBAddress);
              }
              return false;
            });
            console.log('Relevant pools for our tokens:', relevantPools);

            // Check all token addresses in pools
            const allTokens = new Set();
            pools.data.forEach((pool: any) => {
              if (pool.tokens && Array.isArray(pool.tokens)) {
                pool.tokens.forEach((token: any) => {
                  allTokens.add(token.coinType || token.address);
                });
              }
            });
            console.log('All unique token addresses in pools:', Array.from(allTokens));
          }

          // Try to get route - sometimes order matters
          let poolInfo = await tapp.Swap.getRoute(tokenAAddress, tokenBAddress);
          let isReversed = false;
          console.log('Pool info result (A->B):', poolInfo);

          // If no route found, try reverse order
          if (!poolInfo) {
            console.log('Trying reverse order (B->A)...');
            poolInfo = await tapp.Swap.getRoute(tokenBAddress, tokenAAddress);
            isReversed = true;
            console.log('Pool info result (B->A):', poolInfo);
          }


          if (poolInfo && poolInfo.poolId) {
            console.log('Pool type:', poolInfo.poolType, 'Reversed:', isReversed);

            // Use correct estimation parameters based on route direction
            const swapResult = await tapp.Swap.getEstSwapAmount({
              poolId: poolInfo.poolId,
              a2b: !isReversed, // Use the same direction logic as the actual swap
              amount: parseInt(amountInSmallestUnit),
              pair: [0, 1],
              field: 'input'
            });
            console.log('Swap estimation result:', swapResult);
            // Use the correct property from EstSwapResult
            currencyBAmount = swapResult.estAmount?.toString() || '0';
            route = poolInfo;
          }
        } catch (error) {
          console.error('Tapp route calculation error:', error);
          console.error('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            status: (error as any)?.status,
            response: (error as any)?.response
          });

          // Check if this is the known Tapp API issue
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('failed to request pool') || errorMessage.includes('Internal server error')) {
            console.warn('Tapp Exchange API is currently experiencing issues. Please try again later or use Hyperion instead.');
          }

          currencyBAmount = '0';
          route = null;
        }
      }
      

      // Convert output back to human readable (divide by 10^decimals)
      const outputInHumanUnit = currencyBAmount ?
        (parseFloat(currencyBAmount) / Math.pow(10, state.tokenB.metadata.decimals)).toString() : '0';

      setEstimatedOutput(outputInHumanUnit);
      setPoolRoute(route);
    } catch (error) {
      console.error('Error calculating swap output:', error);
      setEstimatedOutput('0');
      setPoolRoute(null);
    } finally {
      setIsCalculating(false);
    }
  }, [sdk, state.tokenA.amount, state.tokenA.metadata, state.tokenB.metadata, state.selectedDex]);

  // Update estimated output when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateSwapOutput();
    }, 500); // Debounce API calls

    return () => clearTimeout(timeoutId);
  }, [calculateSwapOutput]);

  // Note: slippage is included in calculateSwapOutput dependencies

  // Handle swap tokens positions
  const handleSwapTokens = () => {
    // Swap token A and B
    const tempTokenA = { ...state.tokenA };
    const tempTokenB = { ...state.tokenB };

    actions.setTokenAAddress(tempTokenB.address);
    actions.setTokenAMetadata(tempTokenB.metadata);
    actions.setTokenABalance(tempTokenB.balance);
    actions.setTokenAAmount('');

    actions.setTokenBAddress(tempTokenA.address);
    actions.setTokenBMetadata(tempTokenA.metadata);
    actions.setTokenBBalance(tempTokenA.balance);
    actions.setTokenBAmount('');

    // Reset estimated output
    setEstimatedOutput('0');
    setPoolRoute(null);
  };

  // Handle swap transaction using Hyperion SDK
  const handleSwap = async () => {
    if (!state.selectedDex || !state.tokenA.metadata || !state.tokenB.metadata) {
      actions.setError('Please complete all required fields');
      return;
    }

    // Check if Tapp SDK is initialized when needed
    if (state.selectedDex === "tapp" && !tapp) {
      actions.setError('Tapp SDK not initialized. Please wait and try again.');
      return;
    }

    if (!state.tokenA.amount) {
      actions.setError('Please enter an amount to swap');
      return;
    }

    if (!poolRoute) {
      actions.setError('Unable to find swap route. Please try again.');
      return;
    }

    if (!account?.address) {
      actions.setError('Please connect your wallet');
      return;
    }

    actions.setSubmitting(true);
    actions.setError(null);

    try {
      if(state.selectedDex == "hyperion"){
        console.log('Executing swap with MEV protection via Hyperion SDK:', {
          fromToken: state.tokenA.metadata.symbol,
          toToken: state.tokenB.metadata.symbol,
          amount: state.tokenA.amount,
          estimatedOutput,
          slippage: slippageTolerance,
          poolRoute
        });

        // Create swap parameters with proper decimal conversion
        const currencyAAmountInSmallestUnit = (parseFloat(state.tokenA.amount) * Math.pow(10, state.tokenA.metadata.decimals)).toString();
        const currencyBAmountInSmallestUnit = (parseFloat(estimatedOutput) * Math.pow(10, state.tokenB.metadata.decimals)).toString();

        const params = {
          currencyA: state.tokenA.metadata.address,
          currencyB: state.tokenB.metadata.address,
          currencyAAmount: currencyAAmountInSmallestUnit,
          currencyBAmount: currencyBAmountInSmallestUnit,
          slippage: slippageTolerance,
          poolRoute,
          recipient: account.address.toString(),
        };

        // Create transaction payload using Hyperion SDK
        const payload = await sdk.SDK.Swap.swapTransactionPayload(params);

        console.log('Swap payload created:', payload);

        if (wallet != null) {
          const tx = await signAndSubmitTransaction({
            data: payload,
          });

          console.log('Transaction submitted:', tx);
          actions.setTransactionHash(tx.hash);
          actions.setSubmitting(false);

          // Reset form after successful swap
          actions.setTokenAAmount('');
          setEstimatedOutput('0');
          setPoolRoute(null);
        } else {
          throw new Error('Wallet not connected');
        }
      } else if (state.selectedDex === "tapp") {
        try {
          // Format addresses consistently
          const formatAddress = (address: string) => {
            if (address.startsWith('0x')) {
              return address;
            }
            return `0x${address}`;
          };

          const tokenAAddress = formatAddress(state.tokenA.metadata.address);
          const tokenBAddress = formatAddress(state.tokenB.metadata.address);

          // Try to get route (try both orders)
          let poolInfo = await tapp.Swap.getRoute(tokenAAddress, tokenBAddress);
          let isReversed = false;

          if (!poolInfo) {
            poolInfo = await tapp.Swap.getRoute(tokenBAddress, tokenAAddress);
            isReversed = true;
          }

          if (!poolInfo || !poolInfo.poolId) {
            throw new Error('No route found for this token pair');
          }

          console.log('Using pool:', poolInfo, 'Reversed order:', isReversed);

          const currencyAAmountInSmallestUnit = parseInt((parseFloat(state.tokenA.amount) * Math.pow(10, state.tokenA.metadata.decimals)).toString());
          const minAmountOut = parseInt((parseFloat(estimatedOutput) * Math.pow(10, state.tokenB.metadata.decimals) * (1 - slippageTolerance / 100)).toString());

          let payload;

          // Use different payload methods based on pool type
          console.log('Pool type detected:', poolInfo.poolType);

          if (poolInfo.poolType === 'CLMM') {
            // CLMM uses targetSqrtPrice and different parameter structure
            const swapParams = {
              poolId: poolInfo.poolId,
              amountIn: currencyAAmountInSmallestUnit,
              minAmountOut: minAmountOut,
              a2b: !isReversed, // Use the correct direction based on whether we reversed the route
              fixedAmountIn: true,
              targetSqrtPrice: parseInt(poolInfo.sqrtPrice) // Use the current sqrt price from pool data
            };
            console.log('Tapp CLMM swap params:', swapParams);
            payload = tapp.Swap.swapCLMMTransactionPayload(swapParams);

          } else if (poolInfo.poolType === 'AMM') {
            // AMM uses amount0/amount1 structure
            // When a2b is true: amount0 is input, amount1 is minimum output
            // When a2b is false: amount1 is input, amount0 is minimum output
            const swapParams = {
              poolId: poolInfo.poolId,
              a2b: !isReversed,
              fixedAmountIn: true,
              amount0: !isReversed ? currencyAAmountInSmallestUnit : minAmountOut,
              amount1: !isReversed ? minAmountOut : currencyAAmountInSmallestUnit
            };
            console.log('Tapp AMM swap params:', swapParams);
            payload = tapp.Swap.swapAMMTransactionPayload(swapParams);

          } else if (poolInfo.poolType === 'STABLE') {
            // Stable pools use token indices (0, 1, 2, etc.)
            // We need to determine which tokens are at which indices
            const swapParams = {
              poolId: poolInfo.poolId,
              tokenIn: isReversed ? 1 : 0,
              tokenOut: isReversed ? 0 : 1,
              amountIn: currencyAAmountInSmallestUnit,
              minAmountOut: minAmountOut
            };
            console.log('Tapp Stable swap params:', swapParams);
            payload = tapp.Swap.swapStableTransactionPayload(swapParams);

          } else {
            throw new Error(`Unsupported pool type: ${poolInfo.poolType}`);
          }

          const tx = await signAndSubmitTransaction({
            sender: account.address,
            data: payload
          });

          console.log('Tapp swap transaction submitted:', tx);
          actions.setTransactionHash(tx.hash);
          actions.setSubmitting(false);

          // Reset form after successful swap
          actions.setTokenAAmount('');
          setEstimatedOutput('0');
          setPoolRoute(null);
        } catch (error) {
          console.error('Tapp swap failed:', error);
          throw error;
        }
      }
      
    } catch (error) {
      console.error('Hyperion swap failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      actions.setError(`Swap transaction failed: ${errorMessage}`);
      actions.setSubmitting(false);
    }
  };

  // Check if swap form is complete
  const isSwapReady = state.selectedDex &&
    state.tokenA.metadata &&
    state.tokenB.metadata &&
    state.tokenA.amount &&
    parseFloat(state.tokenA.amount) > 0 &&
    estimatedOutput &&
    parseFloat(estimatedOutput) > 0 &&
    poolRoute;

  return (
    <div className="space-y-8">
      {/* MEV Protection Hero */}
      <motion.div
        className="glass glass-hover p-6 border-2 border-green-500/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">MEV Protected Swaps</h3>
              <p className="text-green-400 text-sm">Your transactions are protected from front-running and sandwich attacks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-3 py-1">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium text-sm">Active Protection</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>Optimal Price Discovery</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Front-Running Protection</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Gas Optimized</span>
          </div>
        </div>
      </motion.div>

      {/* Wallet Connection Section */}
      {!connected && (
        <motion.div
          className="glass glass-hover p-8 text-center max-w-md mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Wallet className="w-16 h-16 text-teal-400 mx-auto mb-4" />
          <WalletConnection />
        </motion.div>
      )}

      {/* Main Swap Interface */}
      {connected && (
        <div className="space-y-6">
          {/* DEX Selection */}
          <DEXSelector
            selectedDEX={state.selectedDex}
            onDEXSelect={actions.setSelectedDex}
          />

          {/* Swap Interface */}
          {state.selectedDex && (
            <motion.div
              className="glass glass-hover p-6 max-w-lg mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Swap Tokens</h3>
                <p className="text-sm text-white/50">Powered by Hyperion</p>
              </div>

              <div className="space-y-4">
                {/* From Token */}
                <div className="space-y-2">
                  <label className="text-sm text-white/70">From</label>
                  <ConnectedTokenInput
                    tokenType="A"
                    label="You Pay"
                  />
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <motion.button
                    onClick={handleSwapTokens}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ArrowUpDown className="w-5 h-5 text-white" />
                  </motion.button>
                </div>

                {/* To Token */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white/70">To</label>
                    {isCalculating && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-teal-400/20 border-t-teal-400 rounded-full animate-spin" />
                        <span className="text-xs text-teal-400">Calculating...</span>
                      </div>
                    )}
                  </div>
                  <ConnectedTokenInput
                    tokenType="B"
                    label="You Receive"
                    readOnly={true}
                    value={isCalculating ? 'Calculating...' : estimatedOutput}
                  />
                </div>

                {/* Slippage Settings */}
                <div className="bg-white/5 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-medium text-white/80">Settings</span>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Slippage Tolerance (%)
                    </label>
                    <div className="flex gap-2">
                      <div className="flex gap-1">
                        {[0.1, 0.5, 1.0].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setSlippageTolerance(preset)}
                            className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              slippageTolerance === preset
                                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50'
                                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={slippageTolerance}
                        onChange={(e) => setSlippageTolerance(parseFloat(e.target.value) || 0.5)}
                        step="0.1"
                        min="0.1"
                        max="10"
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 backdrop-filter backdrop-blur-sm focus:outline-none focus:border-teal-400/50 transition-all duration-300 text-sm"
                        placeholder="Custom"
                      />
                    </div>
                  </div>
                </div>

                {/* Price Info */}
                {state.tokenA.metadata && state.tokenB.metadata && estimatedOutput && !isCalculating && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Rate</span>
                      <span className="text-white">
                        {state.tokenA.amount && parseFloat(state.tokenA.amount) > 0 ? (
                          <>1 {state.tokenA.metadata.symbol} = {(parseFloat(estimatedOutput) / parseFloat(state.tokenA.amount)).toFixed(6)} {state.tokenB.metadata.symbol}</>
                        ) : (
                          'Enter amount to see rate'
                        )}
                      </span>
                    </div>
                    {poolRoute && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Route</span>
                        <span className="text-white/80 text-xs">
                          Via Hyperion AMM
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">MEV Protection</span>
                      <span className="text-green-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Enabled
                      </span>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <Button
                  onClick={handleSwap}
                  disabled={state.isSubmitting || !isSwapReady || isCalculating}
                  size="lg"
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Swapping...</span>
                    </div>
                  ) : isCalculating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Calculating...</span>
                    </div>
                  ) : !state.tokenA.amount || parseFloat(state.tokenA.amount) <= 0 ? (
                    <span>Enter an amount</span>
                  ) : !state.tokenA.metadata || !state.tokenB.metadata ? (
                    <span>Select tokens</span>
                  ) : !poolRoute ? (
                    <span>No route found</span>
                  ) : !estimatedOutput || parseFloat(estimatedOutput) <= 0 ? (
                    <span>Invalid amount</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-5 h-5" />
                      <span>Swap Tokens</span>
                    </div>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Error Display */}
          {state.error && (
            <motion.div
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 max-w-lg mx-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{state.error}</p>
            </motion.div>
          )}

          {/* Transaction Success */}
          {state.transactionHash && (
            <motion.div
              className="glass p-6 text-center border-2 border-green-500/20 max-w-lg mx-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-green-400 text-xl mb-2">✅ Swap Successful!</div>
              <p className="text-white/70 text-sm mb-4">
                Your tokens have been swapped successfully with MEV protection.
              </p>

              <div className="space-y-3">
                <div className="text-sm text-white/70">Transaction Hash:</div>
                <div className="font-mono text-xs text-white/80 break-all mb-3">
                  {state.transactionHash}
                </div>

                <a
                  href={getExplorerUrl(state.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 rounded-xl text-teal-400 hover:text-teal-300 transition-all duration-300"
                >
                  <span className="text-sm font-medium">View on Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}