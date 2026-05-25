import json
from pathlib import Path
from eth_account import Account
from eth_keys import keys
from web3 import Web3

# Prompt the user for the contract name, then build file paths with subfolders accordingly.
script_dir = Path(__file__).resolve().parent
contract_name = input("Enter the contract name (e.g., Bozketa): ").strip()
bytecode_path = script_dir / 'bytecode' / f"{contract_name}.bytecode"
abi_path = script_dir / 'abi' / f"{contract_name}.abi"

# Connect to the node (ensure the node at this address is up and accessible!)
web3 = Web3(Web3.HTTPProvider('http://192.168.100.1:8545'))
if not web3.is_connected():
    raise Exception("Web3 could not connect to 192.168.100.1:8545")

# Load the bytecode
with open(bytecode_path, 'r') as f:
    bytecode = f.read().strip()

# Load the ABI
with open(abi_path, 'r') as f:
    abi = json.load(f)

# Generate a brand-new Ethereum account. This account deploys the contract,
# so it becomes the owner inside Bozketa's constructor.
account = Account.create()
private_key = account.key
public_key = keys.PrivateKey(private_key).public_key

print("Generated new contract owner account:")
print(f"  Address:     {account.address}")
print(f"  Public key:  {public_key.to_hex()}")
print(f"  Private key: {private_key.hex()}")

balance = web3.eth.get_balance(account.address)
print(f"  Balance:     {web3.from_wei(balance, 'ether')} ETH")
print("  Gas price:   0 wei")

Kontratua = web3.eth.contract(abi=abi, bytecode=bytecode)

deployment_tx = Kontratua.constructor().build_transaction({
    'from': account.address,
    'nonce': web3.eth.get_transaction_count(account.address),
    'chainId': web3.eth.chain_id,
    'gas': 8_000_000,
    # This private network accepts zero-gas transactions, so the generated
    # account can deploy without receiving funds first.
    'gasPrice': 0,
})

signed_tx = web3.eth.account.sign_transaction(deployment_tx, private_key)
raw_transaction = getattr(signed_tx, 'raw_transaction', signed_tx.raw_transaction)
tx_hash = web3.eth.send_raw_transaction(raw_transaction)
print(f"Transaction hash: {tx_hash.hex()}")

# Wait for the transaction receipt
tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
print(f"Deployed contract address: {tx_receipt.contractAddress}")