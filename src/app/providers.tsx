// File: src/app/providers.tsx (CRITICAL PERFORMANCE FIX)
"use client";

import type React from "react";
// REMOVED: import { NetworkId, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic"; // <-- NEW IMPORT

// --- Dynamic Component for Wallet Logic ---
// We move all heavy wallet and network configuration into a dynamically imported component.
// This prevents the main bundle from loading the entire @txnlab/use-wallet-react library
// during the initial page load, thus unblocking the main thread.

const DynamicWalletProvider = dynamic(
  () => import('./wallet-loader').then((mod) => mod.WalletLoader),
  { 
    ssr: false, // CRITICAL: This ensures the heavy code only runs client-side after initial render
    loading: () => <div></div>, // Optional: A minimal loading state
  }
);
// ------------------------------------------


export function Providers({ children }: { children: React.ReactNode }) {
    return (
    // FIX: Wrap the app in the dynamically loaded provider
    <DynamicWalletProvider>
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
    </DynamicWalletProvider>
  );
}