// File: src/app/leaderboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Award, Trophy, Users, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// NOTE: Using the real supabase client here, a mock could be implemented in src/lib/supabase-mock.ts if needed.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type LeaderboardEntry = {
  wallet_address: string
  total_events_attended: number
  rank: number
  // ADDED: Name fields for display
  firstName: string
  lastName: string
}

// MOCK FUNCTION FOR LEADERBOARD DATA (UPDATED WITH NAMES)
async function fetchLeaderboardData(): Promise<LeaderboardEntry[]> {
    console.log("[DEMO MOCK] Fetching mocked leaderboard data with names...")
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading

    const mockData = [
        { 
            wallet_address: "5F7D3A4B2C1D...AD12", total_events_attended: 8, rank: 1,
            firstName: "Satoshi", lastName: "Nakamoto" 
        },
        { 
            wallet_address: "B3A4C2E1F0G9...CD78", total_events_attended: 6, rank: 2,
            firstName: "Vitalik", lastName: "Buterin" 
        },
        { 
            wallet_address: "A9E1F2G3H4I5...B0F3", total_events_attended: 5, rank: 3,
            firstName: "Silvio", lastName: "Micali" 
        },
        { 
            wallet_address: "C4B2A1D0E9F8...E9G0", total_events_attended: 4, rank: 4,
            firstName: "Mock", lastName: "Attendee One" 
        },
        { 
            wallet_address: "D8C3B2A1E0F9...F1H4", total_events_attended: 3, rank: 5,
            firstName: "Mock", lastName: "Attendee Two" 
        },
    ]

    return mockData.map((entry, index) => ({
        ...entry,
        rank: index + 1
    }))
}


export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setIsLoading(true)
        fetchLeaderboardData().then(data => {
            setLeaderboard(data)
            setIsLoading(false)
        })
    }, [])

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-yellow-500 text-black";
            case 2:
                return "bg-gray-400 text-black";
            case 3:
                return "bg-amber-600 text-white";
            default:
                return "bg-gray-700 text-white";
        }
    }

    // Helper function to truncate wallet address for display
    const truncateAddress = (address: string) => 
        `${address.slice(0, 4)}...${address.slice(-4)}`;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-4 mb-10">
                    <Trophy className="h-10 w-10 text-yellow-500" />
                    <h1 className="text-4xl font-bold">Attendee Leaderboard</h1>
                </div>
                <p className="text-lg text-gray-300 mb-8">
                    See who the most loyal event attendees are! Ranks are based on the total number of events attended.
                </p>

                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <Users className="h-5 w-5 mr-2" /> Top Attendees
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                                <p className="text-gray-400">Calculating attendance...</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-gray-700">
                                        <TableHead className="w-[80px]">Rank</TableHead>
                                        {/* UPDATED: Header to reflect 'Name' */}
                                        <TableHead>Attendee Name</TableHead>
                                        <TableHead className="text-right">Events Attended</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaderboard.map((entry) => (
                                        <TableRow key={entry.wallet_address} className="hover:bg-gray-700/50 border-gray-700">
                                            <TableCell>
                                                <Badge className={cn("px-3 py-1 font-bold", getRankStyle(entry.rank))}>
                                                    {entry.rank}
                                                    {entry.rank <= 3 && <Award className="h-3 w-3 ml-1" />}
                                                </Badge>
                                            </TableCell>
                                            {/* UPDATED: Display Name and truncated address */}
                                            <TableCell className="font-semibold">
                                                {entry.firstName} {entry.lastName}
                                                <p className="text-xs text-gray-400 font-mono mt-0.5">
                                                    {truncateAddress(entry.wallet_address)}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">{entry.total_events_attended}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}