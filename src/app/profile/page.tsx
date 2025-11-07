// File: src/app/profile/page.tsx (FINAL FIX: Robust Disconnect using wallets array)
"use client"

import { useWallet } from "@txnlab/use-wallet-react" // Import is fine
import { User, Mail, Wallet, Edit, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserDetailsDialog } from "@/components/user-details-dialog"
import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { createClient } from "@supabase/supabase-js"
import { getOrCreateUser } from "@/lib/userCreation"
import { format } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"


// --- CONDITIONAL SUPABASE CLIENT INITIALIZATION ---
const FAKE_SUPABASE_URL = "http://localhost:54321";
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isDemoMode = NEXT_PUBLIC_SUPABASE_URL === FAKE_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any;
if (isDemoMode) {
    // We cannot use the full mock client here as it is complex. We'll simulate the fetch.
    supabase = null; 
} else {
    supabase = createClient(NEXT_PUBLIC_SUPABASE_URL!, NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
// --- END CONDITIONAL SUPABASE CLIENT INITIALIZATION ---


// Define a simple profile state structure
type UserProfile = {
    wallet_address: string;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
}

// Mock function for fetching profile
const fetchMockProfile = (address: string): UserProfile => ({
    wallet_address: address,
    first_name: "Mock",
    last_name: "User",
    email: "mock.user@fairpass.com",
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
});


export default function ProfilePage() {
    // UPDATED: Destructure the full 'wallets' array and the original 'disconnect' for the safer version
    const { activeAddress, disconnect: hookDisconnect, wallets } = useWallet() 
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [profile, setProfile] = useState<UserProfile | null>(null)

    const finalAddress = activeAddress || "CONNECT_YOUR_WALLET";
    const isConnected = !!activeAddress;

    useEffect(() => {
        if (!isConnected && finalAddress === "CONNECT_YOUR_WALLET") {
            setIsLoading(false);
            return;
        }

        async function fetchProfile() {
            setIsLoading(true);
            try {
                if (isConnected && supabase) {
                    // Real fetch attempt
                    const { data } = await supabase.from("users").select("*").eq("wallet_address", finalAddress).single();
                    if (data) {
                        setProfile(data as UserProfile);
                    } else {
                        // User exists on chain but not in DB, force data entry
                        setIsModalOpen(true); 
                        setProfile({ wallet_address: finalAddress, first_name: '', last_name: '', email: '', created_at: new Date().toISOString() });
                    }
                } else {
                    // Demo/Mock fallback
                    setProfile(fetchMockProfile(finalAddress));
                    // The "Connect wallet to save real data" toast is triggered here
                    toast.info("Using mock profile data. Connect wallet to save real data.", { autoClose: 3000 });
                }
            } catch (error) {
                console.error("Profile fetch error:", error);
                setProfile(fetchMockProfile(finalAddress)); // Fallback to mock
            } finally {
                setIsLoading(false);
            }
        }
        fetchProfile()
    }, [isConnected, finalAddress])

    const handleProfileUpdate = async (data: { email: string; firstName: string; lastName: string }) => {
        setIsModalOpen(false)
        if (!finalAddress) {
            toast.error("Cannot update profile: Wallet not connected.");
            return;
        }
        
        // Use the existing utility to create or update the user
        const { error } = await getOrCreateUser(finalAddress, {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
        });

        if (error && !isDemoMode) { // Only show real error if not in demo mode
            toast.error("Failed to update profile details.");
            console.error(error);
        } else {
            // Update local state for display
            setProfile({
                ...profile,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
            } as UserProfile)
            toast.success("Profile updated successfully!");
        }
    }
    
    // --- FINAL ROBUST DISCONNECT HANDLER ---
    const handleDisconnect = async () => {
        try {
            // 1. Iterate and disconnect all active sessions
            for (const wallet of wallets) {
                if (wallet.isConnected) {
                    await wallet.disconnect();
                }
            }
            
            // 2. Fallback to the hook's disconnect if needed (or if it handles the session manager reset)
            if (typeof hookDisconnect === 'function') {
                await hookDisconnect();
            }

            toast.success("Wallet disconnected. Refreshing application state...");
            // 3. Force a hard reload after a short delay to reset the wallet state
            setTimeout(() => {
                window.location.reload();
            }, 500); 
        } catch (error) {
            console.error("Disconnect failed:", error);
            toast.error("Failed to disconnect wallet. Please try again or disconnect from your wallet app.");
        }
    }
    // --- END FINAL ROBUST DISCONNECT HANDLER ---


    if (!isConnected && finalAddress === "CONNECT_YOUR_WALLET") {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
                <Card className="w-full max-w-md mx-4 bg-gray-800/50 border-gray-700 text-center">
                    <CardHeader><CardTitle>Connect Wallet</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-gray-400 mb-6">Please connect your Algorand wallet to view your profile and manage details.</p>
                        <Button onClick={() => toast.info("Use the 'Connect Wallet' button in the header.")}>
                            Connect Wallet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isLoading) {
         return (
             <div className="min-h-screen bg-gray-900 text-white p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <h1 className="text-4xl font-bold">Loading Profile...</h1>
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="h-40 w-full bg-gray-800/50 border-gray-700"><CardContent className="p-6"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>
                        <Card className="h-40 w-full bg-gray-800/50 border-gray-700"><CardContent className="p-6"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>
                    </div>
                </div>
             </div>
         )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold">User Profile</h1>
                    <Button variant="outline" onClick={() => setIsModalOpen(true)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit Details
                    </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Wallet Details Card */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Wallet className="w-6 h-6 text-primary" />
                                <span>Wallet Connection</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-400">Status</p>
                                <Badge className={cn("mt-1", isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                                    {isConnected ? "Connected" : "Demo Mode"}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400">Wallet Address</p>
                                <p className="font-mono text-sm break-all">{finalAddress}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400">Member Since</p>
                                <p className="text-sm">
                                    {profile?.created_at ? format(new Date(profile.created_at), "MMMM d, yyyy") : "N/A"}
                                </p>
                            </div>
                            {isConnected && (
                                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                                    Disconnect Wallet
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Personal Details Card */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <User className="w-6 h-6 text-primary" />
                                <span>Personal Information</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-400">Full Name</p>
                                <p className="text-lg font-semibold text-white">
                                    {profile?.first_name || "N/A"} {profile?.last_name || ""}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400">Email Address</p>
                                <p className="text-lg text-white">{profile?.email || "N/A"}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Other Settings Placeholder */}
                <div className="mt-8 space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Other Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-white">Notification Preferences</p>
                                    <p className="text-sm text-gray-400">Manage which types of email and push notifications you receive.</p>
                                    <Button variant="link" className="p-0 h-auto mt-2">Go to Notifications</Button>
                                </div>
                                <Separator className="bg-gray-700" />
                                <div>
                                    <p className="text-sm font-medium text-white">Security & Privacy</p>
                                    <p className="text-sm text-gray-400">Review our terms and conditions, and manage data consent.</p>
                                    <Button variant="link" className="p-0 h-auto mt-2" asChild><Link href="/privacy">View Privacy Policy</Link></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* User Details Dialog for editing */}
            <UserDetailsDialog 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleProfileUpdate}
            />
        </div>
    )
}