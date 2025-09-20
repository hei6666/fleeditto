// src/lib/dex_adapters/factory.ts

import { IDexAdapter } from './interface';
import { ThalaAdapter } from './thala';
import { TappAdapter } from './tapp';
import { HyperionAdapter } from './hyperion';
import { supportedDEXes } from '../../config/dexes';

/**
 * Factory function to create the appropriate DEX adapter instance
 * @param dexId The ID of the DEX to create an adapter for
 * @returns IDexAdapter instance for the specified DEX
 * @throws Error if the DEX is not supported
 */
export function getDexAdapter(dexId: string): IDexAdapter {
  const dexInfo = supportedDEXes.find(dex => dex.id === dexId);
  
  if (!dexInfo) {
    throw new Error(`Unsupported DEX: ${dexId}. Supported DEXes: ${supportedDEXes.map(d => d.id).join(', ')}`);
  }

  switch (dexId) {
    case 'thala':
      return new ThalaAdapter(dexInfo.contractAddress);
      
    case 'tapp':
      return new TappAdapter(dexInfo.contractAddress);
      
    case 'hyperion':
      return new HyperionAdapter(dexInfo.contractAddress);
      
    default:
      throw new Error(`No adapter implementation found for DEX: ${dexId}`);
  }
}

/**
 * Get all available DEX adapter instances
 * @returns Array of all supported DEX adapters with their info
 */
export function getAllDexAdapters(): Array<{ dexInfo: typeof supportedDEXes[0], adapter: IDexAdapter }> {
  return supportedDEXes.map(dexInfo => ({
    dexInfo,
    adapter: getDexAdapter(dexInfo.id)
  }));
}