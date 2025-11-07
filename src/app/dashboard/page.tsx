// File: src/app/dashboard/page.tsx (REPLACE ENTIRE FILE)
"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import Link from "next/link"
import { User, Ticket, Settings, ArrowRight, Loader2, Award } from "lucide-react" 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton" 
import { createMockClient } from "@/lib/supabase-mock"; 
import { toast } from "react-toastify"; 

// --- CONDITIONAL SUPABASE CLIENT INITIALIZATION (ROBUST FIX) ---
const FAKE_SUPABASE_URL = "http://localhost:54321";
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isDemoMode = NEXT_PUBLIC_SUPABASE_URL === FAKE_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any;

if (isDemoMode) {
    // @ts-ignore
    supabase = createMockClient();
} else {
    supabase = createClient(NEXT_PUBLIC_SUPABASE_URL!, NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
// --- END CONDITIONAL SUPABASE CLIENT INITIALIZATION ---

// --- DEMO MOCK ADDRESS (Copied from host/page.tsx) ---
const DEMO_USER_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"; 
const userActions = [
    // --- FIX: Change href to the new dedicated /mytickets page ---
    { title: "My Tickets", description: "View and manage tickets you've purchased.", href: "/mytickets", icon: Ticket },
    // --- END FIX ---
    { title: "Host Events", description: "Create and manage events you host.", href: "/host", icon: ArrowRight },
    { title: "Update Profile", description: "Manage personal details and wallet connection.", href: "/profile", icon: Settings },
    { title: "View Leaderboard", description: "Check your attendance rank among all users.", href: "/leaderboard", icon: Award },
]


function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-48 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                ))}
            </div>
        </CardContent>
      </Card>
      
      <h2 className="text-2xl font-bold mb-4"><Skeleton className="h-8 w-48" /></h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
              <Card key={i} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-6">
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-10 w-24" />
                  </CardContent>
              </Card>
          ))}
      </div>
    </div>
  )
}


export default function DashboardPage() {
    const { activeAddress } = useWallet()
    
    const [isLoading, setIsLoading] = useState(true)
    const [userProfile, setUserProfile] = useState<any>(null)
    const [totalTickets, setTotalTickets] = useState(0) // Mock for now
    
    const finalAddress = activeAddress || DEMO_USER_ADDRESS;
    const isAddressReady = !!activeAddress || isDemoMode;
    const isConnected = !!activeAddress;

    useEffect(() => {
        if (!isAddressReady) {
            setIsLoading(true);
            return; 
        }

        async function fetchData() {
            setIsLoading(true);
            try {
                // 1. Fetch user profile (Supabase Mock handles creation if not found)
                let { data: profile } = await supabase.from("users").select("*").eq("wallet_address", finalAddress).single()
                
                // If in demo mode and no profile is found, create a mock one. (Supabase mock already handles this internally but good to be explicit for real API calls)
                if (!profile) {
                     // The upsert in host/page.tsx ensures a profile exists. Simulating a basic mock fetch here.
                     profile = { wallet_address: finalAddress, first_name: 'FairPass', last_name: 'User', created_at: new Date().toISOString() };
                }

                setUserProfile(profile)
                
                // 2. Fetch mock ticket count 
                // In a real app: SELECT count(*) FROM tickets WHERE user_id = userProfile.user_id
                setTotalTickets(Math.floor(Math.random() * 5) + 1); // Mock 1-5 tickets

            } catch (error) {
                console.error("Error fetching dashboard data:", error)
            } finally {
                setIsLoading(false);
            }
        }

        fetchData()
    }, [isAddressReady, activeAddress]) 


    if (isLoading || !isAddressReady) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-6xl mx-auto">
                        <LoadingSkeleton />
                    </div>
                </div>
            </div>
        );
    }
    
    const displayAddress = finalAddress.slice(0, 8) + '...' + finalAddress.slice(-6);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* Welcome Card & Stats */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-3xl font-bold">
                                Welcome Back, {userProfile?.first_name || "FairPass User"}!
                            </CardTitle>
                            <CardDescription className="text-lg text-gray-400">
                                This is your personalized event hub.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Profile Details and Quick Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card className="bg-gray-900/50 border-gray-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <h3 className="font-medium">Wallet Address</h3>
                                        <p className="font-mono text-xs truncate text-gray-400">{displayAddress}</p>
                                        <p className="text-sm text-green-500 mt-1">Status: {isConnected ? "Connected" : "Demo Mode"}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gray-900/50 border-gray-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Ticket className="w-5 h-5 text-green-500" />
                                            <Badge variant="outline">{totalTickets}</Badge>
                                        </div>
                                        <h3 className="font-medium">Total Tickets</h3>
                                        <p className="text-sm text-gray-400">Owned NFTs</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gray-900/50 border-gray-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Award className="w-5 h-5 text-yellow-500" />
                                            <Badge variant="outline">Bronze</Badge>
                                        </div>
                                        <h3 className="font-medium">Loyalty Tier</h3>
                                        <p className="text-sm text-gray-400">Next tier: Silver</p>
                                    </CardContent>
                                </Card>
                            </div>

                        </CardContent>
                    </Card>

                    {/* Quick Links Section */}
                    <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {userActions.map((action) => (
                            <Link key={action.title} href={action.href} className="group">
                                <Card className="bg-gray-800/50 border-gray-700 hover:border-primary transition-colors h-full">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <action.icon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                                                <h3 className="text-xl font-semibold group-hover:text-white transition-colors">
                                                    {action.title}
                                                </h3>
                                            </div>
                                            <p className="text-gray-400 text-sm">{action.description}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-500 group-hover:translate-x-1 transition-transform" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/* Placeholder for Upcoming Events */}
                    <h2 className="text-2xl font-bold mb-4 pt-4">Your Upcoming Events</h2>
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-10 text-center">
                            <Ticket className="w-10 h-10 mx-auto mb-4 text-gray-600" />
                            <p className="text-lg text-gray-400">You currently have no upcoming event tickets.</p>
                            <Button asChild className="mt-4">
                                <Link href="/events">Explore Events</Link>
                            </Button>
                        </CardContent>
                    </Card>
                    
                </div>
            </div>
        </div>
    )
}