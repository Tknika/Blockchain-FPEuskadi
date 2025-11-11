"""Configuration helpers for the Flask Ekozir dApp."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv


# Load environment variables from an optional .env file located beside the app.
load_dotenv()


def _get_repo_root() -> Path:
    """
    Return the project root directory regardless of the deployment layout.

    When the application runs inside Docker the filesystem is typically much
    shallower than on a developer workstation, which previously caused
    ``IndexError`` when assuming a fixed number of parents.  We therefore walk
    upwards looking for well-known project markers and fall back to the app
    package directory.
    """
    current = Path(__file__).resolve()
    project_markers = (
        "wsgi.py",
        "Dockerfile",
        "requirements.txt",
        "app",
    )
    repository_markers = (".git", "pyproject.toml")
    for parent in current.parents:
        if any((parent / marker).exists() for marker in project_markers):
            return parent
        if any((parent / marker).exists() for marker in repository_markers):
            repo_candidate = parent
            # keep looking for a project-specific marker on the way up
            project_root = next(
                (
                    ancestor
                    for ancestor in current.parents
                    if ancestor.is_relative_to(parent)
                    and any((ancestor / marker).exists() for marker in project_markers)
                ),
                None,
            )
            if project_root:
                return project_root
            return repo_candidate
    # Final fallback: keep the application directory to maintain relative paths.
    return current.parent


def _resolve_path(path_value: str) -> Path:
    """
    Resolve a filesystem path provided via environment variable.

    The helper keeps relative paths relative to the repository root so that the
    application can run from the cloned project without additional setup.
    """
    candidate = Path(path_value).expanduser()
    if candidate.is_absolute():
        return candidate
    module_root = Path(__file__).resolve().parent
    module_candidate = module_root / candidate
    if module_candidate.exists():
        return module_candidate
    repo_root = _get_repo_root()
    return repo_root / candidate


def _load_contract_abi(abi_path: Path) -> Any:
    """
    Load and return the ABI definition from the supplied JSON file.

    The function expects the ABI file to contain the ABI array directly,
    rather than wrapped under an 'abi' key.
    """
    if not abi_path.exists():
        raise FileNotFoundError(
            f"Ekozir ABI not found at {abi_path}. Compile the contract or update the EKOZIR_ABI_PATH environment variable."
        )

    with abi_path.open("r", encoding="utf-8") as handler:
        abi = json.load(handler)

    if not isinstance(abi, list):
        raise ValueError(
            f"The ABI file at {abi_path} is not a valid ABI array."
        )

    return abi


def load_config() -> Dict[str, Any]:
    """
    Assemble configuration values for the Flask application.

    A dictionary is returned instead of mutating ``app.config`` directly so the
    settings can also be inspected in unit tests if desired.
    """
    repo_root = _get_repo_root()

    rpc_setting = os.getenv("BESU_RPC_URL", "http://192.168.100.1:8545")
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
        "static/abi/ekozir.abi",
    )
    abi_path = _resolve_path(abi_env)
    config["EKOZIR_ABI_PATH"] = str(abi_path)
    config["EKOZIR_CONTRACT_ABI"] = _load_contract_abi(abi_path)

    # Expose repository root for templates that need to build relative paths.
    config["REPO_ROOT"] = str(repo_root)

    return config

