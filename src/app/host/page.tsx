// File: src/app/host/page.tsx (UPDATED with profile link fix)
"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import Link from "next/link"
import { Calendar, MapPin, Users, Ticket, Settings, ArrowRight, Loader2 } from "lucide-react" 
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton" 
import { createMockClient } from "@/lib/supabase-mock"; 
import { toast } from "react-toastify"; 

// --- START: CONDITIONAL SUPABASE CLIENT INITIALIZATION ---
const FAKE_SUPABASE_URL = "http://localhost:54321";
const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === FAKE_SUPABASE_URL;

let supabase: any;

if (isDemoMode) {
    // @ts-ignore
    supabase = createMockClient();
} else {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
// --- END: CONDITIONAL SUPABASE CLIENT INITIALIZATION ---


// --- DEMO MOCK ADDRESS: Use this if no wallet is connected to prevent locking the page ---
const DEMO_HOST_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"; 

// --- LoadingSkeleton DEFINITION ---
function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Profile Section Skeleton */}
      <div className="grid md:grid-cols-[2fr,1fr] gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Section Skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-800/50 border-gray-700 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-[250px,1fr,auto] gap-6">
                  <Skeleton className="h-[200px]" />
                  <div className="p-6 md:p-4 space-y-4">
                    <div>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3 mt-1" />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="p-6 md:p-4 flex items-center">
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
// --- END LoadingSkeleton DEFINITION ---


export default function HostPage() {
  const { activeAddress } = useWallet()
  
  // Initialize state to empty/loading
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // CRITICAL: Determine the final address for fetching data
  const finalAddress = activeAddress || DEMO_HOST_ADDRESS;
  const isAddressReady = !!activeAddress || isDemoMode;
  
  // Use a second state to track if we've successfully made the initial fetch attempt
  const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);

  useEffect(() => {
    // CONDITION 1: Only proceed if an address is definitively set (connected or mock).
    if (!isAddressReady) {
      // Show loading screen until the wallet hook resolves activeAddress
      setIsLoading(true);
      return; 
    }
    
    // Skip if already attempted, unless the activeAddress changes (e.g., user connects/disconnects)
    if (initialFetchAttempted && !activeAddress) {
        // If we've fetched before, and activeAddress hasn't changed, rely on cached data.
        return;
    }

    async function fetchData() {
      console.log(`[HOST DASHBOARD] Fetching data for address: ${finalAddress}`);
      setIsLoading(true);
      
      try {
        
        // 1. Fetch user profile (Create if it doesn't exist)
        const { data: profile } = await supabase.from("users").select("*").eq("wallet_address", finalAddress).single()

        if (!profile) {
          // If the profile fetch fails, try to create it.
          const { data: newProfile } = await supabase
            .from("users")
            .insert([
              {
                wallet_address: finalAddress,
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .single()

          setUserProfile(newProfile)
          
          // Send welcome NFT to new user
          fetch('/api/welcome-nft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: finalAddress })
          }).catch(e => console.error("Welcome NFT mock failed:", e));

        } else {
          setUserProfile(profile)
        }

        // 2. Fetch events created by this wallet
        const { data: userEvents, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("created_by", finalAddress)
          .order("event_date", { ascending: false }) 

        if (eventsError) {
             console.error("DB Error fetching events:", eventsError);
             toast.error("Failed to fetch events from database.");
        }
        
        // DEBUGGING: Show the fetch address to the user
        const addressDisplay = finalAddress.slice(0, 5) + '...' + finalAddress.slice(-5);
        const eventCount = userEvents?.length || 0;
        toast.info(`Dashboard loaded for ${addressDisplay}. Found ${eventCount} event(s).`);

        setEvents(userEvents || [])
        
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("An error occurred while loading your dashboard.");
      } finally {
        setIsLoading(false);
        setInitialFetchAttempted(true);
      }
    }

    fetchData()
  }, [isAddressReady, activeAddress, isDemoMode]) 


  // Display Loading Skeleton until the fetch is attempted
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
  
  // CRITICAL CHECK: Show connection prompt if not connected and not in demo mode
  if (!activeAddress && finalAddress === DEMO_HOST_ADDRESS && !isDemoMode) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center p-8">
            <Card className="w-full max-w-md mx-4 bg-gray-800/50 border-gray-700">
                <CardContent className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
                    <p className="text-gray-400 mb-6">Please connect your Algorand wallet to view and manage your events.</p>
                    <Button onClick={() => toast.info("Use the 'Connect Wallet' button in the header.")}>
                        Connect Wallet
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Content - Renders only if not loading */}
            <div className="space-y-8">
              {/* Host Profile Section */}
              <div className="grid md:grid-cols-[2fr,1fr] gap-6">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h1 className="text-2xl font-bold mb-2">Host Dashboard</h1>
                        <p className="text-gray-400">Manage your events and profile</p>
                      </div>
                      <Button variant="outline" asChild>
                        <Link href="/create">
                          Create New Event
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Ticket className="w-5 h-5 text-primary" />
                            <Badge variant="outline">{events.length}</Badge>
                          </div>
                          <h3 className="font-medium">Total Events</h3>
                          <p className="text-sm text-gray-400">Events you've created</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Users className="w-5 h-5 text-green-500" />
                            <Badge variant="outline">{events.reduce((acc, event) => acc + event.max_tickets, 0)}</Badge>
                          </div>
                          <h3 className="font-medium">Total Tickets</h3>
                          <p className="text-sm text-gray-400">Across all events</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <Badge variant="outline">
                              {events.filter((e) => new Date(e.event_date) > new Date()).length}
                            </Badge>
                          </div>
                          <h3 className="font-medium">Upcoming Events</h3>
                          <p className="text-sm text-gray-400">Events yet to happen</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold">Profile Details</h2>
                      {/* FIXED: Added Link component to make the Settings button functional */}
                      <Button variant="ghost" size="icon" asChild>
                         <Link href="/profile"> 
                            <Settings className="w-4 h-4" />
                         </Link>
                      </Button>
                      {/* END FIXED */}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400">Wallet Address</label>
                        <p className="font-mono text-sm truncate">{finalAddress}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Member Since</label>
                        <p>{format(new Date(userProfile?.created_at || new Date()), "MMMM d, yyyy")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Events Section */}
              <div className="space-y-6">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="bg-gray-800/50">
                    <TabsTrigger value="all">All Events</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-6">
                    <EventsList events={events} />
                  </TabsContent>

                  <TabsContent value="upcoming" className="mt-6">
                    <EventsList events={events.filter((event) => new Date(event.event_date) > new Date())} />
                  </TabsContent>

                  <TabsContent value="past" className="mt-6">
                    <EventsList events={events.filter((event) => new Date(event.event_date) <= new Date())} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

function EventsList({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-12 text-center">
          <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
          <p className="text-gray-400 mb-6">Start creating events to see them listed here.</p>
          <Button asChild>
            <Link href="/create">Create Your First Event</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {events.map((event) => (
        <Card key={event.event_id} className="bg-gray-800/50 border-gray-700 overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-[250px,1fr,auto] gap-6">
              <div className="aspect-[4/3] md:aspect-auto relative">
                <img
                  src={event.image_url.replace("ipfs://", "https://ipfs.io/ipfs/") || "/placeholder.svg"}
                  alt={event.event_name}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Badge
                  className="absolute bottom-2 left-2"
                  variant={new Date(event.event_date) > new Date() ? "default" : "secondary"}
                >
                  {new Date(event.event_date) > new Date() ? "Upcoming" : "Past"}
                </Badge>
              </div>

              <div className="p-6 md:p-4 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{event.event_name}</h3>
                  <p className="text-gray-400 line-clamp-2">{event.description}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-primary" />
                    {format(new Date(event.event_date), "MMMM d, yyyy")}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5 text-primary" />
                    {event.location}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5 text-primary" />
                    {event.max_tickets} tickets
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-4 flex items-center">
                <Button asChild variant="outline">
                  {/* CORRECT: This link is correct to navigate to the manage page */}
                  <Link href={`/event/manage/${event.event_id}`}>
                    Manage Event
                    <Settings className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}