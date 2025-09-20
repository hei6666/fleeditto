"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAptosClient, useNetworkNotification } from '../hooks/useAptosClient';
import { Network } from '@aptos-labs/ts-sdk';
import { Button } from './ui/button';

export function NetworkSwitcher() {
  const { currentNetwork, networkInfo, networkMismatch, setCurrentNetwork, supportedNetworks } = useAptosClient();
  const { notification, showNotification, hideNotification } = useNetworkNotification();
  const [isOpen, setIsOpen] = useState(false);

  const handleNetworkSwitch = (network: Network) => {
    if (network !== currentNetwork) {
      setCurrentNetwork(network);
      const newNetworkInfo = supportedNetworks.find(n => n.network === network);
      showNotification(
        `🌐 Switched to ${newNetworkInfo?.name || 'Unknown'} network`,
        'success'
      );
    }
    setIsOpen(false);
  };

  const getNetworkStatusColor = () => {
    if (networkMismatch) return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
    return 'text-green-400 border-green-400/30 bg-green-400/10';
  };

  const getNetworkIcon = () => {
    if (networkMismatch) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <>
      {/* Network Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            className="fixed top-4 right-4 z-50 max-w-sm"
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className={`
              px-4 py-3 rounded-lg border backdrop-blur-sm font-inter text-sm
              ${notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : ''}
              ${notification.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : ''}
              ${notification.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : ''}
            `}>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span>{notification.message}</span>
                <Button
                  onClick={hideNotification}
                  size="sm"
                  variant="ghost"
                  className="ml-auto p-1 h-6 w-6 hover:bg-white/10"
                >
                  ×
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Network Switcher Dropdown */}
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm
            transition-all duration-300 hover:scale-105 font-inter text-sm
            ${getNetworkStatusColor()}
          `}
        >
          {getNetworkIcon()}
          <span>{networkInfo.name}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute top-full left-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-50"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-2">
                <div className="text-xs text-white/50 px-3 py-2 font-inter font-medium">
                  Select Network
                </div>
                
                {supportedNetworks.map((network) => (
                  <button
                    key={network.network}
                    onClick={() => handleNetworkSwitch(network.network)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                      transition-all duration-200 font-inter
                      ${currentNetwork === network.network 
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' 
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <div className={`
                      w-2 h-2 rounded-full
                      ${currentNetwork === network.network ? 'bg-teal-400' : 'bg-white/30'}
                    `} />
                    <span>{network.name}</span>
                    {currentNetwork === network.network && (
                      <CheckCircle className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {/* Network Status Info */}
              <div className="border-t border-white/10 p-3">
                <div className="text-xs text-white/50 font-inter">
                  {networkMismatch ? (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="w-3 h-3" />
                      Network mismatch detected
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      Connected to {networkInfo.name}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}