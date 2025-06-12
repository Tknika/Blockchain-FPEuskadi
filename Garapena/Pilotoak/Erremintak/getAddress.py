from web3 import Web3

def get_public_address_and_key(private_key):
    w3 = Web3()
    account = w3.eth.account.from_key(private_key)
    
    # Get the public key (uncompressed format, 64 bytes)
    public_key = account._key_obj.public_key
    public_key_hex = public_key.to_hex()
    
    return account.address, public_key_hex

# Example usage
#private_key = "0xe6a413b0e7813bec1877175e1260502405828b53e83a36e5f9df1966821a402d"  # Replace with your private key
private_key = Web3().eth.account.create().key.hex()
print(f"Generated private key: {private_key}")
public_address, public_key = get_public_address_and_key(private_key)
print(f"Public address: {public_address}")
print(f"Public key: {public_key}")
