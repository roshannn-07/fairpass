// File: src/app/ticket/view/[id]/page.tsx (CORRECTED for HTML structure)
"use client"

import React, { useEffect, useState } from "react" 
import { useWallet } from "@txnlab/use-wallet-react"
import { format } from "date-fns"
import { QRCodeSVG as QRCode } from "qrcode.react"
import {
  Ticket,
  MapPin,
  Calendar,
  Zap,
  Loader2,
  CheckCircle2,
  Wallet,
  ArrowLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "react-toastify"

// --- UPDATED MOCK DATA: Now includes all 5 events for lookup ---
const fetchMockTicketDetails = (assetId: number) => {
    switch (assetId) {
        case 12345:
            return {
                asset_id: 12345,
                event_id: 999,
                event_name: "Algorand Global DevCon 2024",
                event_date: new Date(Date.now() + 86400000 * 30).toISOString(),
                location: "The Cloud: Layer 1",
                image_url: "ipfs://QmVitaDemoHashForMockImage",
                status: "Active",
                isPoAPEnabled: true,
                signature: "0xMockSignature12345",
            };
        case 67890:
            return {
                asset_id: 67890,
                event_id: 888,
                event_name: "FairPass Launch Party & AMA",
                event_date: new Date(Date.now() - 86400000 * 2).toISOString(), // Past event
                location: "Global Metaverse Venue",
                image_url: "ipfs://QmVitaDemoHashForMockImage",
                status: "Used",
                isPoAPEnabled: true,
                signature: "0xMockSignature67890",
            };
        case 54321:
            return {
                asset_id: 54321,
                event_id: 777,
                event_name: "Future of Finance: Boston Workshop",
                event_date: new Date(Date.now() + 86400000 * 5).toISOString(),
                location: "Boston Tech Center",
                image_url: "ipfs://QmVitaDemoHashForMockImage",
                status: "Active",
                isPoAPEnabled: false,
                signature: "0xMockSignature54321",
            };
        case 98765:
            return {
                asset_id: 98765,
                event_id: 666,
                event_name: "Web3 Security Summit - NYC",
                event_date: new Date(Date.now() + 86400000 * 15).toISOString(),
                location: "New York City",
                image_url: "ipfs://QmVitaDemoHashForMockImage",
                status: "Active",
                isPoAPEnabled: true,
                signature: "0xMockSignature98765",
            };
        case 45678:
            return {
                asset_id: 45678,
                event_id: 555,
                event_name: "NFT Art Showcase: Digital Pioneers",
                event_date: new Date(Date.now() + 86400000 * 45).toISOString(),
                location: "Virtual Gallery Alpha",
                image_url: "ipfs://QmVitaDemoHashForMockImage",
                status: "Active",
                isPoAPEnabled: false,
                signature: "0xMockSignature45678",
            };
        default:
            return null;
    }
}
// --- END UPDATED MOCK DATA ---

// Update the type to reflect the Promise wrapper
interface TicketViewPageProps {
  params: Promise<{ id: string }>
}

// Update the function signature to accept the Promise-wrapped params
export default function TicketViewPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use() to safely unwrap the params object
  const resolvedParams = React.use(params)
  
  const { activeAddress } = useWallet()
  
  // Access the properties from the unwrapped object
  const { id: assetIdStr } = resolvedParams
  const assetId = parseInt(assetIdStr)

  const [ticketDetails, setTicketDetails] = useState<ReturnType<typeof fetchMockTicketDetails> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [qrCodeData, setQrCodeData] = useState("")

  useEffect(() => {
    setIsLoading(true)
    // Call the updated mock lookup function
    const details = fetchMockTicketDetails(assetId)

    if (details) {
      setTicketDetails(details)
      // Simulate QR Payload creation - this mimics the structure used in /api/resend/route.ts
      const payload = {
        payload: {
          assetId: details.asset_id,
          userAddress: activeAddress || "DEMO_ADDRESS",
          eventId: details.event_id,
          timestamp: new Date().toISOString(),
          eventName: details.event_name,
        },
        signature: details.signature,
      }
      setQrCodeData(JSON.stringify(payload))
    } else {
      toast.error("Ticket not found or unauthorized.")
    }

    setIsLoading(false)
  }, [assetId, activeAddress])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!ticketDetails) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
        <Card className="w-full max-w-md mx-4 bg-gray-800/50 border-gray-700 text-center">
          <CardHeader>
            <CardTitle>Ticket Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-6">Could not retrieve details for Asset ID: {assetIdStr}</p>
            <Button asChild>
              <Link href="/mytickets">Return to My Tickets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Determine PoAP status display
  const isPastEvent = new Date(ticketDetails.event_date) < new Date();
  let poapBadge = <Badge className="bg-purple-500/20 text-purple-400">Mint Pending</Badge>;
  if (!ticketDetails.isPoAPEnabled) {
       poapBadge = <Badge variant="secondary">Not Applicable</Badge>;
  } else if (isPastEvent) {
       poapBadge = <Badge className="bg-green-500/20 text-green-400">Claimable</Badge>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 py-12">
      <div className="max-w-xl mx-auto px-4 space-y-6">
        <Link href="/mytickets" passHref legacyBehavior>
          <Button variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Tickets
          </Button>
        </Link>
        
        <Card className="bg-gray-800/50 border-primary shadow-lg shadow-primary/20">
          <CardHeader className="p-0 border-b border-gray-700">
            <img
              src={ticketDetails.image_url.replace("ipfs://", "https://ipfs.io/ipfs/") || "/placeholder.svg"}
              alt={ticketDetails.event_name}
              className="w-full h-48 object-cover rounded-t-xl"
            />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-3xl font-bold">{ticketDetails.event_name}</CardTitle>
                    {/* FIXED HTML VIOLATION: Using a <div> instead of CardDescription/p tag for the Badge */}
                    <div className="text-lg text-gray-400 mt-1">
                        NFT Asset ID: <Badge className="bg-green-500/20 text-green-400">{ticketDetails.asset_id}</Badge>
                    </div>
                </div>
                <Badge className={cn(
                    "text-lg px-4 py-1",
                    ticketDetails.status === "Active" ? "bg-green-500 text-white" : "bg-yellow-500 text-black"
                )}>
                    {ticketDetails.status}
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-700 py-4">
                <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">{format(new Date(ticketDetails.event_date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">{ticketDetails.location}</span>
                </div>
            </div>

            {/* QR Code Section - The Key to Entry */}
            <div className="text-center space-y-4">
                <p className="text-xl font-semibold text-white">Your Entry QR Code</p>
                <div className="inline-block p-4 bg-white rounded-xl shadow-2xl">
                    {ticketDetails.status === "Used" ? (
                         <div className="w-64 h-64 flex items-center justify-center bg-gray-200">
                            <CheckCircle2 className="w-16 h-16 text-green-600" />
                         </div>
                    ) : qrCodeData ? (
                        <QRCode value={qrCodeData} size={256} level="H" />
                    ) : (
                        <Loader2 className="h-16 w-16 animate-spin text-gray-400" />
                    )}
                </div>
                {ticketDetails.status === "Used" ? (
                    <p className="text-lg text-green-400 font-medium">Ticket Already Checked In</p>
                ) : (
                    <p className="text-sm text-red-400 font-medium">DO NOT screenshot or share this code until instructed by staff.</p>
                )}
            </div>
            
            {/* Additional Features */}
            <div className="space-y-3 border-t border-gray-700 pt-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-blue-400" />
                        <span className="font-medium text-white">Compliant Resale</span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Wallet className="w-5 h-5 text-yellow-400" />
                        <span className="font-medium text-white">Proof-of-Attendance (PoAP)</span>
                    </div>
                    {poapBadge}
                </div>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  )
}