'use client';

import { WalletConnection } from './WalletConnection';
import { NetworkSwitcher } from './NetworkSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Plus, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  currentPage?: 'liquidity' | 'swap';
  onPageChange?: (page: 'liquidity' | 'swap') => void;
}

export function Header({ currentPage = 'liquidity', onPageChange }: HeaderProps) {
  const { t } = useLanguage();

  return (
    <motion.header
      className="glass glass-hover sticky top-0 z-50 p-4 md:p-6 mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Mobile Layout */}
        <div className="block md:hidden space-y-3">
          {/* Top Row: Logo + Wallet */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center p-1.5">
                <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6" cy="6" r="2" fill="#ffffff" opacity="0.9"/>
                  <circle cx="10" cy="10" r="1.5" fill="#ffffff" opacity="0.7"/>
                  <path d="M3 12c2-1 4 0 6-1" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8"/>
                  <circle cx="2" cy="2" r="0.5" fill="#ffffff" opacity="0.8"/>
                  <circle cx="14" cy="14" r="0.5" fill="#ffffff" opacity="0.8"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
                  {t('header.title')}
                </h1>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">{t('header.mev_protected')}</span>
                </div>
              </div>
            </div>
            <WalletConnection />
          </div>

          {/* Bottom Row: Navigation + Controls */}
          <div className="flex items-center justify-between">
            {/* Navigation */}
            {onPageChange && (
              <nav className="flex items-center space-x-2">
                <motion.button
                  onClick={() => onPageChange('liquidity')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                    currentPage === 'liquidity'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">{t('header.add_liquidity')}</span>
                </motion.button>

                <motion.button
                  onClick={() => onPageChange('swap')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                    currentPage === 'swap'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span className="font-medium">{t('header.swap')}</span>
                </motion.button>
              </nav>
            )}

            {/* Language and Network Controls */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <NetworkSwitcher />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          <motion.div
            className="flex items-center space-x-8"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center p-2">
                <svg viewBox="0 0 16 16" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* DeFi liquidity symbol */}
                  <circle cx="6" cy="6" r="2" fill="#ffffff" opacity="0.9"/>
                  <circle cx="10" cy="10" r="1.5" fill="#ffffff" opacity="0.7"/>
                  {/* Flow line */}
                  <path d="M3 12c2-1 4 0 6-1" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8"/>
                  {/* Small dots for batching */}
                  <circle cx="2" cy="2" r="0.5" fill="#ffffff" opacity="0.8"/>
                  <circle cx="14" cy="14" r="0.5" fill="#ffffff" opacity="0.8"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
                  {t('header.title')}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-400">{t('header.subtitle')}</p>
                  <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">{t('header.mev_protected')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            {onPageChange && (
              <nav className="flex items-center space-x-2">
                <motion.button
                  onClick={() => onPageChange('liquidity')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    currentPage === 'liquidity'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">{t('header.add_liquidity')}</span>
                </motion.button>

                <motion.button
                  onClick={() => onPageChange('swap')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    currentPage === 'swap'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span className="font-medium">{t('header.swap')}</span>
                </motion.button>
              </nav>
            )}
          </motion.div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <NetworkSwitcher />
            <WalletConnection />
          </div>
        </div>
      </div>
    </motion.header>
  );
}