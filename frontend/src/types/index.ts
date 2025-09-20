export interface Token {
  address: string; // Aptos token address (e.g., 0x1::aptos_coin::AptosCoin)
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface Pool {
  id: string;
  token0: Token;
  token1: Token;
  fee: number; // fee tier (e.g., 3000 = 0.3%)
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  protocol: 'pancakeswap' | 'thalaswap' | 'liquidswap' | 'custom' | 'other'; // Aptos AMM protocols
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface LiquidityPosition {
  poolId: string;
  pool: Pool;
  token0Amount: string;
  token1Amount: string;
  priceRange: PriceRange;
}

export interface TransactionStatus {
  hash?: string;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
}

export interface BatchTransaction {
  positions: LiquidityPosition[];
  estimatedGas?: number; // Aptos gas units
  status: TransactionStatus;
}

// Aptos-specific types
export interface AptosContractConfig {
  moduleAddress: string;
  moduleName: string;
  functionName: string;
}