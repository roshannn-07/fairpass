"use client";

import type React from "react";
import { NetworkId, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// FIX 1 & 2: Correct Algod Configuration & Added Demo Mnemonic
const ALGOD_TESTNET_CONFIG = {
  algod: {
    token: '',
    server: 'https://testnet-api.algonode.cloud', 
    port: '', // Port is correctly left blank when using a full URL
  },
};

// NOTE: This is a 25-word mnemonic for a PUBLIC TestNet dispenser account. 
// It is used here only for the DEMO_WALLET feature and must NOT be used for real assets.
const DEMO_TESTNET_MNEMONIC = 'roof absurd zoo fire bar picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat picnic boat';

const walletManager = new WalletManager({
  wallets: [
    WalletId.DEFLY,
    WalletId.PERA,
    WalletId.EXODUS,
    {
      id: WalletId.LUTE,
      options: { siteName: "FairPass Events" }, // Renamed Julo to FairPass
    },
    // ADDED SEPARATE MNEMONIC WALLET FOR DEMO ACCESS (Named "Demo Wallet (TestNet)")
    {
        id: WalletId.MNEMONIC,
        options: {
            name: "Demo Wallet (TestNet)", // Custom Name
            mnemonic: DEMO_TESTNET_MNEMONIC
        }
    }
  ],
  defaultNetwork: NetworkId.TESTNET,
  // ADDED ALGOD CONFIGURATION (Fixes the algodClient error)
  networkConfig: {
    [NetworkId.TESTNET]: ALGOD_TESTNET_CONFIG
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
    console.log("Providers component executed")
    console.log("WalletProvider initialized")
    return (
    <WalletProvider manager={walletManager}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </WalletProvider>
  );
}