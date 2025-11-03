"use client"

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";
import {
  Users,
  Calendar,
  MapPin,
  Settings,
  Share2,
  ChevronRight,
  Mail,
  Download,
  QrCode,
  MessageSquare,
  Bell,
  Globe,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Check,
  X,
  MoreHorizontal,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  AlertCircle,
  Award, // <--- Loyaty Badge Icon: CORRECT IMPORT
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "react-toastify"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Request = {
  request_id: number
  wallet_address: string
  request_status: "pending" | "approved" | "rejected"
  requested_at: string
  reviewed_at: string | null
  admin_notes: string | null
  asset_id: number
  user_id: string 
  user: {
    wallet_address: string
    created_at: string
  }
  
}

type Event = {
  event_id: number
  event_name: string
  description: string
  location: string
  venue: string
  event_date: string
  max_tickets: number
  ticket_price: number
  image_url: string
  category: string
  created_by: string
}

function sliceIntoChunks(arr: any[], chunkSize: number) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}


export default function EventManagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = React.use(params)
  const { activeAddress, algodClient, transactionSigner } = useWallet()

  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequests, setSelectedRequests] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [adminNotesDialog, setAdminNotesDialog] = useState<{
    isOpen: boolean
    requestId: number | null
    notes: string
  }>({
    isOpen: false,
    requestId: null,
    notes: "",
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch event details
        const { data: event, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("event_id", resolvedParams.eventId)
          .single()

        if (eventError) {
          console.error("Error fetching event:", eventError)
          return
        }

        if (!event) {
          console.error("Event not found")
          return
        }

        setEvent(event)

        // Fetch requests with user details
        const { data: requestsData, error: requestsError } = await supabase
          .from("requests")
          .select(`
            *,
            user:users!requests_admin_id_fkey (
              wallet_address,
              created_at
            )
          `)
          .eq("event_id", resolvedParams.eventId)
          .order("requested_at", { ascending: false })

        if (requestsError) {
          console.error("Error fetching requests:", requestsError)
          return
        }

        // Transform the data to match our Request type
        const transformedRequests: Request[] = requestsData.map((request: any) => ({
          request_id: request.request_id,
          wallet_address: request.wallet_address,
          request_status: request.request_status,
          requested_at: request.requested_at,
          reviewed_at: request.reviewed_at,
          admin_notes: request.admin_notes,
          asset_id: request.asset_id,
          user: request.user,
          user_id: request.user_id,

        }))

        setRequests(transformedRequests)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load event data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.eventId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
            <p className="text-gray-400 mb-6">This event doesn't exist or you don't have permission to view it.</p>
            <Button asChild>
              <Link href="/host">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Feature 4: Loyalty Badge Function (Correctly placed before render) ---
  const handleMintLoyaltyBadge = async (attendeeAddress: string) => {
    if (!activeAddress) {
        toast.error("Please connect your wallet to mint badges.")
        return
    }
    try {
        const response = await fetch('/api/loyalty-badge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hostAddress: activeAddress,
                attendeeAddress: attendeeAddress,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            toast.success(data.message);
        } else {
            // Display either the specific message (e.g., "Not enough for a badge") or the error
            toast.info(data.message || data.error); 
        }
    } catch (error) {
        console.error("Loyalty Badge request error:", error);
        toast.error("Failed to check loyalty/mint badge.");
    }
  }
  // ------------------------------------------

  // ... rest of the component code remains the same ...

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || request.request_status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([])
    } else {
      setSelectedRequests(filteredRequests.map((r) => r.request_id))
    }
  }

  const handleSelectRequest = (requestId: number) => {
    if (selectedRequests.includes(requestId)) {
      setSelectedRequests(selectedRequests.filter((id) => id !== requestId))
    } else {
      setSelectedRequests([...selectedRequests, requestId])
    }
  }

  const updateRequestStatus = async (
    requestId: number,
    status: "pending" | "approved" | "rejected",
    notes?: string,
  ) => {
    try {
      const { error } = await supabase
        .from("requests")
        .update({
          request_status: status,
          reviewed_at: new Date().toISOString(),
          admin_notes: notes || null,
        })
        .eq("request_id", requestId)

      if (error) throw error

      // Update local state
      setRequests(
        requests.map((request) =>
          request.request_id === requestId
            ? {
                ...request,
                request_status: status,
                reviewed_at: new Date().toISOString(),
                admin_notes: notes || null,
              }
            : request,
        ),
      )
    } catch (error) {
      console.error("Error updating request:", error)
    }
  }

  const handleBulkAction = async (action: "approve" | "reject") => {
    console.log("Performing bulk action:", action)
    
    if (!activeAddress || !algodClient || !transactionSigner) {
        toast.error("Wallet not connected or missing services.")
        return
    }

    try {


      if (action === "approve") {
        
        const suggestedParams = await algodClient.getTransactionParams().do();
        const transactions: algosdk.Transaction[] = [];

        const selectedRequestsDetails = requests.filter((request) =>
          selectedRequests.includes(request.request_id)
        );

        // 1. Build all transactions
        for (const request of selectedRequestsDetails) {
            
            // Check for valid assetId before attempting to build
            if (!request.asset_id || request.asset_id <= 0) {
                console.error(`Skipping request ${request.request_id}: Invalid Asset ID ${request.asset_id}`);
                continue; // Skip invalid asset transfers
            }
            
            const xferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: activeAddress,
                receiver: request.wallet_address,
                suggestedParams,
                assetIndex: request.asset_id,
                amount: 1,
                note: new TextEncoder().encode(`Ticket Approval for Event ${event?.event_id}`),
            });
            transactions.push(xferTxn)
        }

        if (transactions.length === 0) {
            toast.info("No valid transfers were built for approval.")
            return
        }

        // 2. Sign all transactions at once for Pera/WalletConnect stability
        toast.info(`Sending ${transactions.length} transfer transactions for wallet approval...`)
        const signedTxns = await transactionSigner(
          transactions,
          transactions.map((_, i) => i), // Sign all transactions
        )

        // 3. Send transactions in a single batch
        toast.info("Sending signed transactions to Algorand network...")
        
        // Send the entire batch at once
        const txid = await algodClient.sendRawTransaction(signedTxns).do();
        const result = await algosdk.waitForConfirmation(algodClient, txid.txId, 4);

        if (result['confirmed-round']) {
             toast.success(`All ${transactions.length} transfers confirmed in round ${result['confirmed-round']}!`);
        } else {
             // If confirmation fails but doesn't throw a standard error, throw a custom one
             throw new Error("Transaction was sent but not confirmed by the network.");
        }
        
        // 4. Send confirmation emails (parallelized for speed)
        for (const request of selectedRequestsDetails) {
          const { data: userData } = await supabase
            .from("users")
            .select("email")
            .eq("user_id", request.user_id)
            .single()

          
          if (!userData?.email) {
            continue
          }

          try {
            // Use the existing /api/resend route for email dispatch
            await fetch('/api/resend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userData.email,
                audienceId: '57a5c553-2ff2-48a1-b9f5-dff4b5c04da9',
                event,
                ticketDetails: {
                  assetId: request.asset_id,
                  userAddress: request.wallet_address,
                  eventId: event.event_id,
                }
              }),
            })
          } catch (emailError) {
            console.error(`Error sending confirmation email to ${userData?.email}:`, emailError)
          }
        }
      }
      
      // Update DB status for approved/rejected requests
      const { error } = await supabase
        .from("requests")
        .update({
          request_status: action === "approve" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .in("request_id", selectedRequests)

      if (error) throw error

      // Update local state
      setRequests(
        requests.map((request) =>
          selectedRequests.includes(request.request_id)
            ? {
                ...request,
                request_status: action === "approve" ? "approved" : "rejected",
                reviewed_at: new Date().toISOString(),
              }
            : request,
        ),
      )

      // Clear selection
      setSelectedRequests([])
      toast.success("Bulk action completed and database updated.")
    } catch (error) {
      console.error("Error performing bulk action:", error)
      toast.error(`Bulk action failed: ${(error as Error).message || "Transaction error."}`)
    }
  }

  const renderRequestsTable = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading requests...</p>
        </div>
      )
    }

    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium mb-2">No Requests Found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery || filterStatus !== "all"
              ? "Try adjusting your search or filters"
              : "Share your event to start getting registrations"}
          </p>
          {!searchQuery && filterStatus === "all" && (
            <Button>
              <Share2 className="w-4 h-4 mr-2" />
              Share Event
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSelectAll}>
                  {selectedRequests.length === filteredRequests.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Wallet Address</TableHead>
              <TableHead>Asset ID</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.request_id} className="hover:bg-gray-800/50">
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleSelectRequest(request.request_id)}
                  >
                    {selectedRequests.includes(request.request_id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-mono">{request.wallet_address}</TableCell>
                <TableCell>{request.asset_id}</TableCell>
                <TableCell>{format(new Date(request.requested_at), "MMM d, yyyy HH:mm")}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.request_status === "approved"
                        ? "success"
                        : request.request_status === "rejected"
                          ? "destructive"
                          : "default"
                    }
                  >
                    {request.request_status.charAt(0).toUpperCase() + request.request_status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.admin_notes ? (
                    <span className="text-sm text-gray-400">{request.admin_notes}</span>
                  ) : (
                    <span className="text-sm text-gray-500">No notes</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() =>
                          setAdminNotesDialog({
                            isOpen: true,
                            requestId: request.request_id,
                            notes: request.admin_notes || "",
                          })
                        }
                      >
                        Add Notes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      
                      {/* --- FEATURE F4: AWARD LOYALTY BADGE (NOW VISIBLE) --- */}
                      <DropdownMenuItem
                        onClick={() => handleMintLoyaltyBadge(request.wallet_address)}
                        className="text-purple-500"
                      >
                          <Award className="w-4 h-4 mr-2" />
                          Award Loyalty Badge
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* --- END FEATURE F4 --- */}
                      
                      <DropdownMenuItem
                        className="text-green-500"
                        onClick={() => updateRequestStatus(request.request_id, "approved")}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve Request
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => updateRequestStatus(request.request_id, "rejected")}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject Request
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/host">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{event?.event_name || "Loading..."}</h1>
                <p className="text-sm text-gray-400">Event Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" asChild>
                <Link href={`/events/${event?.event_id}`} target="_blank">
                  View Event Page
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <Badge variant="outline">0</Badge>
                </div>
                <h3 className="font-medium">Registered</h3>
                <p className="text-sm text-gray-400">Total attendees</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <Badge variant="outline">0</Badge>
                </div>
                <h3 className="font-medium">Checked In</h3>
                <p className="text-sm text-gray-400">Attended guests</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <Badge variant="outline">{event?.max_tickets || 0}</Badge>
                </div>
                <h3 className="font-medium">Capacity</h3>
                <p className="text-sm text-gray-400">Maximum tickets</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="h-5 w-5 text-purple-500" />
                  <Badge>Live</Badge>
                </div>
                <h3 className="font-medium">Status</h3>
                <p className="text-sm text-gray-400">Event is public</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-[1fr,300px] gap-8">
            <div className="space-y-6">
              {/* Event Preview */}
              <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={
                      event?.image_url
                        ? event.image_url.replace("ipfs://", "https://ipfs.io/ipfs/")
                        : "/placeholder.svg"
                    }
                    alt={event?.event_name || "Event"}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold mb-2">{event?.event_name}</h2>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1.5" />
                        {event?.event_date ? format(new Date(event.event_date), "MMMM d, yyyy") : "Date not set"}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        {event?.location || "Location not set"}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1.5" />
                        {event?.max_tickets || 0} capacity
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="attendees" className="space-y-6">
                <TabsList className="bg-gray-800/50 p-1">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="attendees">Attendees</TabsTrigger>
                  <TabsTrigger value="communications">Communications</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Event Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4">
                        <div>
                          <Label>Description</Label>
                          <p className="text-gray-400 mt-1">{event?.description || "No description available"}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label>Category</Label>
                            <p className="text-gray-400 mt-1">{event?.category || "Not specified"}</p>
                          </div>
                          <div>
                            <Label>Ticket Price</Label>
                            <p className="text-gray-400 mt-1">{event?.ticket_price || 0} ALGO</p>
                          </div>
                          <div>
                            <Label>Venue</Label>
                            <p className="text-gray-400 mt-1">{event?.venue || "Not specified"}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button className="w-full justify-start" variant="outline">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Event
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR Code
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export Guest List
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Event Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">Registration Progress</span>
                              <span>0/{event?.max_tickets || 0}</span>
                            </div>
                            <Progress value={0} className="h-2" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Views</p>
                              <p className="text-2xl font-semibold">0</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Registrations</p>
                              <p className="text-2xl font-semibold">0</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="attendees">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <CardTitle>Attendee Management</CardTitle>
                          <CardDescription>Review and manage ticket requests</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Search by wallet..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-[200px] bg-gray-900/50"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <Filter className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Requests</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("pending")}>
                                  Pending Only
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("approved")}>
                                  Approved Only
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("rejected")}>
                                  Rejected Only
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {selectedRequests.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkAction("approve")}
                                className="text-green-500"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve Selected
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkAction("reject")}
                                className="text-red-500"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject Selected
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="rounded-md">{renderRequestsTable()}</ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="communications">
                  <div className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Send Message</CardTitle>
                        <CardDescription>
                          Communicate with your attendees via email or push notifications.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Input placeholder="Message subject..." className="bg-gray-900/50" />
                        <textarea
                          placeholder="Type your message here..."
                          className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">
                            <Bell className="w-4 h-4 mr-2" />
                            Send Push
                          </Button>
                          <Button>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Message History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                          <h3 className="text-lg font-medium mb-2">No Messages Sent</h3>
                          <p className="text-gray-400">Messages you send to your attendees will appear here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="settings">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Event Settings</CardTitle>
                      <CardDescription>Manage your event details and preferences.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4">
                        <div>
                          <Label>Event Name</Label>
                          <Input defaultValue={event?.event_name || ""} className="bg-gray-900/50 mt-1" />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <textarea
                            defaultValue={event?.description || ""}
                            className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Location</Label>
                            <Input defaultValue={event?.location || ""} className="bg-gray-900/50 mt-1" />
                          </div>
                          <div>
                            <Label>Venue</Label>
                            <Input defaultValue={event?.venue || ""} className="bg-gray-900/50 mt-1" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/50 border-gray-700 mt-6">
                    <CardHeader>
                      <CardTitle className="text-red-500">Danger Zone</CardTitle>
                      <CardDescription>These actions cannot be undone.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="destructive" className="w-full justify-start">
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Event
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Event Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Live
                      </Badge>
                      <span className="text-sm text-gray-400">Event is public</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Status
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ticket Sales</span>
                      <span className="text-green-500">Active</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Registration</span>
                      <span className="text-green-500">Open</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Visibility</span>
                      <span className="text-green-500">Public</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <QrCode className="w-4 h-4 mr-2" />
                    Check-in QR Code
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Download Guest List
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Event Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notes Dialog */}
      <Dialog
        open={adminNotesDialog.isOpen}
        onOpenChange={(isOpen) => setAdminNotesDialog({ isOpen, requestId: null, notes: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin Notes</DialogTitle>
            <DialogDescription>
              Add notes about this ticket request. These notes are only visible to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter admin notes..."
              value={adminNotesDialog.notes}
              onChange={(e) => setAdminNotesDialog({ ...adminNotesDialog, notes: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdminNotesDialog({ isOpen: false, requestId: null, notes: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (adminNotesDialog.requestId) {
                  updateRequestStatus(
                    adminNotesDialog.requestId,
                    requests.find((r) => r.request_id === adminNotesDialog.requestId)?.request_status || "pending",
                    adminNotesDialog.notes,
                  )
                  setAdminNotesDialog({ isOpen: false, requestId: null, notes: "" })
                }
              }}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}