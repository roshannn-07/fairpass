import { NextResponse } from "next/server";
import algosdk from "algosdk";

const ALGOD_ADDRESS = process.env.ALGOD_ADDRESS!;
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || "";
const ASSET_ID = 749632100; // Change dynamically later

const client = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_ADDRESS);

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress)
      return NextResponse.json({ valid: false, message: "Missing walletAddress" });

    const accountInfo = await client.accountInformation(walletAddress).do();

    const hasAsset = accountInfo.assets?.some(
      (a: any) => a["asset-id"] === ASSET_ID && a.amount > 0
    );

    return NextResponse.json({
      valid: hasAsset,
      assetId: ASSET_ID,
      walletAddress,
    });

  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message });
  }
}
