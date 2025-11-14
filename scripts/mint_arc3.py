import os
from dotenv import load_dotenv
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

load_dotenv()  # Load .env file

ALGOD_ADDRESS = os.getenv("ALGOD_ADDRESS")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN")
SENDER_MNEMONIC = os.getenv("SENDER_MNEMONIC")

def wait_for_confirmation(client, txid):
    last_round = client.status()["last-round"]
    while True:
        info = client.pending_transaction_info(txid)
        if info.get("confirmed-round", 0) > 0:
            return info
        last_round += 1
        client.status_after_block(last_round)


def main():
    print("=========================================")
    print("DEBUG: READING MNEMONIC FROM .env")
    print("=========================================")

    print("Loaded mnemonic:", repr(SENDER_MNEMONIC))
    print("Word count:", len(SENDER_MNEMONIC.split()))
    print("-----------------------------------------")

    if len(SENDER_MNEMONIC.split()) != 25:
        print("❌ ERROR: Your mnemonic is NOT 25 words.")
        print("Fix `.env` → SENDER_MNEMONIC must be ONE LINE with EXACTLY 25 words.")
        return

    # Connect to AlgoNode TestNet
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

    # Recover account
    sender_sk = mnemonic.to_private_key(SENDER_MNEMONIC)
    sender_addr = account.address_from_private_key(sender_sk)
    print("Using wallet address:", sender_addr)

    # Get params
    params = client.suggested_params()

    # ARC-3 metadata URL
    metadata_url = "https://example.com/metadata.json"

    # Create ARC-3 NFT
    txn = transaction.AssetConfigTxn(
        sender=sender_addr,
        sp=params,
        total=1,
        decimals=0,
        unit_name="FPASS",
        asset_name="FairPass Ticket #1",
        url=metadata_url,
        default_frozen=False,
        manager=sender_addr,
        reserve=sender_addr,
        freeze=sender_addr,
        clawback=sender_addr
    )

    stxn = txn.sign(sender_sk)
    txid = client.send_transaction(stxn)
    print("Transaction sent:", txid)

    result = wait_for_confirmation(client, txid)
    asset_id = result["asset-index"]

    print("\n🎉 ARC-3 NFT CREATED SUCCESSFULLY!")
    print("Asset ID:", asset_id)
    print("Explorer URL:")
    print(f"https://testnet.algoexplorer.io/asset/{asset_id}")


if __name__ == "__main__":
    main()
