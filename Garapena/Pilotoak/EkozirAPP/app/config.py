"""Configuration helpers for the Flask Ekozir dApp."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv


# Load environment variables from an optional .env file located beside the app.
load_dotenv()


def _resolve_path(path_value: str) -> Path:
    """
    Resolve a filesystem path provided via environment variable.

    The helper keeps relative paths relative to the repository root so that the
    application can run from the cloned project without additional setup.
    """
    candidate = Path(path_value).expanduser()
    if candidate.is_absolute():
        return candidate
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / candidate


def _load_contract_abi(abi_path: Path) -> Any:
    """
    Load and return the ABI definition from the supplied JSON file.

    The function expects the Hardhat artifact structure, where the ABI is stored
    under the ``abi`` key. A helpful error message is raised when something is
    missing to guide local configuration.
    """
    if not abi_path.exists():
        raise FileNotFoundError(
            f"Ekozir ABI not found at {abi_path}. Compile the contract with Hardhat "
            "or update the EKOZIR_ABI_PATH environment variable."
        )

    with abi_path.open("r", encoding="utf-8") as handler:
        artifact = json.load(handler)

    if "abi" not in artifact:
        raise KeyError(
            f"The ABI file at {abi_path} does not contain an 'abi' key. "
            "Ensure you are pointing to a Hardhat artifact JSON."
        )

    return artifact["abi"]


def load_config() -> Dict[str, Any]:
    """
    Assemble configuration values for the Flask application.

    A dictionary is returned instead of mutating ``app.config`` directly so the
    settings can also be inspected in unit tests if desired.
    """
    repo_root = Path(__file__).resolve().parents[3]

    rpc_setting = os.getenv("BESU_RPC_URL", "http://127.0.0.1:8545")
    rpc_urls = [entry.strip() for entry in rpc_setting.split(",") if entry.strip()]
    if not rpc_urls:
        raise ValueError("BESU_RPC_URL must contain at least one HTTP endpoint.")

    config: Dict[str, Any] = {
        "BESU_RPC_URLS": rpc_urls,
        "BESU_RPC_URL": rpc_urls[0],
        "BESU_CHAIN_ID": int(os.getenv("BESU_CHAIN_ID", "1337")),
        "SECRET_KEY": os.getenv("FLASK_SECRET_KEY", "change-me"),
    }

    # Contract address is optional during development; the UI handles the fallback.
    contract_address = os.getenv("EKOZIR_CONTRACT_ADDRESS", "")
    config["EKOZIR_CONTRACT_ADDRESS"] = contract_address

    abi_env = os.getenv(
        "EKOZIR_ABI_PATH",
        "app/static/abi/ekozir.abi",
    )
    abi_path = _resolve_path(abi_env)
    config["EKOZIR_ABI_PATH"] = str(abi_path)
    config["EKOZIR_CONTRACT_ABI"] = _load_contract_abi(abi_path)

    # Expose repository root for templates that need to build relative paths.
    config["REPO_ROOT"] = str(repo_root)

    return config

