"use client";

import { motion } from 'framer-motion';
import { PopularToken } from '../config/tokens';

interface TokenBadgesProps {
  tokens: PopularToken[];
  onSelectToken: (address: string) => void;
  selectedAddress?: string;
  label?: string;
}

export function TokenBadges({ 
  tokens, 
  onSelectToken, 
  selectedAddress,
  label = "Popular tokens:" 
}: TokenBadgesProps) {
  return (
    <div className="mt-3">
      <div className="text-xs text-white/50 mb-2 font-inter">{label}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {tokens.map((token, index) => {
          const isSelected = selectedAddress === token.address;
          
          return (
            <motion.button
              key={token.address}
              onClick={() => onSelectToken(token.address)}
              title={`${token.name} (${token.address})`}
              className={`py-1 px-3 text-xs rounded-full transition-all duration-300 font-medium relative group ${
                isSelected
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
                  : 'bg-white/10 text-white/70 hover:bg-teal-500/20 hover:text-teal-300 border border-white/20 hover:border-teal-400/40'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold">{token.symbol}</span>
                {isSelected && (
                  <motion.div
                    className="w-1.5 h-1.5 bg-white rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  />
                )}
              </div>
              
              {/* Hover tooltip with address preview */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="font-medium">{token.name}</div>
                <div className="font-mono text-xs text-white/70">
                  {token.address.length > 20 
                    ? `${token.address.slice(0, 8)}...${token.address.slice(-6)}`
                    : token.address
                  }
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900/95"></div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}