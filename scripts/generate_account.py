from algosdk import account, mnemonic

# Generate a new Algorand account
private_key, address = account.generate_account()

mn = mnemonic.from_private_key(private_key)

print("=====================================")
print(" NEW ALGORAND ACCOUNT GENERATED")
print("=====================================")
print("Address:", address)
print()
print("IMPORTANT — SAVE YOUR 25-WORD MNEMONIC:")
print(mn)
print("=====================================")
