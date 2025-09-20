// src/config/tokens.ts

export interface PopularToken {
  symbol: string;
  name: string;
  address: string;
  logoUri?: string;
}

// Network-specific token configurations
const MAINNET_TOKENS: PopularToken[] = [
  {
    symbol: 'APT',
    name: 'Aptos Token',
    address: '0x000000000000000000000000000000000000000000000000000000000000000a',
    logoUri: '/aptos-apt-logo.svg'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    logoUri: '/usd-coin-usdc-logo.svg'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
    logoUri: '/tether-usdt-logo.svg'
  },
];

const TESTNET_TOKENS: PopularToken[] = [
  {
    symbol: 'APT',
    name: 'Aptos Token',
    address: '0x000000000000000000000000000000000000000000000000000000000000000a',
    logoUri: 'https://cdn.jsdelivr.net/gh/aptos-labs/aptos-core@main/ecosystem/web-wallet/public/aptos-favicon.ico'
  },
  {
    symbol: 'USDC',
    name: 'Test USD Coin',
    address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg'
  },
  {
    symbol: 'USDT',
    name: 'Test Tether USD',
    address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
    logoUri: 'https://cryptologos.cc/logos/tether-usdt-logo.svg'
  },
];

// Default to mainnet tokens - will be updated based on network
export let popularTokens: PopularToken[] = MAINNET_TOKENS;

/**
 * Update popular tokens based on current network
 */
export function updateTokensForNetwork(network: string) {
  switch (network.toLowerCase()) {
    case 'testnet':
      popularTokens = TESTNET_TOKENS;
      break;
    case 'devnet':
      popularTokens = TESTNET_TOKENS; // Use testnet tokens for devnet
      break;
    case 'mainnet':
    default:
      popularTokens = MAINNET_TOKENS;
      break;
  }
}

/**
 * Find token information by address or coinType
 */
export function findTokenByAddress(address: string): PopularToken | null {
  // Handle APT special cases
  if (address.toLowerCase() === '0x000000000000000000000000000000000000000000000000000000000000000a' ||
      address === '0x1::aptos_coin::AptosCoin' ||
      address.includes('aptos_coin::AptosCoin')) {
    return popularTokens.find(token => token.symbol === 'APT') || null;
  }

  // Find by exact address match
  const token = popularTokens.find(token =>
    token.address.toLowerCase() === address.toLowerCase()
  );

  return token || null;
}

/**
 * Extract token symbol from coinType string
 */
export function extractTokenSymbol(coinType: string): string {
  // Handle APT special case
  if (coinType.includes('aptos_coin::AptosCoin')) {
    return 'APT';
  }

  // Try to extract symbol from coinType like "0x123::token::TokenType"
  const parts = coinType.split('::');
  if (parts.length >= 3) {
    return parts[parts.length - 1].toUpperCase();
  }

  // Fallback to last part after ::
  return parts[parts.length - 1]?.toUpperCase() || 'UNKNOWN';
}

/**
 * Resolve user input (symbol or address) to the full technical address
 * required for blockchain queries and API calls
 */
export function resolveTokenAddress(addressOrSymbol: string): string {
  // Handle APT special cases
  if (addressOrSymbol.toLowerCase() === 'apt' ||
      addressOrSymbol.toLowerCase() === '0xa' ||
      addressOrSymbol === '0x1::aptos_coin::AptosCoin') {
    return '0x1::aptos_coin::AptosCoin';
  }

  // Handle popular token symbols
  const upperSymbol = addressOrSymbol.toUpperCase();
  const popularToken = popularTokens.find(token => token.symbol === upperSymbol);
  if (popularToken) {
    return popularToken.address;
  }

  // Return the input as-is if it's already an address
  return addressOrSymbol;
}