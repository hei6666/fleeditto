"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from './header';
import { LiquidityDashboard } from './LiquidityDashboard';
import { SwapDashboard } from './SwapDashboard';
import { useAppActions } from '../contexts/AppContext';

type PageType = 'liquidity' | 'swap';

export function MainApp() {
  const [currentPage, setCurrentPage] = useState<PageType>('liquidity');
  const actions = useAppActions();

  const handlePageChange = (page: PageType) => {
    // Clear transaction hash when switching pages
    actions.setTransactionHash(null);
    // Also clear any errors
    actions.setError(null);
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header with Navigation */}
      <Header currentPage={currentPage} onPageChange={handlePageChange} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
              {currentPage === 'liquidity' ? 'Liquidity Management' : 'Token Swaps'}
            </span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            {currentPage === 'liquidity'
              ? 'Professional concentrated liquidity management for Aptos DeFi protocols. Add liquidity to multiple DEXes in a single, optimized transaction with MEV protection.'
              : 'Execute secure token swaps across Aptos DEXes with advanced MEV protection and optimal price discovery.'
            }
          </p>
        </motion.div>

        {/* Page Content */}
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
        >
          {currentPage === 'liquidity' ? <LiquidityDashboard /> : <SwapDashboard />}
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="text-center mt-16 py-8 border-t border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-white/50 text-sm font-inter">
            Built with ❤️ for the Aptos DeFi ecosystem
          </p>
        </motion.footer>
      </div>
    </div>
  );
}