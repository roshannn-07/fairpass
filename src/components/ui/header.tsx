// File: src/components/ui/header.tsx
"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wallet2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ConnectWalletModal from "./ConnectWalletModal";
import { useWallet } from "@txnlab/use-wallet-react";
import { toast } from "react-toastify";

const navigationItems = [
  { name: "Events", href: "/events" },
  { name: "Calendars", href: "/calendars" },
  // MODIFIED: Added Leaderboard page link
  { name: "Leaderboard", href: "/leaderboard" },
  { name: "Host", href: "/host" },
]

export function SiteHeader() {
  console.log("SiteHeader component initialized")
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { activeAccount, wallets } = useWallet()
  
  // START HYDRATION FIX
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // END HYDRATION FIX

  const handleConnect = () => {
    if (activeAccount) {
      toast.info(`Already connected: ${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}`)
    } else {
      setIsModalOpen(true)
    }
  }
  
  // Determine the button content based on the mounted state
  const buttonContent = mounted && activeAccount 
    ? `${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}`
    : "Connect Wallet";
    
  const isWalletButtonReady = mounted;


  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md supports-[backdrop-filter]:bg-black/20">
      <div className="container mx-auto flex h-15 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">FairPass</span>
          </Link>
        </div>

        <nav className="flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium text-gray-300 rounded-full transition-colors hover:text-white hover:bg-white/5",
                pathname === item.href && "text-white bg-white/5",
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            className="text-white border-white/20 hover:bg-white/5" 
            onClick={handleConnect}
            // REMOVED THE CAUSING LINE: disabled={!isWalletButtonReady && !!activeAccount} 
          >
            <Wallet2 className="mr-2 h-5 w-5" />
            
            {/* Conditional render to fix Hydration Error */}
            {isWalletButtonReady ? (
                buttonContent
            ) : (
                // Render the universal server-side default until mounted
                "Connect Wallet"
            )}
            
          </Button>
        </div>
      </div>

      <ConnectWalletModal wallets={wallets} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  )
}