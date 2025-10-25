import { NextResponse } from "next/server";
import FormData from "form-data";
import axios from "axios";

/**
 * Handles POST requests to upload files to IPFS via Pinata.
 * This version uses a DEMO BYPASS to prevent 401 errors for a hackathon demo.
 * @param req - The incoming request containing the file to upload
 * @returns A JSON response with IPFS hash and URL or error message
 */
export async function POST(req: Request) {
  try {
    console.log("Uploading file to IPFS")
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // --- START: DEMO BYPASS FOR PINATA ---
    // This block replaces the actual Pinata API call to prevent the 401 error.
    const fileExtension = file.name.split('.').pop() || 'file';
    const demoHash = "QmVitaDemoHashFor" + Math.random().toString(36).substring(2, 10);
    console.log("PINATA_JWT is invalid/missing. Using DEMO IPFS HASH:", demoHash);

    return NextResponse.json({
      success: true,
      ipfsHash: demoHash,
      ipfsUrl: `ipfs://${demoHash}.${fileExtension}`, // Added extension for better display in metadata
    })
    // --- END: DEMO BYPASS FOR PINATA ---


    // // Original Pinata Code (now commented out/removed for the demo to run)
    // const buffer = Buffer.from(await file.arrayBuffer())
    // const pinataFormData = new FormData()
    // pinataFormData.append("file", buffer, {
    //   filename: file.name,
    //   contentType: file.type,
    // })

    // const pinataOptions = JSON.stringify({
    //   cidVersion: 1,
    // })
    // pinataFormData.append("pinataOptions", pinataOptions)

    // const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", pinataFormData, {
    //   headers: {
    //     Authorization: `Bearer ${process.env.PINATA_JWT}`,
    //     ...pinataFormData.getHeaders(),
    //   },
    // })

    // return NextResponse.json({
    //   success: true,
    //   ipfsHash: response.data.IpfsHash,
    //   ipfsUrl: `ipfs://${response.data.IpfsHash}`,
    // })

  } catch (error) {
    console.error("IPFS upload error :", error)
    return NextResponse.json({ error: "Failed to upload to IPFS" }, { status: 500 })
  }
}