import os
from dotenv import load_dotenv
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

load_dotenv()

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
    sender_sk = mnemonic.to_private_key(SENDER_MNEMONIC)
    sender_addr = account.address_from_private_key(sender_sk)

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    params = client.suggested_params()

    txn = transaction.AssetConfigTxn(
        sender=sender_addr,
        sp=params,
        total=1_000_000,            # 1 Million tokens
        decimals=2,                 # 2 decimal places (ex: 1.25 FP)
        unit_name="FPS",
        asset_name="FairPoints",
        url="https://yourdomain.com/fairpoints.json",
        default_frozen=False,
        manager=sender_addr,
        reserve=sender_addr,
        freeze=sender_addr,
        clawback=sender_addr,
    )

    stxn = txn.sign(sender_sk)
    txid = client.send_transaction(stxn)

    result = wait_for_confirmation(client, txid)
    asset_id = result["asset-index"]

    print("\n🎉 ARC-20 TOKEN MINTED SUCCESSFULLY!")
    print("Asset ID:", asset_id)
    print("TxID:", txid)
    print(f"https://allo.info/testnet/asset/{asset_id}")

if __name__ == "__main__":
    main()
