"use client";

import { TokenInput } from './TokenInput';
import { useAppContext, useAppActions, useAvailableBalances } from '../contexts/AppContext';

interface ConnectedTokenInputProps {
  tokenType: 'A' | 'B';
  label: string;
  readOnly?: boolean;
  value?: string;
  // New props for smart liquidity calculation
  isCalculating?: boolean;
  isPrimaryInput?: boolean;
  onPrimaryInputChange?: (isPrimary: boolean) => void;
  // Only show address input, hide amount input
  addressOnly?: boolean;
  // Only show amount input and token info, hide address input
  amountOnly?: boolean;
}

export function ConnectedTokenInput({
  tokenType,
  label,
  readOnly = false,
  value,
  isCalculating = false,
  isPrimaryInput = false,
  onPrimaryInputChange,
  addressOnly = false,
  amountOnly = false
}: ConnectedTokenInputProps) {
  const { state } = useAppContext();
  const actions = useAppActions();
  const { getAvailableBalance } = useAvailableBalances();

  const tokenData = tokenType === 'A' ? state.tokenA : state.tokenB;
  const availableBalance = tokenData.address ? getAvailableBalance(tokenData.address) : undefined;
  
  const handleAddressChange = (address: string) => {
    if (tokenType === 'A') {
      actions.setTokenAAddress(address);
    } else {
      actions.setTokenBAddress(address);
    }
  };

  const handleAmountChange = (amount: string) => {
    if (tokenType === 'A') {
      actions.setTokenAAmount(amount);
    } else {
      actions.setTokenBAmount(amount);
    }

    // Trigger calculation when primary input changes
    if (isPrimaryInput && onPrimaryInputChange) {
      // This will be handled by the parent component (LiquidityDashboard)
      // which will detect the change via the AppContext and trigger calculation
    }
  };

  const handleTokenChange = (metadata: any) => {
    if (tokenType === 'A') {
      actions.setTokenAMetadata(metadata);
    } else {
      actions.setTokenBMetadata(metadata);
    }
  };

  const handleBalanceChange = (balance: any) => {
    if (tokenType === 'A') {
      actions.setTokenAWalletBalance(balance); // Set original wallet balance
    } else {
      actions.setTokenBWalletBalance(balance); // Set original wallet balance
    }
  };

  return (
    <TokenInput
      label={label}
      placeholder="Enter token address"
      value={value !== undefined ? value : tokenData.amount}
      tokenAddress={tokenData.address}
      onAddressChange={handleAddressChange}
      onChange={readOnly ? () => {} : handleAmountChange}
      onTokenChange={handleTokenChange}
      onBalanceChange={handleBalanceChange}
      readOnly={readOnly}
      isCalculating={isCalculating}
      isPrimaryInput={isPrimaryInput}
      onPrimaryInputChange={onPrimaryInputChange}
      availableBalance={availableBalance}
      addressOnly={addressOnly}
      amountOnly={amountOnly}
    />
  );
}