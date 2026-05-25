"""Flask application factory for the Bozketa dApp."""

from __future__ import annotations

import logging
import sys

from flask import Flask

from .config import load_config
from .services.web3_service import init_web3


def create_app() -> Flask:
    """Build and configure the Bozketa web application."""
    app = Flask(__name__)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    logging.getLogger("app").setLevel(logging.INFO)

    app.config.update(load_config())
    init_web3(app)

    from . import routes

    routes.init_app(app)

    return app
