// src/hooks/useAptosClient.ts
import { useMemo, useEffect, useState } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export interface NetworkInfo {
  network: Network;
  name: string;
  rpcUrl?: string;
  indexerUrl?: string;
}

// Supported networks configuration
const NETWORK_CONFIGS: Record<string, NetworkInfo> = {
  mainnet: {
    network: Network.MAINNET,
    name: 'Mainnet',
    rpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    indexerUrl: 'https://indexer.mainnet.aptoslabs.com/v1/graphql'
  },
  testnet: {
    network: Network.TESTNET,
    name: 'Testnet',
    rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    indexerUrl: 'https://indexer.testnet.aptoslabs.com/v1/graphql'
  },
  devnet: {
    network: Network.DEVNET,
    name: 'Devnet',
    rpcUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
    indexerUrl: 'https://indexer.devnet.aptoslabs.com/v1/graphql'
  }
};

export function useAptosClient() {
  const { network: walletNetwork } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState<Network>(Network.MAINNET);
  const [networkMismatch, setNetworkMismatch] = useState(false);

  // Detect wallet network and update accordingly
  useEffect(() => {
    if (walletNetwork?.name) {
      const detectedNetwork = detectNetworkFromWallet(walletNetwork.name);
      
      if (detectedNetwork !== currentNetwork) {
        console.log(`🔄 Network switch detected: ${currentNetwork} -> ${detectedNetwork}`);
        setCurrentNetwork(detectedNetwork);
        setNetworkMismatch(false);
      }
    } else {
      // Default to mainnet when no wallet is connected
      if (currentNetwork !== Network.MAINNET) {
        setCurrentNetwork(Network.MAINNET);
        setNetworkMismatch(false);
      }
    }
  }, [walletNetwork?.name, currentNetwork]);

  // Create Aptos client with current network configuration
  const aptosClient = useMemo(() => {
    const networkKey = currentNetwork.toString().toLowerCase();
    const networkConfig = NETWORK_CONFIGS[networkKey] || NETWORK_CONFIGS.mainnet;
    
    console.log(`🌐 Initializing Aptos client for: ${networkConfig.name}`);
    
    const aptosConfig = new AptosConfig({ 
      network: networkConfig.network,
      fullnode: networkConfig.rpcUrl,
      indexer: networkConfig.indexerUrl
    });
    
    return new Aptos(aptosConfig);
  }, [currentNetwork]);

  // Get current network info
  const networkInfo = NETWORK_CONFIGS[currentNetwork.toString().toLowerCase()] || NETWORK_CONFIGS.mainnet;

  return {
    aptos: aptosClient,
    currentNetwork,
    networkInfo,
    networkMismatch,
    setCurrentNetwork,
    supportedNetworks: Object.values(NETWORK_CONFIGS)
  };
}

/**
 * Detect network from wallet network name
 */
function detectNetworkFromWallet(walletNetworkName: string): Network {
  const networkName = walletNetworkName.toLowerCase();
  
  if (networkName.includes('mainnet')) {
    return Network.MAINNET;
  } else if (networkName.includes('testnet')) {
    return Network.TESTNET;
  } else if (networkName.includes('devnet')) {
    return Network.DEVNET;
  }
  
  // Default to mainnet for unknown networks
  return Network.MAINNET;
}

/**
 * Hook for network switching notification
 */
export function useNetworkNotification() {
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'info' | 'warning' | 'success';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  const showNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    setNotification({ show: true, message, type });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  return {
    notification,
    showNotification,
    hideNotification
  };
}