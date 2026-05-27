"""Configuration helpers for the Flask Bozketa dApp."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


load_dotenv()


def _get_app_root() -> Path:
    """Return the application root in local and Docker deployments."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "wsgi.py").exists() or (parent / "Dockerfile").exists():
            return parent
    return current.parent


def _resolve_path(path_value: str) -> Path:
    """Resolve absolute paths directly and relative paths from the app root."""
    candidate = Path(path_value).expanduser()
    if candidate.is_absolute():
        return candidate
    return _get_app_root() / candidate


def _load_contract_abi(abi_path: Path) -> Any:
    """Load the contract ABI array used by Web3."""
    if not abi_path.exists():
        raise FileNotFoundError(
            f"Bozketa ABI fitxategia ez da aurkitu {abi_path} bidean. Konpilatu kontratua eta eguneratu BOZKETA_ABI_PATH."
        )

    with abi_path.open("r", encoding="utf-8") as handler:
        abi = json.load(handler)

    if not isinstance(abi, list):
        raise ValueError(f"{abi_path} bideko ABI fitxategiak JSON ABI array bat eduki behar du.")

    return abi


def load_config() -> dict[str, Any]:
    """Assemble Flask, Besu and contract configuration from the environment."""
    rpc_setting = os.getenv("BESU_RPC_URL", "http://192.168.100.1:8545")
    rpc_urls = [entry.strip() for entry in rpc_setting.split(",") if entry.strip()]
    if not rpc_urls:
        raise ValueError("BESU_RPC_URL aldagaiak gutxienez HTTP endpoint bat eduki behar du.")

    abi_path = _resolve_path(os.getenv("BOZKETA_ABI_PATH", "app/static/abi/bozketa.abi"))

    return {
        "BESU_RPC_URLS": rpc_urls,
        "BESU_RPC_URL": rpc_urls[0],
        "BESU_CHAIN_ID": int(os.getenv("BESU_CHAIN_ID", "1337")),
        "SECRET_KEY": os.getenv("FLASK_SECRET_KEY", "change-me"),
        "BOZKETA_PRIVATE_KEY": os.getenv("BOZKETA_PRIVATE_KEY", ""),
        "BOZKETA_CONTRACT_ADDRESS": os.getenv("BOZKETA_CONTRACT_ADDRESS", ""),
        "BOZKETA_ABI_PATH": str(abi_path),
        "BOZKETA_CONTRACT_ABI": _load_contract_abi(abi_path),
        "BOZKETA_PUBLIC_URL": os.getenv("BOZKETA_PUBLIC_URL", "http://bozketa.localhost"),
        "SMTP_SERVER": os.getenv("SMTP_SERVER", "mailserver"),
        "SMTP_PORT": int(os.getenv("SMTP_PORT", "25")),
        "SMTP_USERNAME": os.getenv("SMTP_USERNAME", ""),
        "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD", ""),
        "SMTP_SENDER": os.getenv("SMTP_SENDER", "bozketa@blockchain.tkn.eus"),
        "SMTP_USE_SSL": os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"},
        "SMTP_USE_STARTTLS": os.getenv("SMTP_USE_STARTTLS", "false").lower() in {"1", "true", "yes"},
    }
