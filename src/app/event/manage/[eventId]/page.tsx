// File: src/app/event/manage/[eventId]/page.tsx (FINAL: Removing External Links)
"use client"

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";
import {
  Users, Calendar, MapPin, Settings, Share2, ChevronRight, Mail, Download,
  QrCode, MessageSquare, Bell, Globe, Clock, ArrowLeft, CheckCircle2,
  Check, X, MoreHorizontal, Square, Filter, Loader2,
  AlertCircle, Award, Trash2, CheckSquare 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "react-toastify"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"
import { CertificateMinting } from "@/components/certificate-minting"; 
import { Switch } from "@/components/ui/switch"; 
import { Separator } from "@/components/ui/separator"; 
import { cn, downloadCsv } from "@/lib/utils"; 
import { CheckinQrModal } from "@/components/ui/CheckinQrModal"; 

// --- SUPABASE & MOCK SETUP ---
const FAKE_SUPABASE_URL = "http://localhost:54321";
const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === FAKE_SUPABASE_URL;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const DEMO_HOST_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

// --- Mock Attendee List for CSV Download ---
const MOCK_ATTENDEES_LIST = [
  { full_name: "Mock Approved User", wallet_address: "DEFLY...5678", asset_id: 100002, request_status: "approved", checked_in: "No" },
  { full_name: "Mock Pending User", wallet_address: "PERA...1234", asset_id: 100001, request_status: "pending", checked_in: "No" },
  { full_name: "Mock Rejected User", wallet_address: "LUTE...9012", asset_id: 100003, request_status: "rejected", checked_in: "N/A" },
];

// --- MOCK DATE: December 20th, 2025 ---
const TARGET_MOCK_DATE = new Date("2025-12-20T10:00:00Z").toISOString();

// --- MOCK DATA FALLBACK ---
const MOCK_EVENTS_DATA: { [key: number]: Event } = {
    999: {
        event_id: 999,
        event_name: "Mock Demo Launch Event",
        event_date: TARGET_MOCK_DATE, // HARDCODED NEW DATE
        description: "This is a mock event to demonstrate the host dashboard management functionality.",
        location: "Algorand TestNet",
        venue: "Virtual Stage",
        max_tickets: 500, // Initial capacity
        ticket_price: 10,
        image_url: "ipfs://QmVitaDemoHashForMockImage",
        category: "crypto",
        created_by: DEMO_HOST_ADDRESS, 
        status: "Live",
        isPublic: true,
        isRegistrationOpen: true,
        isSalesActive: true,
    }
}
// --- END MOCK DATA FALLBACK ---

type Request = {
  request_id: number
  wallet_address: string
  request_status: "pending" | "approved" | "rejected"
  requested_at: string
  reviewed_at: string | null
  admin_notes: string | null
  asset_id: number
  user_id: string 
  user: { wallet_address: string; created_at: string }
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
  status: "Live" | "Draft" | "Cancelled" 
  isPublic: boolean
  isRegistrationOpen: boolean
  isSalesActive: boolean
}

type Message = {
    id: number;
    subject: string;
    body: string;
    type: 'Email' | 'Push';
    sentAt: string;
}


export default function EventManagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = React.use(params)
  const { eventId } = resolvedParams; 
  const { activeAddress, algodClient, transactionSigner, isReady } = useWallet() 

  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequests, setSelectedRequests] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [adminNotesDialog, setAdminNotesDialog] = useState<{ isOpen: boolean; requestId: number | null; notes: string }>({ isOpen: false, requestId: null, notes: "" })
  
  // New state for interactivity
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false); // NEW QR MODAL STATE
  const [newEventStatus, setNewEventStatus] = useState<"Live" | "Draft" | "Cancelled">("Draft");
  const [messageBody, setMessageBody] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageHistory, setMessageHistory] = useState<Message[]>([]); 

  // Local state for temporary settings input
  const [localEventName, setLocalEventName] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [localLocation, setLocalLocation] = useState("");
  const [localVenue, setLocalVenue] = useState("");
  const [localMaxTickets, setLocalMaxTickets] = useState(0); // For capacity
  const [localEventDate, setLocalEventDate] = useState<Date | undefined>(undefined); // New local date state
  
  // Handler to update the local event state (for settings/toggles)
  const updateLocalEventState = useCallback((updates: Partial<Event>) => {
    setEvent(prev => {
        if (!prev) return null;
        const newEvent = { ...prev, ...updates };
        
        // Also update local states for edit form on toggle/status change
        if (updates.event_name !== undefined) setLocalEventName(updates.event_name);
        if (updates.description !== undefined) setLocalDescription(updates.description);
        if (updates.location !== undefined) setLocalLocation(updates.location);
        if (updates.venue !== undefined) setLocalVenue(updates.venue);
        if (updates.max_tickets !== undefined) setLocalMaxTickets(updates.max_tickets);
        if (updates.event_date !== undefined) setLocalEventDate(new Date(updates.event_date));
        if (updates.status !== undefined) setNewEventStatus(updates.status);
        
        return newEvent;
    });
  }, []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true); 
      try {
        // --- EVENT FETCH LOGIC (DB or MOCK) ---
        // Force the mock data for the demo event ID 999
        let loadedEvent: Event | null = MOCK_EVENTS_DATA[999];

        if (loadedEvent) {
            // Apply the new mock date
            loadedEvent.event_date = TARGET_MOCK_DATE;
        }

        if (!loadedEvent) {
             // Fallback if the hardcoded ID doesn't match
             const { data: dbEvent } = await supabase.from("events").select("*").eq("event_id", eventId).single()
             loadedEvent = dbEvent;
        }
        
        if (!loadedEvent) return

        setEvent(loadedEvent)
        
        // Initialize transient states for editing UI
        setNewEventStatus(loadedEvent.status);
        setLocalEventName(loadedEvent.event_name);
        setLocalDescription(loadedEvent.description);
        setLocalLocation(loadedEvent.location);
        setLocalVenue(loadedEvent.venue);
        setLocalMaxTickets(loadedEvent.max_tickets); // Initialize capacity state
        setLocalEventDate(new Date(loadedEvent.event_date)); // Initialize date state
        
        // --- REQUEST FETCH LOGIC (DB or MOCK) ---
        const mockRequests: Request[] = [
             { request_id: 1, wallet_address: "PERA...1234", request_status: "pending", requested_at: new Date().toISOString(), reviewed_at: null, admin_notes: null, asset_id: 100001, user_id: "u1", user: { wallet_address: "PERA...1234", created_at: new Date().toISOString() } },
             { request_id: 2, wallet_address: "DEFLY...5678", request_status: "approved", requested_at: new Date(Date.now() - 3600000).toISOString(), reviewed_at: new Date().toISOString(), admin_notes: "VIP Confirmed", asset_id: 100002, user_id: "u2", user: { wallet_address: "DEFLY...5678", created_at: new Date().toISOString() } },
             { request_id: 3, wallet_address: "LUTE...9012", request_status: "rejected", requested_at: new Date(Date.now() - 7200000).toISOString(), reviewed_at: new Date().toISOString(), admin_notes: "Limit Reached", asset_id: 100003, user_id: "u3", user: { wallet_address: "LUTE...9012", created_at: new Date().toISOString() } },
        ];
        
        setRequests(mockRequests);

      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load event data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [eventId])


  // --- NEW HANDLERS FOR MOCKED FUNCTIONALITY ---

  // Handler for "Change Status" Modal Save
  const handleUpdateStatus = () => {
    updateLocalEventState({ status: newEventStatus });
    setIsStatusModalOpen(false);
    toast.success(`Event status successfully updated to ${newEventStatus} (Mocked).`);
  };

  // Handler for saving form changes in Settings tab
  const handleSaveSettings = () => {
    const newMaxTickets = Number(localMaxTickets);
    if(isNaN(newMaxTickets) || newMaxTickets <= 0) {
        toast.error("Capacity must be a positive number.");
        return;
    }
    if (!localEventDate) {
        toast.error("Please select a valid event date.");
        return;
    }
    
    updateLocalEventState({
        event_name: localEventName,
        description: localDescription,
        location: localLocation,
        venue: localVenue,
        max_tickets: newMaxTickets, // Save capacity
        event_date: localEventDate.toISOString(), // Save new date
    });
    // In a real app, you would send API call here
    toast.success("Event details saved successfully! (Mocked)");
  };
  
  // Handler for "Send Message" Button
  const handleSendMessage = (type: 'Email' | 'Push') => {
    if (!messageBody.trim() || !messageSubject.trim()) {
        toast.error("Please enter a subject and a message.");
        return;
    }
    const newMessage: Message = {
        id: Date.now(),
        subject: messageSubject,
        body: messageBody,
        type: type,
        sentAt: new Date().toISOString(),
    };
    setMessageHistory(prev => [newMessage, ...prev]);
    toast.success(`${type} message sent to 3 attendees! (Mocked).`);
    setMessageBody("");
    setMessageSubject("");
  };

  // Handler for Quick Actions (QR/Export/Share/Settings)
  const handleQuickAction = (action: 'qr' | 'export' | 'share' | 'settings') => {
    if (!event) return;
    
    const eventLink = `${window.location.origin}/event/${event.event_id}`;
    
    switch(action) {
        case 'qr':
            // 1. Show the QR Modal instead of a toast
            setIsQrModalOpen(true);
            break;
        case 'export':
            // 2. Implement CSV Download
            downloadCsv(MOCK_ATTENDEES_LIST, `${event.event_name.replace(/\s/g, '_')}_guestlist`, 
                ['full_name', 'wallet_address', 'asset_id', 'request_status', 'checked_in']);
            toast.success("Guest list download started!", { autoClose: 3000 });
            break;
        case 'share':
            toast.info(`Event Share Link copied: ${eventLink}`, { autoClose: 4000 });
            navigator.clipboard.writeText(eventLink);
            break;
        case 'settings':
            // Correctly trigger the navigation to the settings tab
            window.location.hash = 'settings'; 
            toast.info("Navigating to Event Settings tab.");
            break;
    }
  };

  // Handler for Delete Event (Danger Zone)
  const handleDeleteEvent = () => {
    setIsDeleteModalOpen(false);
    toast.success(`Event ${event?.event_name} has been cancelled and deleted (Mocked). Redirecting...`);
    // Crucial: Redirect immediately after successful mock operation
    router.push('/host'); 
  };

  // Loyalty badge minting logic (remains the same)
  const handleMintLoyaltyBadge = async (attendeeAddress: string) => {
    if (!activeAddress) {
        toast.error("Please connect your wallet to mint badges.")
        return
    }
    try {
        const response = await fetch('/api/loyalty-badge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostAddress: activeAddress, attendeeAddress: attendeeAddress }),
        });

        const data = await response.json();
        if (response.ok) {
            toast.success(data.message);
        } else {
            toast.info(data.message || data.error); 
        }
    } catch (error) {
        console.error("Loyalty Badge request error:", error);
        toast.error("Failed to check loyalty/mint badge.");
    }
  }


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

      if (error && !isDemoMode) throw error
      if (isDemoMode) toast.info(`[DEMO] Request ${requestId} status updated to ${status} (Mock DB).`);

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
    if (!activeAddress || !algodClient || !transactionSigner) {
        toast.error("Wallet not connected or missing Algorand services. Cannot perform bulk transfer.")
        return
    }

    try {
      if (action === "approve") {
          toast.success(`[DEMO] Bulk Approve operation initiated. Simulating asset transfer...`);
      } else {
          toast.success(`[DEMO] Bulk Reject operation initiated. Updating mock database...`);
      }
      
      const { error } = await supabase
        .from("requests")
        .update({
          request_status: action === "approve" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .in("request_id", selectedRequests)

      if (error && !isDemoMode) throw error

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

      setSelectedRequests([])
      toast.success("Bulk action completed and database updated.")
      
    } catch (error) {
      console.error("Error performing bulk action:", error)
      toast.error(`Bulk action failed: ${(error as Error).message || "Transaction error. Check Algorand client/wallet connection."}`)
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
            <Button onClick={() => handleQuickAction('share')}>
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
  
  // RENDER CHECKS
  if (isLoading || (activeAddress && !isReady)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">
            {activeAddress && !isReady ? "Initializing wallet services..." : "Loading event details..."}
          </p>
        </div>
      </div>
    )
  }

  // Check if Event was found/loaded
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
            <p className="text-gray-400 mb-6">This event doesn't exist or you don't have permission to view it. (ID: {eventId})</p>
            <Button asChild>
              <Link href="/host">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Final Render starts here
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
                <h1 className="text-lg font-semibold">{event.event_name}</h1>
                <p className="text-sm text-gray-400">Event Management</p>
              </div>
            </div>
            {/* REMOVED: View Event Page button */}
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
                  <Badge variant="outline">3</Badge> {/* Mocked Count */}
                </div>
                <h3 className="font-medium">Registered</h3>
                <p className="text-sm text-gray-400">Total attendees</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <Badge variant="outline">1</Badge> {/* Mocked Count */}
                </div>
                <h3 className="font-medium">Checked In</h3>
                <p className="text-sm text-gray-400">Attended guests</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <Badge variant="outline">{event.max_tickets}</Badge>
                </div>
                <h3 className="font-medium">Capacity</h3>
                <p className="text-sm text-gray-400">Maximum tickets</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="h-5 w-5 text-purple-500" />
                  <Badge>{event.status}</Badge>
                </div>
                <h3 className="font-medium">Status</h3>
                <p className="text-sm text-gray-400">Event is {event.status}</p>
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
                      event.image_url
                        ? event.image_url.replace("ipfs://", "https://ipfs.io/ipfs/")
                        : "/placeholder.svg"
                    }
                    alt={event.event_name}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold mb-2">{event.event_name}</h2>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1.5" />
                        {event.event_date ? format(new Date(event.event_date), "MMMM d, yyyy") : "Date not set"}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        {event.location}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1.5" />
                        {event.max_tickets} capacity
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
                  <TabsTrigger value="settings" id="settings">Settings</TabsTrigger>
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
                          <p className="text-gray-400 mt-1">{event.description || "No description available"}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label>Category</Label>
                            <p className="text-gray-400 mt-1">{event.category || "Not specified"}</p>
                          </div>
                          <div>
                            <Label>Ticket Price</Label>
                            <p className="text-gray-400 mt-1">{event.ticket_price} ALGO</p>
                          </div>
                          <div>
                            <Label>Venue</Label>
                            <p className="text-gray-400 mt-1">{event.venue || "Not specified"}</p>
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
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleQuickAction('share')}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Event Link
                        </Button>
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleQuickAction('qr')}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Check-in QR Code
                        </Button>
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleQuickAction('export')}>
                          <Download className="w-4 h-4 mr-2" />
                          Export Guest List (CSV)
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
                              <span>3/{event.max_tickets}</span> 
                            </div>
                            <Progress value={(3 / event.max_tickets) * 100} className="h-2" /> 
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Views</p>
                              <p className="text-2xl font-semibold">120</p> 
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Registrations</p>
                              <p className="text-2xl font-semibold">3</p> 
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
                      <div className="max-h-[500px] overflow-y-auto rounded-md border border-gray-700">
                        {renderRequestsTable()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* PoAP Component for Certificate Minting */}
                  <CertificateMinting
                    eventId={event.event_id.toString()}
                    eventName={event.event_name}
                    eventDate={event.event_date}
                    creatorAddress={event.created_by}
                    attendees={requests.filter(r => r.request_status === 'approved').map(r => r.wallet_address)}
                  />
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
                        <Input 
                            placeholder="Message subject..." 
                            className="bg-gray-900/50" 
                            value={messageSubject}
                            onChange={(e) => setMessageSubject(e.target.value)}
                        />
                        <textarea
                          placeholder="Type your message here..."
                          className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => handleSendMessage('Push')}>
                            <Bell className="w-4 h-4 mr-2" />
                            Send Push (Mock)
                          </Button>
                          <Button onClick={() => handleSendMessage('Email')}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Message History ({messageHistory.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {messageHistory.length === 0 ? (
                             <div className="text-center py-8">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                                <h3 className="text-lg font-medium mb-2">No Messages Sent</h3>
                                <p className="text-gray-400">Messages you send to your attendees will appear here.</p>
                             </div>
                        ) : (
                             <div className="space-y-4">
                                {messageHistory.map((msg) => (
                                     <div key={msg.id} className="p-4 bg-gray-700/50 rounded-lg">
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <Badge variant="secondary">{msg.type}</Badge>
                                            <span className="text-gray-400">{format(new Date(msg.sentAt), 'MMM d, HH:mm')}</span>
                                        </div>
                                        <p className="font-semibold">{msg.subject}</p>
                                        <p className="text-sm text-gray-300 line-clamp-2">{msg.body}</p>
                                     </div>
                                ))}
                             </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="settings">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Event Details</CardTitle>
                      <CardDescription>Edit core details of your event.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4">
                        <div>
                          <Label>Event Name</Label>
                          <Input value={localEventName} onChange={(e) => setLocalEventName(e.target.value)} className="bg-gray-900/50 mt-1" />
                        </div>
                        <div>
                          <Label>Event Date (MOCK: Set to Dec 20, 2025)</Label>
                          <Input 
                            type="text"
                            value={localEventDate ? format(localEventDate, 'MMM dd, yyyy') : 'Select Date'} 
                            onChange={(e) => setLocalEventDate(new Date(e.target.value))} // Simple input for demo
                            className="bg-gray-900/50 mt-1" 
                            placeholder="Dec 20, 2025"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <textarea
                            value={localDescription}
                            onChange={(e) => setLocalDescription(e.target.value)}
                            className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Location</Label>
                            <Input value={localLocation} onChange={(e) => setLocalLocation(e.target.value)} className="bg-gray-900/50 mt-1" />
                          </div>
                          <div>
                            <Label>Venue</Label>
                            <Input value={localVenue} onChange={(e) => setLocalVenue(e.target.value)} className="bg-gray-900/50 mt-1" />
                          </div>
                          {/* FIX: Capacity Input */}
                          <div>
                            <Label>Max Capacity (Tickets)</Label>
                            <Input 
                                type="number"
                                value={localMaxTickets} 
                                onChange={(e) => setLocalMaxTickets(Number(e.target.value))} 
                                className="bg-gray-900/50 mt-1" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => {
                            setLocalEventName(event.event_name);
                            setLocalDescription(event.description);
                            setLocalLocation(event.location);
                            setLocalVenue(event.venue);
                            setLocalMaxTickets(event.max_tickets);
                            setLocalEventDate(new Date(event.event_date));
                        }}>Cancel</Button>
                        <Button onClick={handleSaveSettings}>Save Changes</Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* New Toggles for Ticket Availability */}
                  <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                          <CardTitle>Availability Toggles</CardTitle>
                          <CardDescription>Control sales, registration, and visibility.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {/* Ticket Sales */}
                          <div className="flex items-center justify-between">
                              <div>
                                  <Label>Ticket Sales Active</Label>
                                  <p className="text-sm text-gray-400">Allow users to purchase/request tickets.</p>
                              </div>
                              <Switch
                                  checked={event.isSalesActive}
                                  onCheckedChange={(checked) => updateLocalEventState({ isSalesActive: checked })}
                              />
                          </div>
                          <Separator />
                          {/* Registration Open */}
                          <div className="flex items-center justify-between">
                              <div>
                                  <Label>Registration Open</Label>
                                  <p className="text-sm text-gray-400">Allow new users to register for the event.</p>
                              </div>
                              <Switch
                                  checked={event.isRegistrationOpen}
                                  onCheckedChange={(checked) => updateLocalEventState({ isRegistrationOpen: checked })}
                              />
                          </div>
                          <Separator />
                          {/* Visibility */}
                          <div className="flex items-center justify-between">
                              <div>
                                  <Label>Public Visibility</Label>
                                  <p className="text-sm text-gray-400">Show/hide the event from the main Events page.</p>
                              </div>
                              <Switch
                                  checked={event.isPublic}
                                  onCheckedChange={(checked) => updateLocalEventState({ isPublic: checked })}
                              />
                          </div>
                      </CardContent>
                  </Card>


                  <Card className="bg-gray-800/50 border-gray-700 mt-6">
                    <CardHeader>
                      <CardTitle className="text-red-500">Danger Zone</CardTitle>
                      <CardDescription>These actions cannot be undone.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="destructive" className="w-full justify-start" onClick={() => setIsDeleteModalOpen(true)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancel/Delete Event
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
                      <Badge variant="outline" className={`bg-${event.status === 'Live' ? 'green' : 'gray'}-500/10 text-${event.status === 'Live' ? 'green' : 'gray'}-500 border-${event.status === 'Live' ? 'green' : 'gray'}-500/20`}>
                        {event.status}
                      </Badge>
                      <span className="text-sm text-gray-400">Event is {event.status}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(true)}>
                      Change Status
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ticket Sales</span>
                      <span className={`text-${event.isSalesActive ? 'green' : 'red'}-500`}>{event.isSalesActive ? 'Active' : 'Closed'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Registration</span>
                      <span className={`text-${event.isRegistrationOpen ? 'green' : 'red'}-500`}>{event.isRegistrationOpen ? 'Open' : 'Closed'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Visibility</span>
                      <span className={`text-${event.isPublic ? 'green' : 'red'}-500`}>{event.isPublic ? 'Public' : 'Private'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickAction('qr')}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Check-in QR Code
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickAction('export')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Guest List (CSV)
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickAction('settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Event Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notes Dialog (Omitted for brevity) */}
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
      
      {/* Change Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Event Status</DialogTitle>
            <DialogDescription>
              Update the overall status of your event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Select New Status</Label>
            <select
                value={newEventStatus}
                onChange={(e) => setNewEventStatus(e.target.value as "Live" | "Draft" | "Cancelled")}
                className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-gray-900/50 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
                <option value="Live">Live (Public)</option>
                <option value="Draft">Draft (Private)</option>
                <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus}>
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Confirm Event Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel and delete **{event.event_name}**? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Delete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* NEW: Check-in QR Modal */}
      {event && (
        <CheckinQrModal 
            isOpen={isQrModalOpen}
            onClose={() => setIsQrModalOpen(false)}
            eventId={event.event_id}
            eventName={event.event_name}
            hostAddress={activeAddress || DEMO_HOST_ADDRESS}
        />
      )}
    </div>
  )
}