import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type UserDetails = {
  email: string
  firstName: string
  lastName: string
}

export async function getOrCreateUser(walletAddress: string, userDetails?: UserDetails) {
  console.log("getOrCreateUser function executed")
  console.log("Wallet address:", walletAddress)
  try {
    // First, check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("user_id")
      .eq("wallet_address", walletAddress)
      .single()

    if (existingUser) {
      // If user exists and we have new details, update them
      if (userDetails) {
        const { error: updateError } = await supabase
          .from("users")
          .update({
            email: userDetails.email,
            first_name: userDetails.firstName,
            last_name: userDetails.lastName,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", existingUser.user_id)

        if (updateError) throw updateError
      }
      return { user_id: existingUser.user_id, error: null }
    }

    // If user doesn't exist, create new user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          wallet_address: walletAddress,
          email: userDetails?.email,
          first_name: userDetails?.firstName,
          last_name: userDetails?.lastName,
          created_at: new Date().toISOString(),
        },
      ])
      .select("user_id")
      .single()

    if (error) {
      throw error
    }

    return { user_id: newUser.user_id, error: null }
  } catch (error) {
    console.error("Error in getOrCreateUser:", error)
    return { user_id: null, error }
  }
}

// --- Add this function to src/lib/userCreation.ts ---
export async function getHostSpecificAttendanceCount(hostAddress: string, attendeeAddress: string) {
  console.log("getHostSpecificAttendanceCount executed")
  try {
    // 1. Find all event IDs created by the host
    const { data: hostEvents, error: eventError } = await supabase
      .from("events")
      .select("event_id")
      .eq("created_by", hostAddress)
    
    if (eventError) throw eventError

    const hostEventIds = hostEvents.map(e => e.event_id)

    // 2. Find how many approved requests (attended tickets) the attendee has for those events
    // NOTE: Assuming an 'attended' column/status would be checked here. For demo, we'll count 'approved' requests.
    const { count: attendanceCount, error: countError } = await supabase
      .from("requests")
      .select("request_id", { count: "exact" })
      .eq("wallet_address", attendeeAddress)
      .eq("request_status", "approved") // In a real app, this would check an 'attended' status
      .in("event_id", hostEventIds)

    if (countError) throw countError
    
    return attendanceCount || 0
  } catch (error) {
    console.error("Error fetching attendance count:", error)
    return 0
  }
}
// --- END: Add this function to src/lib/userCreation.ts ---