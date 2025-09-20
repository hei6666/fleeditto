import { AptosContractConfig } from '@/types';

// Configuration for the Fleeditto smart contract
export const FLEEDITTO_CONTRACT: AptosContractConfig = {
  moduleAddress: "0x1", // Replace with your deployed contract address
  moduleName: "fleeditto",
  functionName: "batch_add_liquidity"
};

// Common Aptos token addresses on Testnet/Mainnet
export const APTOS_TOKENS = {
  APT: "0x1::aptos_coin::AptosCoin",
  USDC: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC",
  USDT: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT",
  WETH: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH"
};

// Gas configuration
export const GAS_CONFIG = {
  maxGasAmount: 10000,
  gasUnitPrice: 100
};

/**
 * Constructs an Aptos transaction payload for batch liquidity addition
 * This function creates the proper transaction structure that will be sent to the Aptos blockchain
 */
export function createBatchLiquidityPayload(positions: Array<{
  poolId: string;
  token0Amount: string;
  token1Amount: string;
  minPrice: number;
  maxPrice: number;
}>) {
  return {
    type: "entry_function_payload",
    function: `${FLEEDITTO_CONTRACT.moduleAddress}::${FLEEDITTO_CONTRACT.moduleName}::${FLEEDITTO_CONTRACT.functionName}`,
    type_arguments: [],
    arguments: [
      positions.map(p => p.poolId),
      positions.map(p => p.token0Amount),
      positions.map(p => p.token1Amount),
      positions.map(p => Math.floor(p.minPrice * 1000000)), // Convert to micro units
      positions.map(p => Math.floor(p.maxPrice * 1000000))  // Convert to micro units
    ]
  };
}

/**
 * Creates a view function call to simulate the transaction before execution
 * This helps validate parameters and estimate gas costs
 */
export function createSimulationPayload(positions: Array<{
  poolId: string;
  token0Amount: string;
  token1Amount: string;
  minPrice: number;
  maxPrice: number;
}>) {
  return {
    function: `${FLEEDITTO_CONTRACT.moduleAddress}::${FLEEDITTO_CONTRACT.moduleName}::simulate_batch_add_liquidity`,
    type_arguments: [],
    arguments: [
      positions.map(p => p.poolId),
      positions.map(p => p.token0Amount),
      positions.map(p => p.token1Amount),
      positions.map(p => Math.floor(p.minPrice * 1000000)),
      positions.map(p => Math.floor(p.maxPrice * 1000000))
    ]
  };
}