from algosdk.v2client import algod

client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
asset_id = 749631969

info = client.asset_info(asset_id)
print(info)
