'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';

const languages = [
  { code: 'zh-CN' as Language, name: '简体中文', flag: '🇨🇳' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' }
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 hover:border-teal-400/30 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Globe className="w-4 h-4 text-teal-400" />
        <span className="text-sm font-medium">{currentLanguage.flag}</span>
        <span className="text-sm hidden sm:block">{currentLanguage.name}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-48 bg-gray-900/95 backdrop-filter backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50"
            >
              <div className="p-2">
                {languages.map((lang) => (
                  <motion.button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      language === lang.code
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                    {language === lang.code && (
                      <motion.div
                        className="ml-auto w-2 h-2 bg-teal-400 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}