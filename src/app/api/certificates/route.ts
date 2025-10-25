import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { mintAndSendCertificateNFT } from "@/lib/certificate-minting" // NEW IMPORT
import algosdk from "algosdk" // NEW IMPORT

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// MOCK Algod Client and Signer for Server-Side (API Route) Minting
// This is required to satisfy the mintAndSendCertificateNFT function signature
const MOCK_ALGOD_CLIENT = new algosdk.Algodv2("MOCK_TOKEN", "MOCK_SERVER_URL", 443); 
const MOCK_TXN_SIGNER = async (txns: algosdk.Transaction[], indexesToSign: number[]) => {
    console.log("[DEMO MOCK] Signing Certificate Minting Transactions...")
    // In a production environment, this function would use a private key from a secure store 
    // (e.g., a server vault) to sign the transaction.
    return txns.map(() => new Uint8Array(0)); // Returns mock signed txns
}


/**
 * Handles POST requests to mint certificates for event attendees.
 * Verifies event ownership, checks if the event is completed, and creates certificates (ASAs/PoAPs).
 * @param request - The incoming request containing eventId, attendeeAddresses, and creatorAddress
 * @returns A JSON response with success status or error message
 */
export async function POST(request: Request) {
  try {
    console.log("Minting certificates for event")
    const { eventId, attendeeAddresses, creatorAddress } = await request.json()

    // Verify event owner 
    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("event_id", eventId)
      .eq("created_by", creatorAddress)
      .single()

    if (!event) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 403 })
    }

    // Check if event is completed
    if (new Date(event.event_date) > new Date()) {
      return NextResponse.json({ error: "Event not yet completed" }, { status: 400 })
    }

    // --- Feature 3: Dynamic Certificate NFT Minting ---
    const mintedCertificates = []
    for (const address of attendeeAddresses) {
        // Calls the PoAP utility, which returns a mock asset ID in the demo utility file.
        const assetId = await mintAndSendCertificateNFT(
            event,
            address,
            MOCK_ALGOD_CLIENT,
            MOCK_TXN_SIGNER
        );

        if (assetId) {
            mintedCertificates.push({
                event_id: eventId,
                attendee_address: address,
                certificate_id: assetId, // Use the actual Asset ID/Mock ID
                issued_at: new Date().toISOString(),
                metadata: {
                    eventName: event.event_name,
                    eventDate: event.event_date,
                    certificateType: "PoAP" // Proof of Attendance Protocol
                }
            })
        }
    }

    if (mintedCertificates.length === 0) {
        return NextResponse.json({ error: "Failed to mint any certificates. Check logs/Supabase connection." }, { status: 500 })
    }

    // Create certificates records in Supabase
    const { error } = await supabase.from("certificates").insert(mintedCertificates)
    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: `${mintedCertificates.length} PoAP certificates minted and recorded successfully` 
    })
  } catch (error) {
    console.error("Certificate minting error:", error)
    return NextResponse.json({ error: "Failed to mint certificates" }, { status: 500 })
  }
}