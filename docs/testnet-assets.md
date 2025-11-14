# FairPass – Algorand TestNet Deployment Records

This document contains all real Algorand TestNet assets deployed for the FairPass project as part of the AlgoBharat HackSeries-2 submission.

---

## 1. ARC-3 Ticket NFT (FairPass Ticket)

**Purpose:**  
Represents an event ticket as a verifiable ARC-3 NFT non-fungible asset on the Algorand blockchain.

**Details:**
- **Asset ID:** 749632100
- **Mint Transaction ID:** JBRMWWM2QDZBSS667ZB3FLQUS22M3RMREAXFBTXYFYUXTFCZHZ2Q
- **Explorer (Allo):**  
  https://allo.info/testnet/asset/749632100

**Notes:**  
- NFT represents 1 event ticket.  
- Total supply = 1 (non-fungible).  
- Used for wallet-based ticket verification.  
- Verified via API and Pera Wallet.

---

## 2. ARC-20 Loyalty Token (FairPoints)

**Purpose:**  
Fungible token used as a reward/loyalty system for attendees.  
Users can accumulate FairPoints for check-ins, attendance, or special events.

**Details:**
- **Asset ID:** 749632546
- **Mint Transaction ID:** AQS3XUKNIVHBQDEE4GQWVIJ5JXHWHVOYE4B5PR2C43THHXQGXXVA
- **Explorer (Allo):**  
  https://allo.info/testnet/asset/749632546

**Token Parameters:**
- **Total Supply:** 1,000,000  
- **Decimals:** 2  
  (e.g., 125 = 1.25 FairPoints)  
- Fully controlled by project admin address.

---

## 3. Verification Node Configuration

FairPass uses AlgoNode TestNet as its blockchain provider:
ALGOD_ADDRESS="https://testnet-api.algonode.cloud
"
ALGOD_TOKEN=""


This ensures:
- stable RPC connection  
- quick indexing  
- reliable asset lookups

---

## 4. Wallet Used for Deployment

All assets were minted using a dedicated Algorand TestNet account (imported into Pera Wallet):
CPIRNLLNBFOYZQBCIX4WJ6WJ4HZOMFQTXHGGS5T4WJKZNB7U6ZILBV3YGI


---

## 5. Explorer Indexing Notes

Because this project uses TestNet, explorers may delay indexing:

- Allo Explorer: ~1–20 minutes  
- AlgoExplorer TestNet: sometimes unstable  
- GoalSeeker: shutting down soon  

All assets were tested using:
- Pera Wallet  
- direct Algod SDK queries  
- Allo.info TestNet explorer

---

## 6. Purpose of TestNet Deployment

These assets validate that FairPass is a real blockchain application:

- No mocks for the core flow  
- Real NFT + real FT  
- Actual wallet signing  
- On-chain verifiable ownership  
- Live API checks using blockchain state

This satisfies the AlgoBharat judging pillars:
- Utility  
- Scalability  
- Code Quality  

---

## 7. Future On-Chain Components (Planned)

- ARC-3 event badges (PoAP system)  
- ARC-20 reward marketplace  
- Smart Contract–based clawback rules for transfer-restricted tickets  
- Event-specific NFT series  


