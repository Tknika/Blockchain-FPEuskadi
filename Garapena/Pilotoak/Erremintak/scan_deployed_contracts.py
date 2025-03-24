from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware  # Updated import for v7.9.0
import json
from typing import List, Dict

# Connect to Besu nodes
BESU_NODES = ["http://localhost:8545"]

def get_contract_addresses(web3: Web3, start_block: int, end_block: int) -> List[Dict]:
    deployed_contracts = []
    
    for block_num in range(start_block, end_block + 1):
        try:
            # Print progress message every 10000 blocks
            if block_num % 10000 == 0:
                print(f"Scanned {block_num - start_block} blocks...")
                
            block = web3.eth.get_block(block_num, full_transactions=True)
            
            # Check each transaction in the block
            for tx in block.transactions:
                # Contract creation transactions have 'to' address as None
                if tx['to'] is None and tx['input'] != '0x':
                    # Get the transaction receipt to find contract address
                    receipt = web3.eth.get_transaction_receipt(tx['hash'])
                    if receipt['contractAddress']:
                        contract_info = {
                            'address': receipt['contractAddress'],
                            'creator': tx['from'],
                            'block_number': block_num,
                            'transaction_hash': tx['hash'].hex()
                        }
                        deployed_contracts.append(contract_info)
                        print(f"Found contract at {receipt['contractAddress']}")
        except Exception as e:
            print(f"Error processing block {block_num}: {e}")
            continue
            
    return deployed_contracts

def scan_blockchain():
    # Try connecting to available nodes
    web3 = None
    for node in BESU_NODES:
        try:
            web3 = Web3(Web3.HTTPProvider(node))
            
            # Add POA middleware at layer 0 (innermost layer)
            # This is CRUCIAL according to the documentation
            web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
            
            if web3.is_connected():
                print(f"Connected to node: {node}")
                break
        except Exception as e:
            print(f"Failed to connect to {node}: {e}")
            continue
    
    if not web3 or not web3.is_connected():
        print("Could not connect to any Besu node")
        return

    latest_block = web3.eth.block_number
    print(f"\nLatest block number: {latest_block}")
    
    # Scan last 1000 blocks by default
    #start_block = max(0, latest_block - 1000)
    start_block = 710000 #no hay contratos antes

    print(f"\nScanning blocks from {start_block} to {latest_block}")
    contracts = get_contract_addresses(web3, start_block, latest_block)
    
    print("\nDeployed Contracts Found:")
    print("------------------------")
    for contract in contracts:
        print(f"Address: {contract['address']}")
        print(f"Creator: {contract['creator']}")
        print(f"Block Number: {contract['block_number']}")
        print(f"Transaction Hash: {contract['transaction_hash']}")
        print("------------------------")

if __name__ == "__main__":
    scan_blockchain()

