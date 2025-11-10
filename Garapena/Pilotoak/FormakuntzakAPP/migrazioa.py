from web3 import Web3
import json, os, random, argparse


########### VARIABLES GLOBALES ###########
BK_PROVIDER = list(os.environ.get('BK_PROVIDER').split(","))
BK_PROVIDER_PORT = os.environ.get('BK_PROVIDER_PORT')
BK_CHAIN_ID = int(os.environ.get('BK_CHAIN_ID'))
BK_CONTRACT_ADDRESS = os.environ.get('BK_CONTRACT_ADDRESS')
BK_ABI_PATH = os.environ.get('BK_ABI_PATH')
BK_OWNER_ADDRESS = os.environ.get('BK_OWNER_ADDRESS')
BK_OWNER_PRIVATE = os.environ.get('BK_OWNER_PRIVATE')
BK_BASE_URI = os.environ.get('BK_BASE_URI')

# -------------------------
# Configuración blockchain
# -------------------------
#w3 = Web3(Web3.HTTPProvider("http://217.127.110.21:8545"))
print(type(BK_PROVIDER), flush=True)
random.shuffle(BK_PROVIDER)
for i in range(len(BK_PROVIDER)):
    provider = BK_PROVIDER[i]+":"+BK_PROVIDER_PORT
    print("Provider: "+provider, flush=True)

    w3 = Web3(Web3.HTTPProvider(provider))
    if w3.is_connected():
        print("SIIIIIIIIIIIIIIIII: "+provider, flush=True)
        break

owner = BK_OWNER_ADDRESS  # debe ser owner del contrato nuevo
private_key = BK_OWNER_PRIVATE

# Cargar ABI del contrato viejo
with open(BK_ABI_PATH, "r") as f:
    old_abi = f.read()

# Cargar ABI del contrato nuevo
with open("static/abi/Formakuntzav2.abi") as f:
    new_abi = f.read()

# Direcciones de los contratos
old_address = Web3.to_checksum_address(BK_CONTRACT_ADDRESS)
new_address = Web3.to_checksum_address("0x37Cb4BC4De0B55b7a824Bd85C2DD57Fb74b03cD8")

old_contract = w3.eth.contract(address=old_address, abi=old_abi)
new_contract = w3.eth.contract(address=new_address, abi=new_abi)

# -------------------------
# Función de migración
# -------------------------
def migrate_all(min_id: int = 0, max_id: int = 10):
    print("Iniciando migración de NFTs...")
    next_token_old = old_contract.functions.getNextTokenId().call()
    print(f"Next tokenId en contrato viejo: {next_token_old}")
    total = old_contract.functions.totalSupply().call()
    print(f"Total de NFTs en contrato viejo: {total}")

    total_new= new_contract.functions.totalSupply().call()
    print(f"Total de NFTs en contrato nuevo: {total_new}")
    next_token_new = new_contract.functions.getNextTokenId().call()
    print(f"Next tokenId en contrato nuevo: {next_token_new}")

    nonce = w3.eth.get_transaction_count(owner)
    #nonce = w3.manager.request_blocking(
    #    "eth_getTransactionCount", 
    #    [BK_OWNER_ADDRESS, "pending"]
    #)
    
    # min_id y max_id se reciben como parámetros (valores por defecto 0 y 10)
    # min_id, max_id = min_id, max_id
    
    for i in range(min_id, max_id + 1):
    #for i in range(total):
        token_id = old_contract.functions.tokenByIndex(i).call()
        print(f"i {i} → TokenId {token_id}", flush=True)
        # Saltar los que no estén en el rango
        #if token_id < min_id or token_id > max_id:
        #    continue

        uri = old_contract.functions.tokenURI(token_id).call()
        text_info = old_contract.functions.tokenTextInfo(token_id).call()
        to = old_contract.functions.ownerOf(token_id).call()

        print(f"Migrando tokenId {token_id, to, uri, text_info} → owner {to}", flush=True)

        # Llamada a mintWithId
        tx = new_contract.functions.mintWithId(to, token_id, uri, text_info).build_transaction({
            'chainId': BK_CHAIN_ID,  # ID de la red
            'from': BK_OWNER_ADDRESS,
            'nonce': nonce,
            'maxFeePerGas': 0,
            'maxPriorityFeePerGas': 0,
        })
        
        nonce += 1

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        print(f"   ✅ Token {token_id} migrado en bloque {receipt.blockNumber}", flush=True)
    
    
    # Mostrar el siguiente tokenId auto-incremental
    new_name = new_contract.functions.name().call()
    print(f"Nombre del contrato: {new_name}")
    next_id = new_contract.functions.getNextTokenId().call()
    print(f"Migración completada. Next tokenId para safeMint: {next_id}")
    text_info = new_contract.functions.tokenTextInfo(max_id).call()
    print(f"Text info del último token migrado (id {max_id}): {text_info}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrar NFTs desde contrato viejo a nuevo")
    parser.add_argument("--min_id", type=int, default=0, help="TokenId mínimo a migrar (inclusive). Default: 0")
    parser.add_argument("--max_id", type=int, default=10, help="TokenId máximo a migrar (inclusive). Default: 10")
    args = parser.parse_args()
    migrate_all(args.min_id, args.max_id)
