// File: src/app/wallet-loader.tsx (New file for Dynamic Loading)
"use client";

import React from "react";
import { NetworkId, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react";

// FIX 1: Switched to a known stable TestNet node
const ALGOD_TESTNET_CONFIG = {
  algod: {
    token: '',
    server: 'https://node.testnet.algoexplorerapi.io', 
    port: '', 
  },
};

const DEMO_TESTNET_MNEMONIC = 'roof absurd zoo fire bar picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat';

const walletManager = new WalletManager({
  wallets: [
    WalletId.DEFLY,
    WalletId.PERA,
    {
      id: WalletId.LUTE,
      options: { siteName: "FairPass NFT Ticketing" }, 
    },
    {
        id: WalletId.MNEMONIC,
        options: {
            name: "Demo Wallet (TestNet)",
            mnemonic: DEMO_TESTNET_MNEMONIC
        }
    }
  ],
  defaultNetwork: NetworkId.TESTNET,
  networkConfig: {
    [NetworkId.TESTNET]: ALGOD_TESTNET_CONFIG
  }
});

// Component to hold the heavy provider
export function WalletLoader({ children }: { children: React.ReactNode }) {
    return (
        <WalletProvider manager={walletManager}>
            {children}
        </WalletProvider>
    );
}

