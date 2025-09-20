// src/lib/dex_adapters/interface.ts
// import { poolRoute} from "@hyperionxyz/sdk"
export interface AddLiquidityParams {
  tokenAAddress: string;
  tokenBAddress: string;
  tokenAAmount: string;
  tokenBAmount: string;
  minPrice: number;
  maxPrice: number;
  slippageTolerance: number;
  userAddress: string;
}
export interface SwapArg{
  tokenAAddress: string;
  tokenBAddress: string;
  tokenAAmount: string;
  tokenBAmount: string;
  poolRoute: any, // poolRoute type from SDK
  recipient: "",
}


export interface PoolInfo {
  exists: boolean;
  tokenAAddress: string;
  tokenBAddress: string;
  currentPrice?: number;
  liquidity?: string;
  fee?: number;
}

export interface TransactionPayload {
  function: string;
  type_arguments: string[];
  arguments: Array<string | number | boolean>;
}

export interface PoolStats {
  dailyVolumeUSD: number;
  farmAPR: number;
  feeAPR: number;
  feesUSD: number;
  id: string;
  tvlUSD: number;
  pool: {
    currentTick: number;
    sqrtPrice: string;
    token1: string;
    token2: string;
  };
}

export type PoolState =
  | { exists: true; stats: PoolStats }
  | { exists: true; stats?: undefined }
  | { exists: false };

export interface IDexAdapter {
  /**
   * Check if a liquidity pool exists for the given token pair
   * @param tokenA First token address
   * @param tokenB Second token address
   * @param feeTier Fee tier for the pool (e.g., 30 for 0.3%)
   * @returns Promise<PoolInfo> Pool information including existence status
   */
  checkPoolExists(tokenA: string, tokenB: string, feeTier: number): Promise<PoolInfo>;

  /**
   * Create transaction payload for adding concentrated liquidity
   * @param params Parameters required for adding liquidity
   * @returns TransactionPayload Transaction payload formatted for the specific DEX
   */
  createAddLiquidityPayload(params: AddLiquidityParams): Promise<TransactionPayload>;

  /**
   * Get the DEX-specific contract address
   * @returns string Contract address for this DEX
   */
  getContractAddress(): string;

  /**
   * Get supported fee tiers for this DEX (if applicable)
   * @returns number[] Array of supported fee tiers (e.g., [0.01, 0.05, 0.3, 1.0] for 0.01%, 0.05%, 0.3%, 1% fees)
   */
  getSupportedFeeTiers(): number[];
}