"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";

export function WalletConnector() {
  const {
    connect,
    disconnect,
    account,
    wallets,
    connected,
    isLoading,
    network,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const formatAddress = (address: string | any) => {
    // Convert AccountAddress to string if needed
    const addressStr = typeof address === 'string' ? address : address?.toString() || '';
    return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (account?.address) {
      const addressStr = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      navigator.clipboard.writeText(addressStr);
    }
  };

  const openExplorer = () => {
    if (account?.address && network) {
      const addressStr = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      const baseUrl = network.name === "mainnet" 
        ? "https://explorer.aptoslabs.com"
        : `https://explorer.aptoslabs.com/?network=${network.name}`;
      window.open(`${baseUrl}/account/${addressStr}`, "_blank");
    }
  };

  if (connected && account) {
    return (
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-xl text-white hover:bg-slate-700/50 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-medium">{formatAddress(account.address)}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-72 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-2xl z-50"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Wallet Address</p>
                  <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                    <code className="text-sm text-white flex-1 break-all">
                      {typeof account.address === 'string' ? account.address : account.address.toString()}
                    </code>
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Network</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      network?.name === "mainnet" ? "bg-green-400" : "bg-yellow-400"
                    }`} />
                    <span className="text-white capitalize">
                      {network?.name || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                  <button
                    onClick={openExplorer}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Explorer
                  </button>
                  <button
                    onClick={() => {
                      disconnect();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <motion.button
        onClick={() => setShowWalletModal(true)}
        disabled={isLoading}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Wallet className="w-5 h-5" />
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </motion.button>

      <AnimatePresence>
        {showWalletModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowWalletModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">Connect Wallet</h2>
              <p className="text-slate-400 mb-6">
                Choose a wallet to connect to the Aptos network
              </p>
              
              <div className="space-y-3">
                {wallets && wallets.length > 0 ? (
                  wallets.map((wallet) => (
                    <motion.button
                      key={wallet.name}
                      onClick={() => {
                        try {
                          connect(wallet.name);
                          setShowWalletModal(false);
                        } catch (error) {
                          console.error('Failed to connect wallet:', error);
                        }
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-xl transition-all duration-200 text-white"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {wallet.icon && (
                        <img
                          src={wallet.icon}
                          alt={wallet.name}
                          className="w-8 h-8 rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="text-left">
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-sm text-slate-400">
                          Connect using {wallet.name}
                        </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p>No wallets available</p>
                    <p className="text-sm mt-2">Please install a supported Aptos wallet</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowWalletModal(false)}
                className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}