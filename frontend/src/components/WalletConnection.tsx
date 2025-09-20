"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "./ui/button";
import { useState } from "react";

export function WalletConnection() {
  const { connect, disconnect, account, connected, wallets } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (walletName: string) => {
    try {
      setIsConnecting(true);
      await connect(walletName);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (connected && account) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm text-white/80">
          Connected: {shortenAddress(account.address.toString())}
        </div>
        <Button
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Connect Your Wallet</h3>
      <div className="grid gap-3">
        {wallets?.map((wallet) => (
          <Button
            key={wallet.name}
            onClick={() => handleConnect(wallet.name)}
            disabled={isConnecting}
            className="flex items-center gap-3 p-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all duration-300 hover:scale-[1.02]"
          >
            {wallet.icon && (
              <img 
                src={wallet.icon} 
                alt={`${wallet.name} logo`} 
                className="w-6 h-6"
              />
            )}
            <span>{wallet.name}</span>
            {isConnecting && <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full ml-auto" />}
          </Button>
        ))}
      </div>
    </div>
  );
}