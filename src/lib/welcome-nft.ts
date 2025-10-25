import algosdk from "algosdk"

export interface WelcomeNFTMetadata {
  name: string
  description: string
  image: string
  properties: {
    type: "welcome"
    memberSince: string
    platform: "fairpass-nft-ticketing" // Corrected case
  }
}

export async function createWelcomeNFT(
  userAddress: string,
  algodClient: algosdk.Algodv2,
  transactionSigner: any
): Promise<number | null> {
  console.log("createWelcomeNFT function executed")
  console.log("User address for welcome NFT:", userAddress)

  const platformAddress = process.env.PLATFORM_WALLET_ADDRESS;
  
  if (!platformAddress) {
    console.error("PLATFORM_WALLET_ADDRESS is not set in environment variables.")
    return null;
  }

  try {
    const suggestedParams = await algodClient.getTransactionParams().do()
    
    const metadata: WelcomeNFTMetadata = {
      name: "Welcome to FairPass NFT Ticketing",
      description: "Your exclusive welcome NFT for joining our platform",
      image: "ipfs://QmWelcomeNFTHash", // Replace with actual IPFS hash
      properties: {
        type: "welcome",
        memberSince: new Date().toISOString(),
        platform: "fairpass-nft-ticketing"
      }
    }

    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      sender: platformAddress, // Use validated address
      total: 1,
      decimals: 0,
      assetName: metadata.name,
      unitName: "WELCOME",
      assetURL: metadata.image,
      manager: platformAddress, // Use validated address
      reserve: platformAddress, // Use validated address
      freeze: undefined,
      clawback: undefined,
      defaultFrozen: false,
      suggestedParams,
      note: new TextEncoder().encode(JSON.stringify({
        standard: "arc69",
        ...metadata
      }))
    })

    const signedTxn = await transactionSigner([txn], [0])
    const { txid } = await algodClient.sendRawTransaction(signedTxn[0]).do()
    
    // Explicitly cast result to 'any' for property access reliability
    const result: any = await algosdk.waitForConfirmation(algodClient, txid, 4)
    
    // FIX: Use asset-index property which is what Algorand returns, with assetIndex as fallback.
    const assetId = result["asset-index"] || result["assetIndex"];

    if (!assetId) {
        console.error("Could not retrieve Asset ID from confirmation result.")
        return null;
    }
    
    // Transfer NFT to user
    const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: platformAddress, // Use validated address
      receiver: userAddress,
      assetIndex: Number(assetId), // Ensure it is a number
      amount: 1,
      suggestedParams
    })

    const signedTransferTxn = await transactionSigner([transferTxn], [0])
    await algodClient.sendRawTransaction(signedTransferTxn[0]).do()
    
    return Number(assetId)
  } catch (error) {
    console.error("Error creating welcome NFT:", error)
    return null
  }
}