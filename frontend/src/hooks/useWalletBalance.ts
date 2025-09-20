// frontend/src/hooks/useWalletBalance.ts
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import useSWR from 'swr';
import { resolveTokenAddress } from '../config/tokens';
import { useAptosClient } from './useAptosClient';

export function useWalletBalance(tokenAddress?: string) {
  const { account } = useWallet();
  const { aptos, currentNetwork } = useAptosClient(); // Get dynamic Aptos client
  const ownerAddress = account?.address?.toString();

  // Create a fetcher that uses the current Aptos client
  const balanceFetcher = async ([ownerAddress, userInputAddress]: [string, string]): Promise<string> => {
    const technicalAddress = resolveTokenAddress(userInputAddress);
    
    console.log(`💰 Fetching balance for ${technicalAddress} on ${currentNetwork} network`);

    // --- NATIVE APT SPECIAL CASE ---
    if (technicalAddress === '0x1::aptos_coin::AptosCoin') {
      try {
        const data = await aptos.getAccountCoinsData({ accountAddress: ownerAddress });
        return data.find(c => c.asset_type === technicalAddress)?.amount ?? '0';
      } catch { return '0'; }
    }

    // --- MODERN FUNGIBLE ASSET (FA) STANDARD ---
    // This is the correct method for all other tokens.
    try {
      const resource = await aptos.view({
        payload:{
          function:"0x1::primary_fungible_store::balance",
          typeArguments:["0x1::fungible_asset::Metadata"],
          functionArguments:[ownerAddress,technicalAddress]
        }
      })
      // const resource = await aptos.getAccountResource({
      //   accountAddress: ownerAddress,
      //   resourceType: `0x1::fungible_asset::FungibleStore<${technicalAddress}>`
      // });
      // console.log("i got this ",resource);
      return String(resource[0]||"") ;
    } catch (e: any) {
      // A 404 error is expected if the user has 0 balance for that token.
      if (e.status === 404) return '0';
      console.error(`Failed to fetch FungibleStore for ${technicalAddress}:`, e);
      return '0';
    }
  };

  const cacheKey = (ownerAddress && tokenAddress && aptos) ? [ownerAddress, tokenAddress, currentNetwork] : null;
  const { data, error, isLoading } = useSWR<string>(cacheKey, balanceFetcher, {
    // Refresh balance every 30 seconds
    refreshInterval: 30000,
    // Re-fetch when window regains focus
    revalidateOnFocus: true,
    // Dedupe requests within 10 seconds
    dedupingInterval: 10000,
  });
  return { balance: data ?? '0', isLoading, error };
}