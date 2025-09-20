// src/lib/dex_adapters/hyperion.ts

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { IDexAdapter, AddLiquidityParams, PoolInfo, TransactionPayload, PoolStats, PoolState } from './interface';


const HYPERION_GRAPHQL_ENDPOINT = 'https://hyperfluid-api.alcove.pro/v1/graphql';

// Network-specific Hyperion contract addresses
const HYPERION_CONTRACTS = {
  mainnet: '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c',
  testnet: '0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd'
} as const;

type NetworkKey = keyof typeof HYPERION_CONTRACTS;

export class HyperionAdapter implements IDexAdapter {
  private contractAddress: string;
  private aptos: Aptos;
  private network: Network;

  

  constructor(contractAddress: string, aptos?: Aptos, network?: Network) {
    this.contractAddress = contractAddress;
    // Use provided aptos client or create a default mainnet one
    this.aptos = aptos || new Aptos(new AptosConfig({ network: Network.MAINNET }));
    this.network = network || Network.MAINNET;
  }

  // Helper method to get the correct Hyperion contract address for the current network
  private getHyperionContractAddress(): string {
    const networkString = this.network.toString().toLowerCase();
    const networkKey = networkString as NetworkKey;
    
    // Ensure we have a valid network key, fallback to mainnet
    if (networkKey in HYPERION_CONTRACTS) {
      return HYPERION_CONTRACTS[networkKey];
    }
    
    console.warn(`Unknown network "${networkString}", falling back to mainnet Hyperion contract`);
    return HYPERION_CONTRACTS.mainnet;
  }

  // --- NEW METHOD 1: Check Pool Existence ---
  async checkPoolExists(tokenA: string, tokenB: string, feeTier: number): Promise<PoolInfo> {
    try {
      // Note: The view function expects Object<Metadata>, which is usually the token's FA address itself.
      // We assume the feeTier is a u8 value (e.g., 30 for 0.3%).
      const hyperionContract = this.getHyperionContractAddress();
      const result = await this.aptos.view({
        payload: {
          function: `${hyperionContract}::pool_v3::liquidity_pool_exists`,
          functionArguments: [tokenA, tokenB, feeTier],
        },
      });
      const exists = result[0] as boolean;
      
      return {
        exists,
        tokenAAddress: tokenA,
        tokenBAddress: tokenB,
        currentPrice: undefined, // Will be fetched if pool exists
        liquidity: undefined,    // Will be fetched if pool exists
        fee: feeTier / 10000     // Convert basis points to decimal
      };
    } catch (error) {
      console.error("Failed to check pool existence:", error);
      return {
        exists: false,
        tokenAAddress: tokenA,
        tokenBAddress: tokenB,
        currentPrice: undefined,
        liquidity: undefined,
        fee: feeTier / 10000
      };
    }
  }

  // --- NEW METHOD 2: Fetch Stats for an Existing Pool ---
  async fetchExistingPoolStats(poolId: string): Promise<PoolStats | null> {
    const query = `
      query GetPoolStats($poolId: String!) {
        api {
          getPoolStat(poolId: $poolId) {
            dailyVolumeUSD
            farmAPR
            feeAPR
            feesUSD
            id
            tvlUSD
            pool {
              currentTick
              sqrtPrice
              token1
              token2
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(HYPERION_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { poolId }
        }),
      });
      const json = await response.json();

      console.log('Pool stats GraphQL response:', json);

      if (json.errors) {
        console.error('GraphQL errors:', json.errors);
        return null;
      }

      if (!json.data?.api?.getPoolStat) {
        console.warn('No pool stats data returned for poolId:', poolId);
        return null;
      }

      return json.data.api.getPoolStat;
    } catch (error) {
      console.error("Failed to fetch Hyperion pool stats:", error);
      return null;
    }
  }

  // --- NEW METHOD 3: Check Pool State (combines existence check and stats fetching) ---
  async checkPoolState(pool_id:string,tokenA: string, tokenB: string, feeTier: number): Promise<PoolState> {

    const poolInfo = await this.checkPoolExists(tokenA, tokenB, feeTier);
    console.log("check this",tokenA,tokenB,feeTier,poolInfo )
    if (poolInfo.exists) {
      // If pool_id is provided and not empty, use it; otherwise skip stats fetching
      if (pool_id && pool_id.trim() !== '') {
        console.log('Fetching pool stats for pool_id:', pool_id);
        const stats = await this.fetchExistingPoolStats(pool_id);

        if (stats) {
          return { exists: true, stats };
        }
      } else {
        console.log('Pool exists but no pool_id provided, skipping stats fetch');
      }

      // Return exists without stats if pool_id is not available
      return { exists: true };
    }

    return { exists: false };
  }

  async createAddLiquidityPayload(params: AddLiquidityParams): Promise<TransactionPayload> {
    // This method will be used for backward compatibility
    // In the new flow, we'll use either createPoolAndAddLiquidityPayload or addLiquidityToExistingPoolPayload
    console.log('Creating Hyperion add liquidity payload with params:', params);
    
    return {
      function: `${this.contractAddress}::pools::create_concentrated_position`, // Placeholder function name
      type_arguments: [
        params.tokenAAddress,
        params.tokenBAddress
      ],
      arguments: [
        params.tokenAAmount,
        params.tokenBAmount,
        // TODO: Add Hyperion-specific arguments for concentrated liquidity
        // such as position ranges, fee selection, deadline, etc.
      ]
    };
  }

  async get_swap_output(){
    
  }

  // --- NEW METHOD 4: Method for creating the transaction payload for a NEW pool (interacts with YOUR contract) ---
  createPoolAndAddLiquidityPayload(params: AddLiquidityParams & { feeTier: number, currentPrice: number }): TransactionPayload {
    console.log("Constructing payload for OUR custom 'create pool' contract...");
    // TODO: This will be the transaction payload for your own smart contract.
    return {
      function: `${this.contractAddress}::fleeditto::create_pool_and_add_liquidity`,
      type_arguments: [
        params.tokenAAddress,
        params.tokenBAddress
      ],
      arguments: [
        params.tokenAAmount,
        params.tokenBAmount,
        params.minPrice,
        params.maxPrice,
        params.feeTier,
        params.currentPrice,
        params.slippageTolerance * 10000 // Convert to basis points
      ]
    };
  }

  // --- NEW METHOD 5: Method for creating the transaction payload for an EXISTING pool (interacts with Hyperion's contract) ---
  addLiquidityToExistingPoolPayload(params: AddLiquidityParams & { feeTier: number }): TransactionPayload {
    console.log("Constructing payload for Hyperion's 'add liquidity' function...");
    const hyperionContract = this.getHyperionContractAddress();
    
    return {
      function: `${hyperionContract}::hyperion_pool::add_liquidity`,
      type_arguments: [
        params.tokenAAddress,
        params.tokenBAddress
      ],
      arguments: [
        params.tokenAAmount,
        params.tokenBAmount,
        params.minPrice,
        params.maxPrice,
        params.feeTier,
        params.slippageTolerance * 10000, // Convert to basis points
        Math.floor(Date.now() / 1000) + 300 // 5 minute deadline
      ]
    };
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  getSupportedFeeTiers(): number[] {
    // Hyperion's supported fee tiers as indices to TICK_SPACING_VEC
    // TICK_SPACING_VEC: [1, 10, 60, 200, 20, 50]
    // Index mapping sorted by fee percentage:
    // 0->0.01%, 1->0.05%, 2->0.1%, 4->0.25%, 5->0.3%
    return [0, 1, 2, 4, 5]; // 0.01%, 0.05%, 0.1%, 0.25%, 0.3%
  }
}