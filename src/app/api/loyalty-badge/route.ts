// --- Create new file: src/app/api/loyalty-badge/route.ts ---
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getHostSpecificAttendanceCount } from "@/lib/userCreation" // New Import
import { mintAndSendLoyaltyBadgeNFT } from "@/lib/algorand-utils" // To be created in next step

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const LOYALTY_THRESHOLD = 3 // Attend 3 events to get the badge

/**
 * Handles POST requests to check attendance and mint a loyalty badge NFT.
 * @param request - The incoming request containing hostAddress and attendeeAddress
 * @returns A JSON response with success status or error message
 */
export async function POST(request: Request) {
  try {
    console.log("Checking attendance and attempting to mint loyalty badge")
    const { hostAddress, attendeeAddress } = await request.json()

    if (!hostAddress || !attendeeAddress) {
      return NextResponse.json({ error: "Missing addresses" }, { status: 400 })
    }

    // 1. Check if user already has a badge from this host (for simplicity, we skip this check for now)
    // In a real app, we'd check a 'loyalty_badges' table

    // 2. Check attendance count
    const attendanceCount = await getHostSpecificAttendanceCount(hostAddress, attendeeAddress)

    if (attendanceCount < LOYALTY_THRESHOLD) {
      return NextResponse.json({ 
        message: `Attendance count is ${attendanceCount}. Not enough for a badge (requires ${LOYALTY_THRESHOLD}).` 
      }, { status: 400 })
    }

    // 3. Mint and send the badge NFT
    const badgeAssetId = await mintAndSendLoyaltyBadgeNFT(attendeeAddress, hostAddress)
    
    // In a real application, you would save this badgeAssetId and hostAddress association to a database table.
    // For this demo, we assume the minting and transfer is the success criteria.

    if (badgeAssetId) {
        return NextResponse.json({ 
            success: true, 
            message: `Loyalty Badge NFT minted and sent. Asset ID: ${badgeAssetId}` 
        })
    } else {
        return NextResponse.json({ error: "Failed to mint/send badge NFT" }, { status: 500 })
    }

  } catch (error) {
    console.error("Loyalty Badge minting error:", error)
    return NextResponse.json({ error: "Failed to process loyalty badge request" }, { status: 500 })
  }
}
// --- END: Create new file: src/app/api/loyalty-badge/route.ts ---