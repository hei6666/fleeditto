"use client";

import { Network } from "@aptos-labs/ts-sdk";
import { HyperionSDK, initHyperionSDK } from "@hyperionxyz/sdk";
import { createContext, useContext, useMemo } from "react";

export interface HyperionSDKContextState {
  SDK: HyperionSDK;
}

export const HyperionSDKContext = createContext<HyperionSDKContextState>(
  {} as HyperionSDKContextState
);

export function useHyperionSDK(): HyperionSDKContextState {
  return useContext(HyperionSDKContext);
}

export const HyperionSDKProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const SDK = useMemo(() => initHyperionSDK({
    network: Network.MAINNET,
    // Mainnet
    APTOS_API_KEY:"",
  }), []);

  return (
    <HyperionSDKContext.Provider value={{ SDK }}>
      {children}
    </HyperionSDKContext.Provider>
  );
};
