"""Shared Web3 client and Bozketa contract bindings."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from eth_typing import ChecksumAddress
from flask import Flask, current_app
from web3 import Web3
from web3.contract import Contract
from web3.exceptions import TimeExhausted
from web3.types import TxReceipt


@dataclass
class Web3Resources:
    """Container for the shared Web3 objects."""

    web3: Web3
    contract: Contract | None
    signer_account: ChecksumAddress | None


_resources: Web3Resources | None = None


def init_web3(app: Flask) -> None:
    """Initialise the Web3 connection and contract binding once per process."""
    global _resources

    if _resources is not None:
        return

    web3_client: Web3 | None = None
    for rpc_url in app.config.get("BESU_RPC_URLS", []):
        candidate = Web3(Web3.HTTPProvider(rpc_url))
        if candidate.is_connected():
            web3_client = candidate
            app.config["BESU_RPC_URL"] = rpc_url
            break

    if web3_client is None:
        raise ConnectionError("Ezin izan da konfiguratutako Besu RPC endpoint-ekin konektatu.")

    signer_account = None
    private_key = app.config.get("BOZKETA_PRIVATE_KEY", "")
    if private_key:
        signer_account = web3_client.to_checksum_address(
            web3_client.eth.account.from_key(_normalise_private_key(private_key)).address
        )

    contract = None
    contract_address = app.config.get("BOZKETA_CONTRACT_ADDRESS", "")
    if contract_address:
        contract = web3_client.eth.contract(
            address=web3_client.to_checksum_address(contract_address),
            abi=app.config["BOZKETA_CONTRACT_ABI"],
        )

    _resources = Web3Resources(web3=web3_client, contract=contract, signer_account=signer_account)
    app.config["WEB3_IS_CONNECTED"] = True
    app.config["WEB3_CHAIN_ID"] = app.config["BESU_CHAIN_ID"]


def get_web3() -> Web3:
    """Return the shared Web3 client."""
    if _resources is None:
        raise RuntimeError("Web3 ez da hasieratu.")
    return _resources.web3


def get_contract() -> Contract:
    """Return the configured Bozketa contract."""
    if _resources is None or _resources.contract is None:
        raise RuntimeError("Bozketa kontratua ez dago konfiguratuta. Ezarri BOZKETA_CONTRACT_ADDRESS.")
    return _resources.contract


def get_signer_account() -> ChecksumAddress:
    """Return the server account that pays for Bozketa transactions."""
    if _resources is None:
        raise RuntimeError("Web3 ez da hasieratu.")
    if _resources.signer_account is None:
        raise RuntimeError("Zerbitzariaren kontua ez dago konfiguratuta. Ezarri BOZKETA_PRIVATE_KEY.")
    return _resources.signer_account


def send_transaction(function_call, **kwargs: Any) -> TxReceipt:
    """Sign and submit a contract transaction with the configured server key."""
    if _resources is None:
        raise RuntimeError("Web3 ez da hasieratu.")

    web3 = _resources.web3
    signer = get_signer_account()
    private_key = _normalise_private_key(current_app.config.get("BOZKETA_PRIVATE_KEY", ""))
    if not private_key:
        raise RuntimeError("BOZKETA_PRIVATE_KEY ez dago konfiguratuta.")

    nonce = web3.eth.get_transaction_count(signer, "pending")
    tx_params: dict[str, Any] = {
        "from": signer,
        "nonce": nonce,
        "gas": 50_000_000,
        "gasPrice": web3.eth.gas_price,
        "chainId": current_app.config.get("WEB3_CHAIN_ID"),
    }
    tx_params.update({key: value for key, value in kwargs.items() if key not in {"from", "nonce"}})

    transaction = function_call.build_transaction(tx_params)
    signed = web3.eth.account.sign_transaction(transaction, private_key=private_key)
    raw_transaction = getattr(signed, "rawTransaction", None) or signed.raw_transaction
    tx_hash = web3.eth.send_raw_transaction(raw_transaction)
    logging.info("Bozketa transaction sent: %s", tx_hash.hex())
    try:
        receipt = web3.eth.wait_for_transaction_receipt(
            tx_hash,
            timeout=current_app.config.get("BOZKETA_TX_RECEIPT_TIMEOUT", 120),
            poll_latency=current_app.config.get("BOZKETA_TX_POLL_LATENCY", 1),
        )
    except TimeExhausted as error:
        raise TimeoutError(f"Transakzioaren baieztapena denboraz kanpo geratu da: {tx_hash.hex()}") from error

    if receipt.status == 0:
        raise RuntimeError(f"Transakzioa atzera bota da: {tx_hash.hex()}")

    return receipt


def _normalise_private_key(private_key: str) -> str:
    """Remove an optional 0x prefix before passing the key to Web3."""
    return private_key[2:] if private_key.startswith("0x") else private_key
