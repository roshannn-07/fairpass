// File: src/app/mytickets/page.tsx (THE FINAL SIMPLEST VERSION)
"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { format } from "date-fns"
import Link from "next/link"
import { Ticket, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "react-toastify"

// NOTE: Algorand and Supabase dependencies are now conditionally imported/used
// to prevent the global URL error.

type TicketItem = {
    asset_id: number;
    event_name: string;
    event_date: string;
    location: string;
    image_url: string;
}

// Mock function for fetching tickets
const fetchMockTickets = (): TicketItem[] => {
    return [
        // asset_id: 12345 is the magic mock ID that passes the asset holding check in algorand-utils.ts
        { asset_id: 12345, event_name: "Mock DevCon 2025", event_date: new Date(Date.now() + 86400000).toISOString(), location: "The Cloud", image_url: "ipfs://QmVitaDemoHashForMockImage" },
        { asset_id: 67890, event_name: "FairPass Launch Party", event_date: new Date(Date.now() - 86400000 * 2).toISOString(), location: "Global Metaverse", image_url: "ipfs://QmVitaDemoHashForMockImage" },
        { asset_id: 54321, event_name: "Algorand Workshop", event_date: new Date(Date.now() + 86400000 * 5).toISOString(), location: "Boston", image_url: "ipfs://QmVitaDemoHashForMockImage" },
    ];
};

function LoadingSkeleton() {
    return (
        <div className="space-y-4 max-w-6xl mx-auto">
             <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function MyTicketsPage() {
    const { activeAddress, algodClient: actualAlgodClient } = useWallet();
    const [isLoading, setIsLoading] = useState(true);
    const [myTickets, setMyTickets] = useState<TicketItem[]>([]);

    const DEMO_USER_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"; 
    const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === "http://localhost:54321"; // Simple check
    const finalAddress = activeAddress || DEMO_USER_ADDRESS;
    const isAddressReady = !!activeAddress || isDemoMode;
    const isConnected = !!activeAddress;

    // Fetch User Tickets (Runs ONLY AFTER RENDER)
    useEffect(() => {
        if (!isAddressReady) return;

        // NOTE: We cannot rely on the imported checkAssetHolding here as it uses global imports.
        // We will mock the ticket check logic directly in this useEffect.
        async function fetchTickets() {
            setIsLoading(true);
            try {
                // *** SIMPLIFIED MOCK TICKET CHECK ***
                const mockAvailableTickets = fetchMockTickets();
                const heldTickets: TicketItem[] = [];

                if (activeAddress && actualAlgodClient) {
                    // If a wallet is connected, use the actual Algorand client
                    // to perform a check that is safely provided by the hook.
                    // This is the intended real-time path.

                    // NOTE: We rely on the hook's algodClient being safely initialized.
                    // If this still fails, the error is in @txnlab/use-wallet-react setup.
                    
                    // For the demo, we will use the MOCK ID check:
                    for (const ticket of mockAvailableTickets) {
                        // The asset 12345 is hardcoded in the utility to return TRUE.
                        if (ticket.asset_id === 12345) {
                             heldTickets.push(ticket);
                        }
                    }
                    
                } else if (isDemoMode) {
                    // Demo Mode (No wallet connected, use hardcoded mock check)
                    heldTickets.push(mockAvailableTickets.find(t => t.asset_id === 12345)!);
                }

                setMyTickets(heldTickets.filter(Boolean));
                // *** END SIMPLIFIED MOCK TICKET CHECK ***

            } catch (error) {
                console.error("Error fetching tickets:", error);
                toast.error("Failed to load your tickets.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchTickets();
    }, [isAddressReady, activeAddress, actualAlgodClient]);


    if (isLoading) {
        return (
             <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 py-12"><LoadingSkeleton /></div>
        )
    }

    if (!activeAddress && !isDemoMode) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
                <Card className="w-full max-w-md mx-4 bg-gray-800/50 border-gray-700 text-center">
                    <CardHeader><CardTitle>Connect Wallet</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-gray-400 mb-6">Please connect your wallet to view your tickets.</p>
                        <Button onClick={() => toast.info("Use the 'Connect Wallet' button in the header.")}>
                            Connect Wallet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 py-12">
            <div className="max-w-6xl mx-auto px-4">
                <h1 className="text-4xl font-bold mb-8 flex items-center text-white">
                    <Ticket className="w-8 h-8 mr-3 text-primary" />
                    My NFT Tickets
                </h1>
                
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white">Tickets Found ({myTickets.length})</CardTitle>
                        <CardDescription className="text-gray-400">
                            Tickets found in your wallet ({isConnected ? 'Connected' : 'Demo Mode'}).
                            Only Asset ID 12345 is mock-held in this version.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {myTickets.length === 0 ? (
                            <div className="text-center p-8">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                <p className="text-lg text-gray-400">No NFT tickets found in your wallet.</p>
                                <Button asChild className="mt-4">
                                    <Link href="/events">Find an Event</Link>
                                </Button>
                            </div>
                        ) : (
                            myTickets.map((ticket) => (
                                <Card key={ticket.asset_id} className="bg-gray-900/50 border-gray-700">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                            <div>
                                                <p className="font-semibold">{ticket.event_name}</p>
                                                <p className="text-sm text-gray-400">Asset ID: {ticket.asset_id} | {format(new Date(ticket.event_date), "MMM d, yyyy")}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/ticket/view/${ticket.asset_id}`}>View Ticket</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}