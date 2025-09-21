'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'zh-CN';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 简体中文和英文翻译
const translations = {
  'en': {
    // Header
    'header.title': 'Fleeditto',
    'header.subtitle': 'Aptos DeFi Liquidity Manager',
    'header.mev_protected': 'MEV Protected',
    'header.add_liquidity': 'Add Liquidity',
    'header.swap': 'Swap',

    // Steps
    'step.select_exchange': 'Select Exchange',
    'step.select_pair': 'Select Trading Pair',
    'step.select_fee_tier': 'Select Fee Tier',
    'step.configure_liquidity': 'Configure Liquidity',
    'step.advanced_submit': 'Advanced Settings & Submit',

    // Token Configuration
    'token.config_title': 'Token Configuration',
    'token.config_desc': 'Select the two tokens to provide liquidity for',
    'token.base_token': 'Base Token',
    'token.quote_token': 'Quote Token',
    'token.pair_selected': 'Trading pair selection completed',

    // Fee Tier
    'fee.tier_title': 'Fee Tier',
    'fee.tier_desc': 'Choose the fee tier for your liquidity position',
    'fee.ultra_stable': 'Ultra Stable',
    'fee.stable': 'Stable',
    'fee.blue_chip': 'Blue Chip',
    'fee.standard': 'Standard',
    'fee.most_pairs': 'Most Pairs',
    'fee.volatile': 'Volatile',

    // Price Range
    'price.range_title': 'Price Range Setting',
    'price.range_desc': 'View price chart and set the price range for liquidity provision',

    // Amount Input
    'amount.title': 'Liquidity Amount',
    'amount.desc': 'Select the token to input amount, the other token amount will be calculated automatically',
    'amount.calculation_complete': 'Liquidity calculation completed',
    'amount.amount': 'Amount',

    // APR
    'apr.title': 'Expected Returns (APR)',
    'apr.fee_apr': 'Fee APR',
    'apr.farm_apr': 'Farm APR',
    'apr.total_apr': 'Total APR',
    'apr.daily_volume': 'Daily Volume',
    'apr.annual_return': 'Annual Return',
    'apr.calculating': 'Calculating expected APR...',
    'apr.input_amount_prompt': 'Input liquidity amount to see expected APR',

    // Advanced Settings
    'advanced.title': 'Advanced Settings',
    'advanced.slippage': 'Slippage Tolerance (%)',

    // Submit
    'submit.title': 'Submit Liquidity',
    'submit.add_to_batch': 'Add to Batch',
    'submit.batch_hint': '✨ You can add multiple liquidity positions to the batch, then submit them all at once',
    'submit.insufficient_balance': 'Insufficient balance:',
    'submit.available': 'available',

    // Pending Positions
    'pending.title': 'Pending Positions',
    'pending.ready': 'position ready|positions ready',
    'pending.clear_all': 'Clear All',
    'pending.mev_protected': 'MEV Protected Batch Execution',
    'pending.execute_batch': 'Execute Batch',
    'pending.executing': 'Executing Batch...',
    'pending.remove': 'Remove',
    'pending.fee_tier': 'Fee Tier',
    'pending.price_range': 'Price Range',
    'pending.value': 'Est. Value',
    'pending.no_positions': 'No pending positions',
    'pending.configure_prompt': 'Configure liquidity and add to batch',
    'pending.total_positions': 'Total Positions',
    'pending.annual_income': 'Est. Annual Income',
    'pending.gas_optimization': 'Gas Optimization',

    // User Positions
    'positions.title': 'Your Positions',
    'positions.back': 'Back to Liquidity',
    'positions.loading': 'Loading your positions...',
    'positions.no_positions': 'No positions found',
    'positions.remove': 'Remove',
    'positions.harvest': 'Harvest',
    'positions.add_liquidity': 'Add Liquidity',
    'positions.pool': 'Pool',
    'positions.range': 'Range',
    'positions.liquidity': 'Liquidity',
    'positions.fees_earned': 'Fees Earned',
    'positions.in_range': 'In Range',
    'positions.out_of_range': 'Out of Range',
    'positions.connect_prompt': 'Please connect your wallet to view your positions.',
    'positions.manage_desc': 'Manage your liquidity positions',
    'positions.fetching_desc': 'Fetching your liquidity positions...',
    'positions.position': 'Position',
    'positions.total_value': 'Total Value',
    'positions.pool_fee_rate': 'Pool Fee Rate',
    'positions.token_ratio': 'Token Ratio',
    'positions.unclaimed_rewards': 'Unclaimed Rewards',
    'positions.created': 'Created',
    'positions.view_details': 'View Details',
    'positions.no_positions_desc': 'You haven\'t created any liquidity positions yet. Start by adding liquidity to earn fees from trading activity.',
    'positions.add_first': 'Add Your First Position',
    'positions.close_all': 'Close All',

    // Swap Dashboard
    'swap.title': 'Token Swap',
    'swap.from': 'From',
    'swap.to': 'To',
    'swap.swap_button': 'Swap',
    'swap.review': 'Review Swap',
    'swap.estimated_output': 'Estimated Output',
    'swap.price_impact': 'Price Impact',
    'swap.minimum_received': 'Minimum Received',
    'swap.route': 'Route',
    'swap.slippage': 'Slippage Tolerance',
    'swap.advanced_settings': 'Advanced Settings',
    'swap.insufficient_balance': 'Insufficient Balance',
    'swap.enter_amount': 'Enter amount',
    'swap.calculating': 'Calculating...',
    'swap.no_route': 'No route found',
    'swap.mev_protected': 'MEV Protected Swaps',
    'swap.mev_description': 'Your transactions are protected from front-running and sandwich attacks',
    'swap.active_protection': 'Active Protection',
    'swap.optimal_price': 'Optimal Price Discovery',
    'swap.front_running_protection': 'Front-Running Protection',
    'swap.gas_optimized': 'Gas Optimized',
    'swap.powered_by': 'Powered by Hyperion',
    'swap.you_pay': 'You Pay',
    'swap.you_receive': 'You Receive',
    'swap.rate': 'Rate',
    'swap.enter_amount_rate': 'Enter amount to see rate',
    'swap.mev_protection': 'MEV Protection',
    'swap.enabled': 'Enabled',
    'swap.swapping': 'Swapping...',
    'swap.select_tokens': 'Select tokens',
    'swap.invalid_amount': 'Invalid amount',
    'swap.success_title': 'Swap Successful!',
    'swap.success_message': 'Your tokens have been swapped successfully with MEV protection.',
    'swap.transaction_hash': 'Transaction Hash',
    'swap.view_explorer': 'View on Explorer',
    'swap.custom': 'Custom',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.connect_wallet': 'Connect Wallet',
    'common.calculating': 'Calculating...',
    'common.remove': 'Remove',
    'common.back': 'Back',
    'common.refresh': 'Refresh',
    'common.current_price': 'Current Price',
  },
  'zh-CN': {
    // Header
    'header.title': 'Fleeditto',
    'header.subtitle': 'Aptos DeFi 流动性管理器',
    'header.mev_protected': 'MEV 保护',
    'header.add_liquidity': '添加流动性',
    'header.swap': '交换',

    // Steps
    'step.select_exchange': '选择交易所',
    'step.select_pair': '选择交易对',
    'step.select_fee_tier': '选择手续费等级',
    'step.configure_liquidity': '配置流动性',
    'step.advanced_submit': '进阶设定与提交',

    // Token Configuration
    'token.config_title': '代币配置',
    'token.config_desc': '选择要提供流动性的两个代币',
    'token.base_token': '基础代币',
    'token.quote_token': '报价代币',
    'token.pair_selected': '交易对选择完成',

    // Fee Tier
    'fee.tier_title': '手续费等级',
    'fee.tier_desc': '为您的流动性头寸选择手续费等级',
    'fee.ultra_stable': '超稳定',
    'fee.stable': '稳定',
    'fee.blue_chip': '蓝筹',
    'fee.standard': '标准',
    'fee.most_pairs': '大多数交易对',
    'fee.volatile': '波动',

    // Price Range
    'price.range_title': '价格区间设定',
    'price.range_desc': '查看价格图表并设定流动性提供的价格范围',

    // Amount Input
    'amount.title': '流动性数量',
    'amount.desc': '选择要输入数量的代币，另一个代币数量将自动计算',
    'amount.calculation_complete': '流动性计算完成',
    'amount.amount': '数量',

    // APR
    'apr.title': '预期收益 (APR)',
    'apr.fee_apr': '手续费收益',
    'apr.farm_apr': '挖矿收益',
    'apr.total_apr': '总收益',
    'apr.daily_volume': '每日交易量',
    'apr.annual_return': '年化收益率',
    'apr.calculating': '正在计算预期APR...',
    'apr.input_amount_prompt': '输入流动性数量后将显示预期APR',

    // Advanced Settings
    'advanced.title': '进阶设定',
    'advanced.slippage': '滑点容忍度 (%)',

    // Submit
    'submit.title': '提交流动性',
    'submit.add_to_batch': '加入批次处理',
    'submit.batch_hint': '✨ 您可以添加多个流动性位置到批次中，然后一次性提交',
    'submit.insufficient_balance': '余额不足：',
    'submit.available': '可用',

    // Pending Positions
    'pending.title': '待处理位置',
    'pending.ready': '个位置已准备好|个位置已准备好',
    'pending.clear_all': '清空所有',
    'pending.mev_protected': 'MEV 保护批量执行',
    'pending.execute_batch': '执行批量',
    'pending.executing': '正在执行批量...',
    'pending.remove': '移除',
    'pending.fee_tier': '手续费等级',
    'pending.price_range': '价格区间',
    'pending.value': '预估价值',
    'pending.no_positions': '暂无待处理位置',
    'pending.configure_prompt': '配置流动性并添加到批次',
    'pending.total_positions': '总位置数',
    'pending.annual_income': '预估年收入',
    'pending.gas_optimization': 'Gas 优化',

    // User Positions
    'positions.title': '我的持仓',
    'positions.back': '返回流动性',
    'positions.loading': '正在加载您的持仓...',
    'positions.no_positions': '未找到持仓',
    'positions.remove': '移除',
    'positions.harvest': '收获',
    'positions.add_liquidity': '添加流动性',
    'positions.pool': '资金池',
    'positions.range': '区间',
    'positions.liquidity': '流动性',
    'positions.fees_earned': '已赚取手续费',
    'positions.in_range': '在区间内',
    'positions.out_of_range': '超出区间',
    'positions.connect_prompt': '请连接您的钱包以查看持仓。',
    'positions.manage_desc': '管理您的流动性位置',
    'positions.fetching_desc': '正在获取您的流动性位置...',
    'positions.position': '位置',
    'positions.total_value': '总价值',
    'positions.pool_fee_rate': '资金池手续费率',
    'positions.token_ratio': '代币比例',
    'positions.unclaimed_rewards': '未领取奖励',
    'positions.created': '创建于',
    'positions.view_details': '查看详情',
    'positions.no_positions_desc': '您还没有创建任何流动性位置。通过添加流动性开始赚取交易手续费。',
    'positions.add_first': '添加您的第一个位置',
    'positions.close_all': '关闭全部',

    // Swap Dashboard
    'swap.title': '代币交换',
    'swap.from': '从',
    'swap.to': '到',
    'swap.swap_button': '交换',
    'swap.review': '审核交换',
    'swap.estimated_output': '预估输出',
    'swap.price_impact': '价格影响',
    'swap.minimum_received': '最少收到',
    'swap.route': '路径',
    'swap.slippage': '滑点容忍度',
    'swap.advanced_settings': '高级设置',
    'swap.insufficient_balance': '余额不足',
    'swap.enter_amount': '输入数量',
    'swap.calculating': '计算中...',
    'swap.no_route': '未找到路径',
    'swap.mev_protected': 'MEV 保护交换',
    'swap.mev_description': '您的交易受到保护，防止抢跑和夹心攻击',
    'swap.active_protection': '活跃保护',
    'swap.optimal_price': '最优价格发现',
    'swap.front_running_protection': '抢跑保护',
    'swap.gas_optimized': 'Gas 优化',
    'swap.powered_by': '由 Hyperion 提供支持',
    'swap.you_pay': '您支付',
    'swap.you_receive': '您收到',
    'swap.rate': '汇率',
    'swap.enter_amount_rate': '输入数量查看汇率',
    'swap.mev_protection': 'MEV 保护',
    'swap.enabled': '已启用',
    'swap.swapping': '交换中...',
    'swap.select_tokens': '选择代币',
    'swap.invalid_amount': '无效数量',
    'swap.success_title': '交换成功！',
    'swap.success_message': '您的代币已在 MEV 保护下成功交换。',
    'swap.transaction_hash': '交易哈希',
    'swap.view_explorer': '在浏览器中查看',
    'swap.custom': '自定义',

    // Common
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.connect_wallet': '连接钱包',
    'common.calculating': '计算中...',
    'common.remove': '移除',
    'common.back': '返回',
    'common.refresh': '刷新',
    'common.current_price': '当前价格',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh-CN');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('fleeditto-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh-CN')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage when it changes
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('fleeditto-language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}