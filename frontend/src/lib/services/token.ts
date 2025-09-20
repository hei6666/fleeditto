// src/lib/services/token.ts

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// Create a default client - this will be replaced by the dynamic client in components
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const defaultAptos = new Aptos(aptosConfig);

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenBalance {
  address: string;
  balance: string;
  formattedBalance: string;
  decimals: number;
}

export class TokenService {
  /**
   * Get token metadata including name, symbol, and decimals
   * @param tokenAddress The fungible asset address
   * @param aptosClient Optional Aptos client (uses default if not provided)
   * @returns Promise<TokenMetadata>
   */
  static async getTokenMetadata(tokenAddress: string, aptosClient?: Aptos): Promise<TokenMetadata> {
    const aptos = aptosClient || defaultAptos;
    try {
      // Query the fungible asset metadata
      const resource = await aptos.getAccountResource({
        accountAddress: tokenAddress,
        resourceType: '0x1::fungible_asset::Metadata'
      });
      
      // Extract metadata from the resource
      const metadata = resource as {
        decimals?: string | number;
        icon_uri?:string;
        name?: string;
        project_uri:string;
        symbol?: string;
      };
      
      return {
        address: tokenAddress,
        name: metadata.name || 'Unknown Token',
        symbol: metadata.symbol || 'UNKNOWN',
        decimals: parseInt(metadata.decimals?.toString() || '8') || 8
      };
    } catch (error) {
      console.error('Failed to fetch token metadata:', error);
      // Return default metadata if fetch fails
      return {
        address: tokenAddress,
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 8
      };
    }
  }

  /**
   * Get user's balance for a specific fungible asset using direct Aptos node queries
   * @param userAddress The user's wallet address
   * @param tokenAddress The fungible asset address
   * @param aptosClient Optional Aptos client (uses default if not provided)
   * @returns Promise<TokenBalance>
   */
  static async getTokenBalance(userAddress: string, tokenAddress: string, aptosClient?: Aptos): Promise<TokenBalance> {
    const aptos = aptosClient || defaultAptos;
    try {
      // First get token metadata to know decimals
      const metadata = await this.getTokenMetadata(tokenAddress, aptos);
      console.log("i got this meta",metadata)
      let rawBalance = '0';

      // Handle APT special case
      if (tokenAddress === '0xa' || tokenAddress === '0x1::aptos_coin::AptosCoin') {
        // console.log("start to get apt")
        try {
          const data = await aptos.getAccountAPTAmount({ accountAddress: userAddress });
          // console.log("i got apt =",data)
          rawBalance = String(data as any) ?? '0';
        } catch (error) {
          console.log('APT balance fetch failed, defaulting to 0');
          rawBalance = '0';
        }
      } else {
        // Handle Fungible Asset (FA) tokens
        try {
          const resource = await aptos.view({
              payload:{
                function:"0x1::primary_fungible_store::balance",
                typeArguments:["0x1::fungible_asset::Metadata"],
                functionArguments:[userAddress,tokenAddress]
              }
            })
          rawBalance = (resource as any) || '0';
        } catch (e: any) {
          // 404 error is expected if user has 0 balance for that token
          if (e.status === 404) {
            rawBalance = '0';
          } else {
            console.error(`Failed to fetch FungibleStore for ${tokenAddress}:`, e);
            rawBalance = '0';
          }
        }
      }

      const formattedBalance = this.formatBalance(rawBalance, metadata.decimals);

      return {
        address: tokenAddress,
        balance: rawBalance,
        formattedBalance,
        decimals: metadata.decimals
      };
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      return {
        address: tokenAddress,
        balance: '0',
        formattedBalance: '0.00',
        decimals: 8
      };
    }
  }

  /**
   * Format raw token balance to human readable format
   * @param rawBalance Raw balance as string
   * @param decimals Number of decimals
   * @returns Formatted balance string
   */
  static formatBalance(rawBalance: string, decimals: number): string {
    const balance = BigInt(rawBalance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;
    
    // Convert fractional part to decimal string
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    
    // Trim trailing zeros
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    if (trimmedFractional === '') {
      return wholePart.toString();
    }
    
    return `${wholePart.toString()}.${trimmedFractional}`;
  }

  /**
   * Parse formatted balance back to raw format
   * @param formattedBalance Formatted balance string
   * @param decimals Number of decimals
   * @returns Raw balance string
   */
  static parseBalance(formattedBalance: string, decimals: number): string {
    const parts = formattedBalance.split('.');
    const wholePart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    
    const rawBalance = BigInt(wholePart) * BigInt(10 ** decimals) + BigInt(fractionalPart);
    return rawBalance.toString();
  }

  /**
   * Validate if a string is a valid Aptos address
   * @param address Address string to validate
   * @returns boolean
   */
  static isValidAddress(address: string): boolean {
    try {
      // Aptos addresses should start with 0x and be 64 characters long (including 0x)
      // or be shorter but valid hex
      if (!address.startsWith('0x')) {
        return false;
      }
      
      const hex = address.slice(2);
      if (hex.length === 0 || hex.length > 64) {
        return false;
      }
      
      // Check if it's valid hex
      return /^[0-9a-fA-F]+$/.test(hex);
    } catch {
      return false;
    }
  }
}