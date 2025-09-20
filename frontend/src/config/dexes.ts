// src/config/dexes.ts
export interface DexInfo {
  id: string;
  name: string;
  logoUrl: string;
  contractAddress: string;
}

export const supportedDEXes: DexInfo[] = [
  {
    id: 'thala',
    name: 'Thala',
    logoUrl: 'https://media.aptosfoundation.org/1687169730-thala-labs.jpeg?auto=format&fit=crop&h=344&w=344',
    contractAddress: '0x007730cd28ee1cdc9e999336cbc430f99e7c44397c0aa77516f6f23a78559bb5'
  },
  {
    id: 'tapp',
    name: 'tapp Exchange',
    logoUrl: 'https://tapp.exchange/main-icon.png',
    contractAddress: '0x487e905f899ccb6d46fdaec56ba1e0c4cf119862a16c409904b8c78fab1f5e8a'
  },
  {
    id: 'hyperion',
    name: 'Hyperion',
    logoUrl: 'https://hyperion.xyz/fav-new.svg',
    contractAddress: '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c'
  }
];