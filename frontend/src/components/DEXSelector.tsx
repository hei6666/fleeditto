'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { supportedDEXes } from '../config/dexes';

interface DEXSelectorProps {
  selectedDEX: string | null;
  onDEXSelect: (dexId: string) => void;
}

export function DEXSelector({ selectedDEX, onDEXSelect }: DEXSelectorProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (dexId: string) => {
    setImageErrors(prev => new Set([...prev, dexId]));
  };

  const isDexDisabled = (dexId: string) => {
    return dexId === 'thala' ;
  };

  const getDexDescription = (dexId: string) => {
    switch (dexId) {
      case 'thala': return 'Coming Soon';
      case 'tapp': return 'Uniswap v4';
      case 'hyperion': return 'High Performance AMM';
      default: return 'DeFi Protocol';
    }
  };

  return (
    <motion.div 
      className="glass glass-hover p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2 font-inter">Select DeFi Protocol</h2>
        <p className="text-sm text-white/60">Choose which AMM protocol to provide liquidity to</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {supportedDEXes.map((dex) => {
          const isDisabled = isDexDisabled(dex.id);
          return (
            <motion.button
              key={dex.id}
              onClick={() => !isDisabled && onDEXSelect(dex.id)}
              disabled={isDisabled}
              className={`relative group p-6 rounded-2xl backdrop-filter backdrop-blur-xl transition-all duration-300 ease-in-out ${
                isDisabled
                  ? 'bg-white/5 border border-gray-600/30 opacity-50 cursor-not-allowed'
                  : selectedDEX === dex.id
                  ? 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-400/50 shadow-lg shadow-teal-500/25'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-400/30 hover:shadow-lg hover:shadow-teal-500/10'
              }`}
              whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
            {selectedDEX === dex.id && !isDisabled && (
              <motion.div
                className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}

            {isDisabled && (
              <div className="absolute top-3 right-3 px-2 py-1 bg-gray-600/80 rounded-full">
                <span className="text-xs text-gray-300 font-medium">Soon</span>
              </div>
            )}
            
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-filter backdrop-blur-sm flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-teal-400/30 transition-all duration-300">
                {!imageErrors.has(dex.id) ? (
                  <img
                    src={dex.logoUrl}
                    alt={`${dex.name} logo`}
                    className="w-12 h-12 object-contain rounded-xl transition-all duration-300 group-hover:scale-110"
                    onError={() => handleImageError(dex.id)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg font-inter">
                      {dex.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <h3 className={`font-semibold text-base font-inter transition-all duration-300 ${
                  isDisabled
                    ? 'text-gray-400'
                    : selectedDEX === dex.id
                    ? 'text-teal-300'
                    : 'text-white group-hover:text-teal-200'
                }`}>
                  {dex.name}
                </h3>
                <div className={`text-xs mt-1 font-inter ${
                  isDisabled ? 'text-gray-500' : 'text-white/50'
                }`}>
                  {getDexDescription(dex.id)}
                </div>
              </div>
            </div>

            {/* Glow effect on hover */}
            {!isDisabled && (
              <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
                selectedDEX === dex.id
                  ? 'opacity-100 bg-gradient-to-br from-teal-500/10 to-cyan-500/10'
                  : 'opacity-0 group-hover:opacity-100 bg-gradient-to-br from-teal-500/5 to-cyan-500/5'
              }`} />
            )}
          </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}