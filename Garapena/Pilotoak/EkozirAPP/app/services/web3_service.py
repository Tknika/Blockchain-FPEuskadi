"""Shared Web3 client and Ekozir contract bindings."""

from __future__ import annotations

import logging
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


def verify_owner_account() -> bool:
    """
    Verify that the server account is the contract owner.
    
    Returns:
        True if the server account is the contract owner, False otherwise
    """
    if _resources is None or _resources.contract is None:
        return False
    
    try:
        server_account = get_signer_account()
        contract_owner = _resources.contract.functions.owner().call()
        return server_account.lower() == contract_owner.lower()
    except Exception:
        return False


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
    
    # Verify the server account matches the account derived from the private key
    account_from_key = web3.eth.account.from_key(private_key)
    if account_from_key.address.lower() != server_account.lower():
        raise RuntimeError(
            f"Server account mismatch: configured account {server_account} "
            f"does not match private key account {account_from_key.address}"
        )
    
    # Verify the server account is the contract owner
    if _resources.contract is not None:
        try:
            contract_owner = _resources.contract.functions.owner().call()
            if server_account.lower() != contract_owner.lower():
                raise RuntimeError(
                    f"Server account {server_account} is not the contract owner. "
                    f"Contract owner is {contract_owner}. "
                    f"Please ensure EKOZIR_PRIVATE_KEY corresponds to the contract owner's private key."
                )
        except Exception as e:
            # If we can't verify, log a warning but continue (might be a view function issue)
            logging.warning(f"Could not verify contract ownership: {e}")
    
    # Get nonce for the transaction (use 'pending' to include pending transactions)
    nonce = web3.eth.get_transaction_count(server_account, 'pending')
    
    # Get chain ID from config (should be set during init)
    chain_id = current_app.config.get("WEB3_CHAIN_ID")
    
    # IMPORTANT: Don't include 'from' in transaction_params initially
    # Some web3 versions have issues when 'from' is explicitly set
    # We'll verify and set it after building if needed
    
    # For private Besu networks (gas-free), use a very high gas limit
    # to ensure transactions never fail due to gas limits
    # Using 50 million gas (well above any normal transaction requirement)
    gas_limit = 50000000
    
    transaction_params = {
        "nonce": nonce,
        "gas": gas_limit,
        "gasPrice": web3.eth.gas_price,  # Keep network's gas price (may be 0 for gas-free networks)
    }
    
    # Add chain ID if available (some networks require this)
    if chain_id:
        transaction_params["chainId"] = chain_id
    
    # Merge any additional kwargs (but don't let them override critical fields)
    for key, value in kwargs.items():
        if key not in ["from", "chainId", "nonce"]:  # Never allow these to be overridden
            transaction_params[key] = value
    
    # Build the transaction
    try:
        function_txn = function_call.build_transaction(transaction_params)
        # Ensure 'from' field is set correctly
        txn_from_built = function_txn.get('from', '')
        if not txn_from_built or txn_from_built.lower() != server_account.lower():
            function_txn["from"] = server_account
    except Exception as e:
        logging.error(f"Failed to build transaction: {e}")
        raise RuntimeError(
            f"Failed to build transaction: {str(e)}. "
            f"Server account: {server_account}"
        )
    
    # Verify the transaction is from the correct account
    txn_from = function_txn.get("from", "")
    if not txn_from or txn_from.lower() != server_account.lower():
        logging.error(
            f"Transaction 'from' field mismatch: expected {server_account}, "
            f"got {txn_from}. Transaction params: {transaction_params}, "
            f"Built transaction: {function_txn}"
        )
        raise RuntimeError(
            f"Transaction 'from' field mismatch: expected {server_account}, "
            f"got {txn_from}. Transaction params: {transaction_params}"
        )
    
    # Sign and send the transaction
    signed_txn = web3.eth.account.sign_transaction(function_txn, private_key=private_key)
    
    # Verify the signed transaction's sender matches our account
    recovered_sender = web3.eth.account.recover_transaction(signed_txn.rawTransaction)
    if recovered_sender.lower() != server_account.lower():
        raise RuntimeError(
            f"Signed transaction sender mismatch: expected {server_account}, "
            f"got {recovered_sender}. This means the transaction was signed with a different private key."
        )
    
    # Send the transaction
    tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
    logging.info(f"Transaction sent: hash={tx_hash.hex()}")
    
    # Wait for the transaction to be mined
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    
    # Get the actual sender from the receipt
    receipt_from = receipt.get('from', '')
    if receipt_from:
        receipt_from = web3.to_checksum_address(receipt_from)
    
    # Verify the receipt shows the transaction was sent from our account
    if receipt_from and receipt_from.lower() != server_account.lower():
        raise RuntimeError(
            f"Transaction receipt shows different sender: expected {server_account}, "
            f"got {receipt_from}. This indicates the transaction was sent from a different account."
        )
    
    # Check if transaction was successful
    if receipt.status == 0:
        # Transaction failed/reverted - try to get revert reason
        error_msg = "Transaction reverted"
        try:
            # Try to get revert reason from transaction trace
            trace_result = web3.manager.request_blocking(
                "debug_traceTransaction",
                [tx_hash.hex(), {"tracer": "callTracer", "timeout": "10s"}]
            )
            if trace_result and isinstance(trace_result, dict) and "error" in trace_result:
                error_info = trace_result.get("error", {})
                error_msg = error_info.get("message", error_msg)
        except Exception:
            # If tracing fails, try simulation
            try:
                function_call.call({"from": server_account})
            except Exception as call_error:
                error_str = str(call_error)
                if "revert" in error_str.lower():
                    error_msg = error_str
        
        logging.error(f"Transaction reverted: {error_msg}. Hash: {tx_hash.hex()}")
        raise RuntimeError(f"Transaction reverted: {error_msg}. Transaction hash: {tx_hash.hex()}")
    
    return receipt

