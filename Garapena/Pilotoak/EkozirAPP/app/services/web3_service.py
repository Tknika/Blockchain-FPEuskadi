"""Shared Web3 client and Ekozir contract bindings."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from eth_typing import ChecksumAddress
from flask import Flask, current_app
from web3 import Web3
from web3.contract import Contract


@dataclass
class Web3Resources:
    """Container for the shared Web3 objects."""

    web3: Web3
    contract: Contract


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

    _resources = Web3Resources(web3=web3_client, contract=contract)

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


def build_default_call_args(from_address: Optional[str]) -> Dict[str, Any]:
    """
    Prepare the call dictionary passed to view functions.

    The Besu EVM requires call-senders to satisfy the contract's ``require``
    statements that reference ``msg.sender``. The helper ensures the address is
    checksummed; callers must always supply an address explicitly.
    """
    if not from_address:
        raise ValueError(
            "A sender address is required. Provide it via the caller parameter."
        )

    checksum = get_web3().to_checksum_address(from_address)
    return {"from": checksum}

