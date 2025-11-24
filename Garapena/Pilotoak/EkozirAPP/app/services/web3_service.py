"""Shared Web3 client and Ekozir contract bindings."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from eth_typing import ChecksumAddress
from flask import Flask, current_app
from web3 import Web3
from web3.contract import Contract
from web3.types import TxReceipt


@dataclass
class Web3Resources:
    """Container for the shared Web3 objects."""

    web3: Web3
    contract: Contract
    server_account: Optional[ChecksumAddress] = None  # Server's account for transaction execution


_resources: Optional[Web3Resources] = None


def init_web3(app: Flask) -> None:
    """
    Initialise the Web3 client and Ekozir contract.

    The objects are stored globally so that subsequent requests reuse the same
    HTTP connection pool.
    """
    global _resources

    if _resources is not None:
        # Already initialised during a hot reload or multiple test runs.
        return

    rpc_urls = app.config.get("BESU_RPC_URLS", [])
    chain_id = app.config["BESU_CHAIN_ID"]
    abi = app.config["EKOZIR_CONTRACT_ABI"]
    address = app.config["EKOZIR_CONTRACT_ADDRESS"]

    last_error: Exception | None = None
    web3_client: Web3 | None = None

    for rpc in rpc_urls:
        candidate = Web3(Web3.HTTPProvider(rpc))
        if candidate.is_connected():
            web3_client = candidate
            app.config["BESU_RPC_URL"] = rpc  # record the working endpoint
            break
        last_error = ConnectionError(
            f"Unable to connect to Besu RPC endpoint at {rpc}. Ensure the node is running and accessible."
        )

    if web3_client is None:
        if last_error is None:
            raise ConnectionError("No Besu RPC endpoints configured.")
        raise last_error

    # Normalise the configured address if provided.
    checksum_address: ChecksumAddress | None = None
    if address:
        checksum_address = web3_client.to_checksum_address(address)

    contract = None
    if checksum_address:
        contract = web3_client.eth.contract(address=checksum_address, abi=abi)

    # Load server's account from private key for transaction execution
    server_account: Optional[ChecksumAddress] = None
    private_key = app.config.get("EKOZIR_PRIVATE_KEY", "")
    if private_key:
        # Remove '0x' prefix if present
        if private_key.startswith("0x"):
            private_key = private_key[2:]
        account = web3_client.eth.account.from_key(private_key)
        server_account = web3_client.to_checksum_address(account.address)

    _resources = Web3Resources(
        web3=web3_client,
        contract=contract,
        server_account=server_account
    )

    # Store basic connection info for route handlers/templates.
    app.config["WEB3_CHAIN_ID"] = chain_id
    app.config["WEB3_IS_CONNECTED"] = True


def get_web3() -> Web3:
    """Return the shared Web3 client."""
    if _resources is None:
        raise RuntimeError("Web3 has not been initialised. Did you call init_web3?")
    return _resources.web3


def get_contract() -> Contract:
    """Return the instantiated Ekozir contract."""
    if _resources is None or _resources.contract is None:
        raise RuntimeError(
            "Ekozir contract is not available. Set EKOZIR_CONTRACT_ADDRESS in the environment."
        )
    return _resources.contract


def get_signer_account() -> ChecksumAddress:
    """
    Return the server's account address for transaction execution.
    
    This account is derived from EKOZIR_PRIVATE_KEY environment variable.
    """
    if _resources is None:
        raise RuntimeError("Web3 has not been initialised. Did you call init_web3?")
    if _resources.server_account is None:
        raise RuntimeError(
            "Server account not configured. Set EKOZIR_PRIVATE_KEY in the environment."
        )
    return _resources.server_account


def build_default_call_args(from_address: Optional[str] = None) -> Dict[str, Any]:
    """
    Prepare the call dictionary passed to view functions.

    For view functions, we use the server's account. The from_address parameter
    is kept for backward compatibility but is no longer required since the server
    executes all transactions.
    """
    # Use server's account for all calls
    server_account = get_signer_account()
    return {"from": server_account}


def send_transaction(function_call, *args, **kwargs) -> TxReceipt:
    """
    Execute a contract transaction using the server's private key.
    
    This function signs and sends transactions synchronously, waiting for
    the transaction to be mined.
    
    Args:
        function_call: The contract function call (e.g., contract.functions.signUp(...))
        *args: Additional positional arguments
        **kwargs: Additional keyword arguments
    
    Returns:
        Transaction receipt
    """
    if _resources is None:
        raise RuntimeError("Web3 has not been initialised. Did you call init_web3?")
    
    web3 = _resources.web3
    server_account = get_signer_account()
    private_key = current_app.config.get("EKOZIR_PRIVATE_KEY", "")
    
    if not private_key:
        raise RuntimeError("EKOZIR_PRIVATE_KEY not configured")
    
    # Remove '0x' prefix if present
    if private_key.startswith("0x"):
        private_key = private_key[2:]
    
    # Build the transaction
    function_txn = function_call.build_transaction({
        "from": server_account,
        "nonce": web3.eth.get_transaction_count(server_account),
        "gas": 1000000,  # Adjust as needed
        "gasPrice": web3.eth.gas_price,
        **kwargs
    })
    
    # Sign the transaction
    signed_txn = web3.eth.account.sign_transaction(function_txn, private_key=private_key)
    
    # Send the transaction
    tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
    
    # Wait for the transaction to be mined
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    
    return receipt

