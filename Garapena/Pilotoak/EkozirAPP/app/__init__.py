"""Flask application factory for the Ekozir dApp."""

from __future__ import annotations

from flask import Flask

from .config import load_config
from .services.web3_service import init_web3


def create_app() -> Flask:
    """
    Build and configure the Flask application instance.

    The function loads configuration values, initialises the shared Web3 client
    and registers the HTTP routes defined in the package.
    """
    app = Flask(__name__)

    # Load environment-aware configuration (Besu RPC, contract metadata, etc.)
    config = load_config()
    app.config.update(config)

    # Set up the global Web3 client and contract bindings once per process.
    init_web3(app)

    # Import routes lazily to avoid circular imports during app creation.
    from . import routes

    routes.init_app(app)

    return app

