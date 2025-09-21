"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Wallet, Send, Settings, AlertCircle, Plus, ExternalLink } from 'lucide-react';

import { useAppContext, useAppActions, useAvailableBalances } from '../contexts/AppContext';
import { getDexAdapter } from '../lib/dex_adapters/factory';
import { HyperionAdapter } from '../lib/dex_adapters/hyperion';
import { useAptosClient } from '../hooks/useAptosClient';

import { WalletConnection } from './WalletConnection';
import { DEXSelector } from './DEXSelector';
import { FeeTierSelector } from './FeeTierSelector';
import { PoolStatusCard } from './PoolStatusCard';
import { ConnectedTokenInput } from './ConnectedTokenInput';
import { LiquidityChart } from './LiquidityChart';
import { PriceRangeSelector } from './PriceRangeSelector';
import { PendingPositions } from './PendingPositions';
import { UserPositions } from './UserPositions';
import { Button } from './ui/button';
import { useHyperionSDK ,} from './HyperionSDKProvider';
import {priceToTick,tickToPrice} from "@hyperionxyz/sdk";
import { useLanguage } from '../contexts/LanguageContext';
export function LiquidityDashboard() {
  const { account,connected,signAndSubmitTransaction } = useWallet();
  const { state } = useAppContext();
  const actions = useAppActions();
  const { aptos, currentNetwork } = useAptosClient();
  const sdk = useHyperionSDK();
  const { checkSufficientBalance } = useAvailableBalances();
  const { t } = useLanguage();

  // Helper function to get Aptos Explorer URL
  const getExplorerUrl = (txHash: string) => {
    const networkName = currentNetwork.toString().toLowerCase();
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=${networkName}`;
  };

  // APR fetching function
  const fetchAPRData = async (minPrice: number, maxPrice: number) => {
    console.log('fetchAPRData called with:', { minPrice, maxPrice });

    if (!state.tokenA.metadata || !state.tokenB.metadata || (state.feeTier === null || state.feeTier === undefined)) {
      console.log('fetchAPRData early return - missing metadata or feeTier:', {
        tokenA: !!state.tokenA.metadata,
        tokenB: !!state.tokenB.metadata,
        feeTier: state.feeTier
      });
      return;
    }

    try {
      console.log('Starting APR fetch...');
      setIsLoadingAPR(true);
      setAprError(null);

      // Calculate decimals ratio for priceToTick
      const tokenADecimals = state.tokenA.metadata.decimals;
      const tokenBDecimals = state.tokenB.metadata.decimals;
      const decimalsRatio = Math.pow(10, tokenADecimals - tokenBDecimals);

      // Convert prices to ticks
      const minTickResult = priceToTick({
        price: minPrice,
        feeTierIndex: state.feeTier,
        decimalsRatio: decimalsRatio
      });

      const maxTickResult = priceToTick({
        price: maxPrice,
        feeTierIndex: state.feeTier,
        decimalsRatio: decimalsRatio
      });

      if (!minTickResult || !maxTickResult) {
        throw new Error('Failed to convert prices to ticks for APR calculation');
      }

      let minTick = Number(minTickResult);
      let maxTick = Number(maxTickResult);

      // If tick is negative, add 2^32 to get correct tick value
      // if (minTick < 0) {
      //   minTick += Math.pow(2, 32);
      // }
      // if (maxTick < 0) {
      //   maxTick += Math.pow(2, 32);
      // }

      console.log("apr tick",minTick,maxTick)

      // Get pool ID - need to fetch from SDK or construct it
      const pool = await sdk.SDK.Pool.getPoolByTokenPairAndFeeTier({
        token1: state.tokenA.metadata.address,
        token2: state.tokenB.metadata.address,
        feeTier: state.feeTier
      });

      if (!pool?.poolId) {
        throw new Error('Pool not found for APR calculation');
      }

      // Use fixed amounts (1 token) for APR calculation, since APR is rate-independent
      const token1AmountWithDecimals = Math.pow(10, tokenADecimals).toString(); // 1 token A
      const token2AmountWithDecimals = Math.pow(10, tokenBDecimals).toString(); // 1 token B

      // Fetch APR data from Hyperion GraphQL API
      const response = await fetch("https://api.hyperion.xyz/v1/graphql", {
        method: "POST",
        headers: {
          "accept": "application/graphql-response+json, application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query fetchPositionAPR(
              $poolId: String = ""
              $tickLower: Float = 1.5
              $tickUpper: Float = 1.5
              $token1Amount: String = ""
              $token2Amount: String = ""
            ) {
              api {
                getPositionAPR(
                  poolId: $poolId
                  tickLower: $tickLower
                  tickUpper: $tickUpper
                  token1Amount: $token1Amount
                  token2Amount: $token2Amount
                ) {
                  dailyVolume
                  farmAPR
                  feeAPR
                  lpAmount
                  poolActiveLPAmountALL
                  poolActiveLPAmountExclude
                  value
                }
              }
            }
          `,
          variables: {
            tickLower: minTick,
            tickUpper: maxTick,
            poolId: pool.poolId,
            token1Amount: token1AmountWithDecimals,
            token2Amount: token2AmountWithDecimals
          },
          operationName: "fetchPositionAPR"
        })
      });
      console.log("i got this apr",response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL error');
      }

      if (result.data?.api?.getPositionAPR) {
        console.log('APR data received:', result.data.api.getPositionAPR);
        setAprData(result.data.api.getPositionAPR);
      } else {
        throw new Error('No APR data returned from API');
      }

    } catch (error) {
      console.error('Error fetching APR data:', error);
      setAprError(error instanceof Error ? error.message : 'Failed to fetch APR data');
      setAprData(null);
    } finally {
      setIsLoadingAPR(false);
    }
  };

  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [showPositions, setShowPositions] = useState(false);
  const checkedPoolsRef = useRef(new Set<string>());

  // Liquidity input states
  const [selectedInputToken, setSelectedInputToken] = useState<'A' | 'B'>('A');
  const [inputAmount, setInputAmount] = useState('');
  const [calculatedAmount, setCalculatedAmount] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [liquidity_amount, set_liquidity_amount]=useState<number>(0);
  const [poolCurrentTick, setPoolCurrentTick] = useState<number | null>(null);
  const [poolCurrentPrice, setPoolCurrentPrice] = useState<number | null>(null);
  const [pool_id,set_pool_id]=useState<string>("");

  // APR state management
  const [aprData, setAprData] = useState<{
    dailyVolume: string;
    farmAPR: string;
    feeAPR: string;
    lpAmount: string;
    poolActiveLPAmountALL: string;
    poolActiveLPAmountExclude: string;
    value: string;
  } | null>(null);
  const [isLoadingAPR, setIsLoadingAPR] = useState(false);
  const [aprError, setAprError] = useState<string | null>(null);

  // Clear calculation when selected token changes
  useEffect(() => {
    setInputAmount('');
    setCalculatedAmount('');
    setCalculationError(null);
  }, [selectedInputToken]);

  // Fetch pool data to get current tick when tokens and fee tier are selected
  useEffect(() => {
    const fetchPoolData = async () => {
      if (state.tokenA.metadata?.address &&
          state.tokenB.metadata?.address &&
          state.feeTier !== null &&
          state.feeTier !== undefined &&
          state.selectedDex === 'hyperion') {

        try {
          const pool = await sdk.SDK.Pool.getPoolByTokenPairAndFeeTier({
            token1: state.tokenA.metadata.address,
            token2: state.tokenB.metadata.address,
            feeTier: state.feeTier
          });

          if (pool && pool.currentTick !== undefined) {
            // Convert BigNumber to number
            const tickNumber = typeof pool.currentTick === 'object' ? Number(pool.currentTick.toString()) : pool.currentTick;
            setPoolCurrentTick(tickNumber);

            // Calculate current price from pool's current tick
            const current_price = tickToPrice({
              tick: pool.currentTick,
              decimalsRatio: Math.pow(10, state.tokenA.metadata.decimals - state.tokenB.metadata.decimals)
            });

            const currentPriceNumber = Number(current_price);
            setPoolCurrentPrice(currentPriceNumber);

            // Update global current price with pool's real price
            actions.setCurrentPrice(currentPriceNumber);
            set_pool_id(pool.poolId);
            console.log('Pool current tick fetched:', tickNumber, 'Current price:', currentPriceNumber, 'Pool ID:', pool.poolId);
            console.log('Updated global current price to:', currentPriceNumber);
          } else {
            setPoolCurrentTick(null);
            setPoolCurrentPrice(null);
            console.log('Pool not found or no current tick available');
          }
        } catch (error) {
          console.error('Error fetching pool data:', error);
          setPoolCurrentTick(null);
          setPoolCurrentPrice(null);
        }

      } else {
        setPoolCurrentTick(null);
        setPoolCurrentPrice(null);
      }
    };

    fetchPoolData();
  }, [state.tokenA.metadata?.address, state.tokenB.metadata?.address, state.feeTier, state.selectedDex, sdk]);

  // Listen to token amount changes and trigger calculation
  useEffect(() => {
    const primaryAmount = selectedInputToken === 'A' ? state.tokenA.amount : state.tokenB.amount;

    if (primaryAmount && primaryAmount !== inputAmount) {
      setInputAmount(primaryAmount);
      handleInputAmountChange(primaryAmount);
    }
  }, [state.tokenA.amount, state.tokenB.amount, selectedInputToken]);

  // Listen to price range changes and clear calculation to trigger recalculation
  useEffect(() => {
    // When price range changes, clear the calculated amount to trigger recalculation
    if (calculatedAmount) {
      setCalculatedAmount('');
      setCalculationError(null);

      // If we have an input amount, automatically recalculate
      if (inputAmount && parseFloat(inputAmount) > 0) {
        const timeoutId = setTimeout(() => {
          if (canCalculate()) {
            handleInputAmountChange(inputAmount);
          }
        }, 100); // Small delay to avoid rapid recalculations

        return () => clearTimeout(timeoutId);
      }
    }
  }, [state.minPrice, state.maxPrice]);

  // APR fetching effect - trigger when all required data is available
  useEffect(() => {
    const shouldFetchAPR = (
      state.tokenA.metadata &&
      state.tokenB.metadata &&
      state.minPrice > 0 &&
      state.maxPrice > 0 &&
      state.minPrice < state.maxPrice &&
      state.feeTier !== null &&
      state.feeTier !== undefined &&
      state.selectedDex === 'hyperion' &&
      state.poolState === 'exists' // Only fetch APR for existing pools
    );

    console.log('APR fetch conditions:', {
      hasTokenA: !!state.tokenA.metadata,
      hasTokenB: !!state.tokenB.metadata,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      validPriceRange: state.minPrice > 0 && state.maxPrice > 0 && state.minPrice < state.maxPrice,
      hasFeeTier: state.feeTier !== null && state.feeTier !== undefined,
      selectedDex: state.selectedDex,
      poolState: state.poolState,
      shouldFetchAPR
    });

    if (shouldFetchAPR) {
      console.log('Fetching APR with data:', {
        minPrice: state.minPrice,
        maxPrice: state.maxPrice
      });

      // Add a small delay to avoid too frequent API calls
      const timeoutId = setTimeout(() => {
        fetchAPRData(state.minPrice, state.maxPrice);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      // Clear APR data if conditions are not met
      setAprData(null);
      setAprError(null);
      setIsLoadingAPR(false);
    }
  }, [
    state.tokenA.metadata,
    state.tokenB.metadata,
    state.minPrice,
    state.maxPrice,
    state.feeTier,
    state.selectedDex,
    state.poolState
  ]);

  // Price fetching is now handled in AppContext automatically

  // Create a unique key for the current pool configuration
  const poolKey = useMemo(() => {
    if (state.tokenA.metadata?.address &&
        state.tokenB.metadata?.address &&
        (state.feeTier !== null && state.feeTier !== undefined) &&
        state.selectedDex === 'hyperion') {
      return `${state.tokenA.metadata.address}-${state.tokenB.metadata.address}-${state.feeTier}-${currentNetwork}`;
    }
    return null;
  }, [state.tokenA.metadata?.address, state.tokenB.metadata?.address, state.feeTier, state.selectedDex, currentNetwork]);

  const getRequiredLiquidity = async (inputToken: 'A' | 'B', inputAmount: string) => {
    // Check each parameter individually for better error messages
    if (!state.tokenA.metadata) {
      throw new Error('Token A metadata not loaded. Please select a valid token A address.');
    }
    if (!state.tokenB.metadata) {
      throw new Error('Token B metadata not loaded. Please select a valid token B address.');
    }
    if (!state.minPrice || state.minPrice <= 0) {
      throw new Error('Min price not set. Please configure the price range.');
    }
    if (!state.maxPrice || state.maxPrice <= 0) {
      throw new Error('Max price not set. Please configure the price range.');
    }
    if (!state.currentPrice || state.currentPrice <= 0) {
      throw new Error('Current price not available. Please wait for price to load.');
    }
    if (state.feeTier === null || state.feeTier === undefined) {
      throw new Error('Fee tier not selected. Please select a fee tier.');
    }

    try {
      const is_sorted_response = await sdk.SDK.AptosClient.view({
        payload:{
          function:"0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::utils::is_sorted",
          functionArguments:[state.tokenA.metadata.address, state.tokenB.metadata.address]
        }
      });
      const is_sorted = Boolean(is_sorted_response[0])

      // Calculate decimals ratio for priceToTick
      const tokenADecimals = state.tokenA.metadata.decimals;
      const tokenBDecimals = state.tokenB.metadata.decimals;
      const decimalsRatio = Math.pow(10, tokenADecimals - tokenBDecimals);

      // Convert prices to ticks using priceToTick
      const minTickResult = priceToTick({
        price: state.minPrice,
        feeTierIndex: state.feeTier,
        decimalsRatio: decimalsRatio
      });

      const maxTickResult = priceToTick({
        price: state.maxPrice,
        feeTierIndex: state.feeTier,
        decimalsRatio: decimalsRatio
      });

      // Use pool's current tick if available, otherwise calculate from price
      let currentTick: number;
      if (poolCurrentTick !== null) {
        currentTick = poolCurrentTick;
        console.log('Using pool current tick:', currentTick);
      } else {
        const currentTickResult = priceToTick({
          price: state.currentPrice.toFixed(5),
          feeTierIndex: state.feeTier,
          decimalsRatio: decimalsRatio
        });

        if (!currentTickResult) {
          throw new Error('Failed to convert current price to tick');
        }
        
        currentTick = Number(currentTickResult);

        // If current tick is negative, add 2^32 to get correct tick value
        if (currentTick < 0) {
          currentTick += Math.pow(2, 32);
        }

        console.log('Using calculated current tick:', currentTick);
      }

      // Check for null values
      if (!minTickResult || !maxTickResult) {
        throw new Error('Failed to convert prices to ticks');
      }

      let minTick = Number(minTickResult);
      let maxTick = Number(maxTickResult);

      // If tick is negative, add 2^32 to get correct tick value
      if (minTick < 0) {
        minTick += Math.pow(2, 32);
      }
      if (maxTick < 0) {
        maxTick += Math.pow(2, 32);
      }

      console.log('Price to Tick conversion:', {
        minPrice: state.minPrice,
        maxPrice: state.maxPrice,
        currentPrice: state.currentPrice,
        minTick,
        maxTick,
        currentTick,
        feeTier: state.feeTier,
        decimalsRatio,
        input_amount:inputToken === 'A'?(parseFloat(inputAmount)*Math.pow(10,state.tokenA.metadata.decimals)).toFixed(0).toString():(parseFloat(inputAmount)*Math.pow(10,state.tokenB.metadata.decimals)).toFixed(0).toString()
      });

      // Use Hyperion SDK to calculate required liquidity
      let requiredAmount: string;

      if (inputToken === 'A') {
        if (is_sorted) {
          // User inputs A (token0), calculate required B amount (token1)
          const result = await sdk.SDK.Pool.estCurrencyBAmountFromA({
            currencyA: state.tokenA.metadata.address,
            currencyB: state.tokenB.metadata.address,
            feeTierIndex: state.feeTier,
            tickLower: minTick.toString(),
            tickUpper: maxTick.toString(),
            currentPriceTick: currentTick.toString(),
            currencyAAmount: (parseFloat(inputAmount)*Math.pow(10,state.tokenA.metadata.decimals)).toFixed(0).toString()
          });

          if (!result) {
            throw new Error('Failed to calculate required currency B amount');
          }
          console.log("i got this result",result)
          set_liquidity_amount(Number(result[0]))
          requiredAmount = (parseFloat(String(result[1]))/Math.pow(10,state.tokenB.metadata.decimals)).toFixed(3).toString();
          
        } else {
          // User inputs A but A is token1, so use estCurrencyAAmountFromB
          const result = await sdk.SDK.Pool.estCurrencyAAmountFromB({
            currencyA: state.tokenB.metadata.address,
            currencyB: state.tokenA.metadata.address,
            feeTierIndex: state.feeTier,
            tickLower: minTick.toString(),
            tickUpper: maxTick.toString(),
            currentPriceTick: currentTick.toString(),
            currencyBAmount: (parseFloat(inputAmount)*Math.pow(10,state.tokenA.metadata.decimals)).toFixed(0).toString()
          });

          if (!result) {
            throw new Error('Failed to calculate required currency amount');
          }
          set_liquidity_amount(Number(result[0]))
          requiredAmount = (parseFloat(String(result[1]))/Math.pow(10,state.tokenB.metadata.decimals)).toFixed(3).toString();
         
        }
      } else {
        if (is_sorted) {
          // User inputs B (token1), calculate required A amount (token0)
          const result = await sdk.SDK.Pool.estCurrencyAAmountFromB({
            currencyA: state.tokenA.metadata.address,
            currencyB: state.tokenB.metadata.address,
            feeTierIndex: state.feeTier,
            tickLower: minTick.toString(),
            tickUpper: maxTick.toString(),
            currentPriceTick: currentTick.toString(),
            currencyBAmount: (parseFloat(inputAmount)*Math.pow(10,state.tokenB.metadata.decimals)).toFixed(0).toString()
          });

          if (!result) {
            throw new Error('Failed to calculate required currency A amount');
          }
          set_liquidity_amount(Number(result[0]))
          requiredAmount = (parseFloat(String(result[1]))/Math.pow(10,state.tokenA.metadata.decimals)).toFixed(3).toString();
        
        } else {
          // User inputs B but B is token0, so use estCurrencyBAmountFromA
          const result = await sdk.SDK.Pool.estCurrencyBAmountFromA({
            currencyA: state.tokenB.metadata.address,
            currencyB: state.tokenA.metadata.address,
            feeTierIndex: state.feeTier,
            tickLower: minTick.toString(),
            tickUpper: maxTick.toString(),
            currentPriceTick: currentTick.toString(),
            currencyAAmount: (parseFloat(inputAmount)*Math.pow(10,state.tokenB.metadata.decimals)).toFixed(0).toString()
          });

          if (!result) {
            throw new Error('Failed to calculate required currency amount');
          }
          console.log("i got this result",result)
          set_liquidity_amount(Number(result[0]))
          requiredAmount = (parseFloat(String(result[1]))/Math.pow(10,state.tokenA.metadata.decimals)).toFixed(3).toString();
         
        }
      }

      const result = {
        inputToken,
        inputAmount,
        requiredAmount,
        ticks: { minTick, maxTick, currentTick }
      };
      
      return result;

    } catch (error) {
      console.error('Error calculating required liquidity:', error);
      throw error;
    }
  };

  // Check if all requirements are met for calculation
  const canCalculate = () => {
    return !!(
      state.tokenA.metadata &&
      state.tokenB.metadata &&
      state.minPrice && state.minPrice > 0 &&
      state.maxPrice && state.maxPrice > 0 &&
      state.currentPrice && state.currentPrice > 0 &&
      (state.feeTier !== null && state.feeTier !== undefined)
    );
  };

  // Handle input amount changes and calculate required liquidity
  const handleInputAmountChange = async (amount: string) => {
    setInputAmount(amount);
    setCalculationError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setCalculatedAmount('');
      return;
    }

    // Check if we can calculate
    if (!canCalculate()) {
      if (!state.tokenA.metadata || !state.tokenB.metadata) {
        setCalculationError('Please select both tokens first');
      } else if (!state.minPrice || !state.maxPrice) {
        setCalculationError('Please set price range first');
      } else if (state.feeTier === null || state.feeTier === undefined) {
        setCalculationError('Please select fee tier first');
      } else {
        setCalculationError('Please wait for all data to load');
      }
      return;
    }

    setIsCalculating(true);

    try {
      const result = await getRequiredLiquidity(selectedInputToken, amount);
      setCalculatedAmount(result.requiredAmount);
      
      // Update AppContext with the calculated amounts
      if (selectedInputToken === 'A') {
        actions.setTokenAAmount(amount);
        actions.setTokenBAmount(result.requiredAmount);
      } else {
        actions.setTokenAAmount(result.requiredAmount);
        actions.setTokenBAmount(amount);
      }
    } catch (error) {
      console.error('Failed to calculate required liquidity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed, please try again';
      setCalculationError(errorMessage);
      setCalculatedAmount('');
    } finally {
      setIsCalculating(false);
    }
  };

  // Pool checking logic for Hyperion DEX - only check once per unique pool configuration
  useEffect(() => {
    console.log('Pool check useEffect triggered:', {
      poolKey,
      selectedDex: state.selectedDex,
      hasChecked: poolKey ? checkedPoolsRef.current.has(poolKey) : 'no poolKey',
      tokenA: state.tokenA.metadata?.address,
      tokenB: state.tokenB.metadata?.address,
      feeTier: state.feeTier
    });

    const checkForPool = async () => {
      if (poolKey && !checkedPoolsRef.current.has(poolKey)) {
        console.log('Checking pool existence for key:', poolKey);
        // Mark this pool as being checked
        checkedPoolsRef.current.add(poolKey);
        actions.setPoolState('loading');

        try {
          const hyperionAdapter = new HyperionAdapter('', aptos, currentNetwork);
          console.log('Calling checkPoolState with pool_id:', pool_id);
          const poolState = await hyperionAdapter.checkPoolState(
            pool_id,
            state.tokenA.metadata!.address,
            state.tokenB.metadata!.address,
            state.feeTier
          );

          console.log('Pool state check result:', poolState);

          if (poolState.exists) {
            console.log('Pool exists, setting state to exists');
            actions.setPoolState('exists');
            actions.setPoolStats(poolState.stats || null);
          } else {
            console.log('Pool does not exist, setting state to not_exists');
            actions.setPoolState('not_exists');
            actions.setPoolStats(null);
          }
        } catch (error) {
          console.error('Failed to check pool existence:', error);
          actions.setPoolState('not_exists');
          actions.setPoolStats(null);
          // Remove from checked set on error so user can retry
          checkedPoolsRef.current.delete(poolKey);
        }
      } else if (state.selectedDex !== 'hyperion') {
        console.log('Not hyperion DEX, setting pool state to idle');
        // For other DEXes, reset pool state and clear cache
        actions.setPoolState('idle');
        actions.setPoolStats(null);
        checkedPoolsRef.current.clear();
      } else {
        console.log('Pool already checked or no poolKey');
      }
    };

    checkForPool();
  }, [poolKey, aptos, currentNetwork, state.feeTier, state.tokenA.metadata, state.tokenB.metadata, state.selectedDex]);

  // Generate unique ID for position
  const generatePositionId = () => {
    return `pos_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  // Handle adding position to batch
  const handleAddToBatch = () => {
    if (!state.selectedDex || !state.tokenA.metadata || !state.tokenB.metadata) {
      actions.setError('Please complete all required fields');
      return;
    }

    if (!inputAmount || !calculatedAmount) {
      actions.setError('Please enter token amount and wait for calculation');
      return;
    }

    if (isCalculating) {
      actions.setError('Please wait for calculation to complete');
      return;
    }

    if (calculationError) {
      actions.setError(calculationError);
      return;
    }

    // Check if pool state is determined for Hyperion
    if (state.selectedDex === 'hyperion' && state.poolState === 'loading') {
      actions.setError('Please wait for pool state to be determined');
      return;
    }

    const position = {
      id: generatePositionId(),
      dex: state.selectedDex,
      feeTier: state.feeTier,
      tokenA: {
        address: state.tokenA.metadata.address,
        metadata: state.tokenA.metadata,
        amount: selectedInputToken === 'A' ? inputAmount : calculatedAmount,
      },
      tokenB: {
        address: state.tokenB.metadata.address,
        metadata: state.tokenB.metadata,
        amount: selectedInputToken === 'B' ? inputAmount : calculatedAmount,
      },
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      currentPrice: state.currentPrice,
      slippageTolerance: slippageTolerance,
      poolState: (state.poolState === 'exists' ? 'exists' : 'not_exists') as 'exists' | 'not_exists',
      timestamp: Date.now(),
      // APR data from current calculations
      aprData: aprData ? {
        farmAPR: parseFloat(aprData.farmAPR),
        feeAPR: parseFloat(aprData.feeAPR),
        totalAPR: parseFloat(aprData.farmAPR) + parseFloat(aprData.feeAPR),
        dailyVolume: parseFloat(aprData.dailyVolume)
      } : null,
    };

    actions.addPendingPosition(position);
    actions.setError(null);

    // Don't reset form to allow quick adjustments and re-adding
    // User can continue adjusting price range and add more positions
    // setInputAmount('');
    // setCalculatedAmount('');
    // setCalculationError(null);
  };

  // Handle transaction submission (keep for individual submission if needed)
  const handleSubmitTransaction = async () => {
    if (!state.selectedDex || !state.tokenA.metadata || !state.tokenB.metadata) {
      actions.setError('Please complete all required fields');
      return;
    }

    if (!inputAmount || !calculatedAmount) {
      actions.setError('Please enter token amount and wait for calculation');
      return;
    }

    if (isCalculating || calculationError) {
      actions.setError('Please wait for calculation to complete without errors');
      return;
    }

    actions.setSubmitting(true);
    actions.setError(null);

    try {
      const adapter = getDexAdapter(state.selectedDex);
      let payload;
      if (!account?.address) {
                  throw new Error('Wallet not connected');
                }
      // Special handling for Hyperion DEX with smart pool routing
      if (state.selectedDex === 'hyperion') {
        const hyperionAdapter = new HyperionAdapter('', aptos, currentNetwork);
        const tokenAAmount = selectedInputToken === 'A' ? inputAmount : calculatedAmount;
        const tokenBAmount = selectedInputToken === 'B' ? inputAmount : calculatedAmount;

        const baseParams = {
          tokenAAddress: state.tokenA.metadata.address,
          tokenBAddress: state.tokenB.metadata.address,
          tokenAAmount: tokenAAmount,
          tokenBAmount: tokenBAmount,
          minPrice: state.minPrice,
          maxPrice: state.maxPrice,
          slippageTolerance: slippageTolerance,
          userAddress: '', // This will be filled by the wallet
          feeTier: state.feeTier
        };

            let ratio =1;
            if(state.tokenA.metadata.decimals >state.tokenB.metadata.decimals){
              ratio =  Math.pow(10, state.tokenA.metadata.decimals - state.tokenB.metadata.decimals);
            }else{ 
              ratio =  Math.pow(10, state.tokenB.metadata.decimals - state.tokenA.metadata.decimals);
            }
            console.log("current Pending position" , state.maxPrice,state.minPrice, state.currentPrice)
            // Convert prices to ticks using SDK
            const tickCurrent = priceToTick({
              price: state.currentPrice,
              feeTierIndex:state.feeTier,
              decimalsRatio: ratio // Assuming 1:1 decimal ratio, may need adjustment
            });
            const tickUpper = priceToTick({
              price: state.maxPrice,
              feeTierIndex: state.feeTier,
              decimalsRatio: ratio // Assuming 1:1 decimal ratio, may need adjustment
            });
            const tickLower = priceToTick({
              price: state.minPrice,
              feeTierIndex: state.feeTier,
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
          const payload = await sdk.SDK.Pool.createPoolTransactionPayload({
            currencyA:String(state.tokenA.metadata.address),
            currencyB:String(state.tokenB.metadata.address),
            currencyAAmount:parseInt(state.tokenA.amount)*Math.pow(10,state.tokenA.metadata.decimals) ,
            currencyBAmount:parseInt(state.tokenB.amount)*Math.pow(10,state.tokenB.metadata.decimals),
            feeTierIndex:state.feeTier,
            currentPriceTick:tickCurrent_input,
            tickLower:lowerTick,
            tickUpper:upperTick,
            slippage:state.slippageTolerance
          });
          const txn = await signAndSubmitTransaction({
            sender: account.address,
            data:payload
          })
          if (txn.hash) {
            actions.setTransactionHash(txn.hash);
            actions.setSubmitting(false);
          }
      } else {
        // Standard handling for other DEXes
        const tokenAAmount = selectedInputToken === 'A' ? inputAmount : calculatedAmount;
        const tokenBAmount = selectedInputToken === 'B' ? inputAmount : calculatedAmount;

        payload = await adapter.createAddLiquidityPayload({
          tokenAAddress: state.tokenA.metadata.address,
          tokenBAddress: state.tokenB.metadata.address,
          tokenAAmount: tokenAAmount,
          tokenBAmount: tokenBAmount,
          minPrice: state.minPrice,
          maxPrice: state.maxPrice,
          slippageTolerance: slippageTolerance,
          userAddress: '', // This will be filled by the wallet
        });
        console.log('Standard transaction payload created:', payload);
      }
      
      // TODO: Submit transaction using wallet adapter
      // const result = await submitTransaction(payload);
      // actions.setTransactionHash(result.hash);
      
      // For now, just simulate success
      setTimeout(() => {
        actions.setTransactionHash('0x1234567890abcdef...');
        actions.setSubmitting(false);
      }, 2000);
      
    } catch (error) {
      console.error('Transaction failed:', error);
      actions.setError('Transaction failed. Please try again.');
      actions.setSubmitting(false);
    }
  };

  // Check balance sufficiency
  const balanceCheck = checkSufficientBalance(
    state.tokenA.address,
    state.tokenA.amount,
    state.tokenB.address,
    state.tokenB.amount
  );

  // Check if form is complete and valid
  const isFormComplete = state.selectedDex &&
    state.tokenA.metadata &&
    state.tokenB.metadata &&
    state.currentPrice > 0 &&
    state.minPrice < state.maxPrice &&
    inputAmount &&
    calculatedAmount &&
    !isCalculating &&
    !calculationError &&
    // For Hyperion, ensure pool state is determined (not loading)
    (state.selectedDex !== 'hyperion' || (state.poolState === 'exists' || state.poolState === 'not_exists'));

  // If showing positions page, render UserPositions component
  if (showPositions) {
    return <UserPositions onBack={() => setShowPositions(false)} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Wallet Connection Section */}
        {!connected && (
          <motion.div
            className="glass glass-hover p-8 mb-8 text-center max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Wallet className="w-16 h-16 text-teal-400 mx-auto mb-4" />
            <WalletConnection />
          </motion.div>
        )}

        {/* Main Dashboard */}
        {connected && (
          <div className="space-y-8">
          {/* Step 1: DEX Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
              <h2 className="text-xl font-semibold text-white">{t('step.select_exchange')}</h2>
            </div>
            <DEXSelector
              selectedDEX={state.selectedDex}
              onDEXSelect={actions.setSelectedDex}
            />
          </motion.div>

          {/* Step 2: Token Pair Selection */}
          {state.selectedDex && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                <h2 className="text-xl font-semibold text-white">{t('step.select_pair')}</h2>
              </div>
              <div className="glass glass-hover p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Send className="w-5 h-5 text-teal-400" />
                  <h3 className="text-lg font-semibold text-white font-inter">
                    {t('token.config_title')}
                  </h3>
                </div>
                <p className="text-sm text-white/60 mb-6">
                  {t('token.config_desc')}
                </p>

                {/* Token Pair Selection - Address Only */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-md font-medium text-white mb-2">Base Token</h4>
                    <ConnectedTokenInput
                      tokenType="A"
                      label="Base Token"
                      addressOnly={true}
                      isPrimaryInput={false}
                      isCalculating={false}
                      onPrimaryInputChange={() => {}}
                    />
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-white mb-2">Quote Token</h4>
                    <ConnectedTokenInput
                      tokenType="B"
                      label="Quote Token"
                      addressOnly={true}
                      isPrimaryInput={false}
                      isCalculating={false}
                      onPrimaryInputChange={() => {}}
                    />
                  </div>
                </div>

                {/* Token Selection Status */}
                {state.tokenA.metadata && state.tokenB.metadata && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="text-sm text-green-400 mb-1">✅ {t('token.pair_selected')}</div>
                    <div className="text-xs text-white/60">
                      {state.tokenA.metadata.symbol} / {state.tokenB.metadata.symbol}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* Step 3: Fee Tier Selection */}
          {state.selectedDex && state.tokenA.metadata && state.tokenB.metadata && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                <h2 className="text-xl font-semibold text-white">{t('step.select_fee_tier')}</h2>
              </div>
              <FeeTierSelector
                selectedDex={state.selectedDex}
                selectedFeeTier={state.feeTier}
                onFeeTierSelect={actions.setFeeTier}
                tokenX={state.tokenA.metadata?.address}
                tokenY={state.tokenB.metadata?.address}
              />
            </motion.div>
          )}

          {/* Pool Status Card - Show for Hyperion when pool doesn't exist */}
          {state.selectedDex === 'hyperion' && state.tokenA.metadata && state.tokenB.metadata && state.poolState === 'not_exists' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <PoolStatusCard
                poolState={state.poolState}
                poolStats={state.poolStats || null}
                tokenASymbol={state.tokenA.metadata.symbol}
                tokenBSymbol={state.tokenB.metadata.symbol}
              />
            </motion.div>
          )}

          {/* Step 4: Liquidity Configuration (Price Range + Amount + APR) */}
          {state.tokenA.metadata && state.tokenB.metadata && state.currentPrice > 0 && state.feeTier !== null && state.feeTier !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                <h2 className="text-xl font-semibold text-white">{t('step.configure_liquidity')}</h2>
              </div>

              <div className="glass glass-hover p-6">
                <div className="space-y-8">
                  {/* Price Range Configuration */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Send className="w-5 h-5 text-teal-400" />
                      <h3 className="text-lg font-semibold text-white font-inter">
                        {t('price.range_title')}
                      </h3>
                    </div>
                    <p className="text-sm text-white/60 mb-6">
                      {t('price.range_desc')}
                    </p>

                    <div className="space-y-6">
                      <LiquidityChart
                        currentPrice={state.currentPrice}
                        minPrice={state.minPrice}
                        maxPrice={state.maxPrice}
                        tokenASymbol={state.tokenA.metadata.symbol}
                        tokenBSymbol={state.tokenB.metadata.symbol}
                        feeTier={state.feeTier}
                      />

                      <PriceRangeSelector
                        currentPrice={state.currentPrice}
                        minPrice={state.minPrice}
                        maxPrice={state.maxPrice}
                        onRangeChange={actions.setPriceRange}
                        tokenASymbol={state.tokenA.metadata.symbol}
                        tokenBSymbol={state.tokenB.metadata.symbol}
                      />
                    </div>
                  </div>

                  {/* APR Preview */}
                  {state.selectedDex === 'hyperion' && state.poolState === 'exists' && state.minPrice > 0 && state.maxPrice > 0 && (
                    <div className="p-6 bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-purple-400 text-lg font-semibold">🎯 {t('apr.title')}</span>
                        {isLoadingAPR && (
                          <div className="w-4 h-4 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
                        )}
                      </div>

                      {aprError && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                          ⚠️ {aprError}
                        </div>
                      )}

                      {aprData && !isLoadingAPR ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white/10 rounded-lg p-4 text-center">
                            <div className="text-white/70 text-sm mb-1">{t('apr.fee_apr')}</div>
                            <div className="text-green-400 font-bold text-2xl">
                              {(parseFloat(aprData.feeAPR)).toFixed(2)}%
                            </div>
                            <div className="text-white/50 text-xs">{t('apr.annual_return')}</div>
                          </div>
                          <div className="bg-white/10 rounded-lg p-4 text-center">
                            <div className="text-white/70 text-sm mb-1">{t('apr.farm_apr')}</div>
                            <div className="text-blue-400 font-bold text-2xl">
                              {(parseFloat(aprData.farmAPR)).toFixed(2)}%
                            </div>
                            <div className="text-white/50 text-xs">{t('apr.annual_return')}</div>
                          </div>
                          <div className="bg-white/10 rounded-lg p-4 text-center">
                            <div className="text-white/70 text-sm mb-1">{t('apr.total_apr')}</div>
                            <div className="text-purple-400 font-bold text-3xl">
                              {((parseFloat(aprData.feeAPR) + parseFloat(aprData.farmAPR))).toFixed(2)}%
                            </div>
                            <div className="text-white/50 text-xs">{t('apr.annual_return')}</div>
                          </div>
                        </div>
                      ) : !aprError && !aprData && !isLoadingAPR ? (
                        <div className="text-sm text-white/50 text-center py-4">
                          {t('apr.price_range_prompt')}
                        </div>
                      ) : isLoadingAPR ? (
                        <div className="text-sm text-purple-400 text-center py-4">
                          {t('apr.calculating')}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Amount Input Section */}
                  {state.minPrice > 0 && state.maxPrice > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Send className="w-5 h-5 text-teal-400" />
                        <h3 className="text-lg font-semibold text-white font-inter">
                          {t('amount.title')}
                        </h3>
                      </div>
                      <p className="text-sm text-white/60 mb-6">
                        {t('amount.desc')}
                      </p>

                      {/* Smart Token Input with Calculation - Amount Only */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h4 className="text-md font-medium text-white mb-2">
                            {state.tokenA.metadata.symbol} {t('amount.amount')}
                          </h4>
                          <ConnectedTokenInput
                            tokenType="A"
                            label={state.tokenA.metadata.symbol}
                            amountOnly={true}
                            isPrimaryInput={selectedInputToken === 'A'}
                            isCalculating={selectedInputToken !== 'A' && isCalculating}
                            onPrimaryInputChange={(isPrimary) => {
                              if (isPrimary) {
                                setSelectedInputToken('A');
                              }
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="text-md font-medium text-white mb-2">
                            {state.tokenB.metadata.symbol} {t('amount.amount')}
                          </h4>
                          <ConnectedTokenInput
                            tokenType="B"
                            label={state.tokenB.metadata.symbol}
                            amountOnly={true}
                            isPrimaryInput={selectedInputToken === 'B'}
                            isCalculating={selectedInputToken !== 'B' && isCalculating}
                            onPrimaryInputChange={(isPrimary) => {
                              if (isPrimary) {
                                setSelectedInputToken('B');
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Calculation Status */}
                      <div className="space-y-4">
                        {calculationError && (
                          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            ⚠️ {calculationError}
                          </div>
                        )}

                        {!calculationError && (inputAmount || calculatedAmount) && (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="text-sm text-green-400 mb-1">✅ {t('amount.calculation_complete')}</div>
                            <div className="text-xs text-white/60">
                              {state.tokenA.metadata.symbol}: {selectedInputToken === 'A' ? inputAmount || '0' : calculatedAmount || '0'}
                              {" "} | {state.tokenB.metadata.symbol}: {selectedInputToken === 'B' ? inputAmount || '0' : calculatedAmount || '0'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Advanced Settings & Submit */}
          {isFormComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">5</div>
                <h2 className="text-xl font-semibold text-white">{t('step.advanced_submit')}</h2>
              </div>

              <div className="space-y-6">
                {/* Advanced Settings */}
                <div className="glass glass-hover p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white font-inter">
                      {t('advanced.title')}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">
                        {t('advanced.slippage')}
                      </label>
                      <input
                        type="number"
                        value={slippageTolerance}
                        onChange={(e) => setSlippageTolerance(parseFloat(e.target.value) || 0.5)}
                        step="0.1"
                        min="0.1"
                        max="10"
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 backdrop-filter backdrop-blur-sm focus:outline-none focus:border-teal-400/50 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Section */}
                <div className="glass glass-hover p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Send className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white font-inter">
                      {t('submit.title')}
                    </h3>
                  </div>

                  {/* Error Display */}
                  {state.error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-sm">{state.error}</p>
                    </div>
                  )}

                  <div className="text-center">
                <div className="flex gap-4 justify-center">
                  <div className="relative group">
                    <Button
                      onClick={handleAddToBatch}
                      disabled={!isFormComplete || !balanceCheck.hasSufficientBalance}
                      size="lg"
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        <span>{t('submit.add_to_batch')}</span>
                      </div>
                    </Button>

                    {/* Insufficient balance tooltip */}
                    {isFormComplete && !balanceCheck.hasSufficientBalance && (
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                        <div className="text-center">
                          <div>{t('submit.insufficient_balance')}</div>
                          {!balanceCheck.hasEnoughTokenA && (
                            <div>{state.tokenA.metadata?.symbol}: {balanceCheck.availableTokenA} {t('submit.available')}</div>
                          )}
                          {!balanceCheck.hasEnoughTokenB && (
                            <div>{state.tokenB.metadata?.symbol}: {balanceCheck.availableTokenB} {t('submit.available')}</div>
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-500/90"></div>
                      </div>
                    )}
                  </div>
                </div>

                    <div className="mt-4 text-sm text-white/60 text-center">
                      <p>{t('submit.batch_hint')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

            {/* Transaction Success */}
            {state.transactionHash && (
              <motion.div
                className="glass p-6 text-center border-2 border-green-500/20"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="text-green-400 text-xl mb-2">✅ Transaction Successful!</div>
                <p className="text-white/70 text-sm mb-4">
                  Your liquidity has been added successfully.
                </p>
                <div className="font-mono text-xs text-white/50 break-all mb-4">
                  Transaction Hash: {state.transactionHash}
                </div>
                <a
                  href={getExplorerUrl(state.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors duration-200"
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </motion.div>
          )}
        </div>
      )}
      </div>

      {/* Right Sidebar - Positions & Pending Positions */}
      <div className="lg:col-span-1 space-y-6">
        {connected && (
          <>
            {/* Quick Positions Access */}
            <motion.div
              className="glass glass-hover p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Your Positions</h3>
                <p className="text-white/60 text-sm mb-6">
                  View and manage your liquidity positions
                </p>
                <Button
                  onClick={() => setShowPositions(true)}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium"
                >
                  View All Positions
                </Button>
              </div>
            </motion.div>

            <PendingPositions />
          </>
        )}
      </div>
    </div>
  );
}