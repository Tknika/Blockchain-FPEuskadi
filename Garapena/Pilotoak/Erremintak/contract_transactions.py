from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
import json
from typing import List, Dict
import time
import requests
import sys

# Default provider URL
DEFAULT_PROVIDER_URL = "http://localhost:8545"

def get_contract_transactions(contract_address: str, provider_url: str = DEFAULT_PROVIDER_URL) -> List[Dict]:
    """Get all transactions for a specific contract address"""
    
    # Set up a timeout for the web3 provider
    session = requests.Session()
    session.timeout = 10  # 10 seconds timeout
    
    # Connect to the Ethereum node with timeout
    web3 = Web3(Web3.HTTPProvider(
        provider_url,
        request_kwargs={'timeout': 10}
    ))
    
    # Add POA middleware
    web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    
    if not web3.is_connected():
        print(f"Failed to connect to {provider_url}")
        return []
    
    print(f"Connected to {provider_url}")
    
    # Get the latest block number
    try:
        latest_block = web3.eth.block_number
        print(f"Latest block: {latest_block}")
    except Exception as e:
        print(f"Error getting latest block: {e}")
        return []
    
    # Start from a reasonable block (adjust as needed)
    start_block = max(0, latest_block - 10000)  # Last 10000 blocks
    
    transactions = []
    
    print(f"Scanning blocks {start_block} to {latest_block} for transactions to/from {contract_address}")
    
    # Process blocks with progress updates
    for block_num in range(start_block, latest_block + 1):
        # Print progress every 1000 blocks
        if block_num % 1000 == 0:
            print(f"Processing block {block_num} ({(block_num - start_block) / (latest_block - start_block + 1) * 100:.1f}%)")
        
        try:
            # Get block with timeout protection
            block = web3.eth.get_block(block_num, full_transactions=True)
            
            # Process transactions in the block
            for tx in block.transactions:
                # Check if transaction is related to our contract
                if tx['to'] == contract_address or tx['from'] == contract_address:
                    tx_info = {
                        'hash': tx['hash'].hex(),
                        'from': tx['from'],
                        'to': tx['to'],
                        'value': web3.from_wei(tx['value'], 'ether'),
                        'block_number': block_num,
                        'timestamp': block.timestamp
                    }
                    transactions.append(tx_info)
                    print(f"Found transaction: {tx_info['hash']}")
        
        except requests.exceptions.Timeout:
            print(f"Timeout processing block {block_num}, skipping")
            continue
        except Exception as e:
            print(f"Error processing block {block_num}: {e}")
            continue
    
    return transactions

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python contract_transactions.py <contract_address> [provider_url]")
        sys.exit(1)
    
    contract_address = sys.argv[1]
    provider_url = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_PROVIDER_URL
    
    print(f"Getting transactions for contract: {contract_address}")
    transactions = get_contract_transactions(contract_address, provider_url)
    
    print(f"\nFound {len(transactions)} transactions")
    for tx in transactions:
        print(f"Transaction: {tx['hash']}")
        print(f"From: {tx['from']}")
        print(f"To: {tx['to']}")
        print(f"Value: {tx['value']} ETH")
        print(f"Block: {tx['block_number']}")
        print("------------------------")