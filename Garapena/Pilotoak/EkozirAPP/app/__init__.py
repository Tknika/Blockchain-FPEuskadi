"""Flask application factory for the Ekozir dApp."""

from __future__ import annotations

import logging
import sys

from flask import Flask
from flask_babel import Babel

from .config import load_config
from .services.web3_service import init_web3


def create_app() -> Flask:
    """
    Build and configure the Flask application instance.

    The function loads configuration values, initialises the shared Web3 client
    and registers the HTTP routes defined in the package.
    """
    app = Flask(__name__)

    # Configure logging to stdout so it appears in console/docker logs
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set logging level for our modules
    logging.getLogger('app').setLevel(logging.INFO)

    # Load environment-aware configuration (Besu RPC, contract metadata, etc.)
    config = load_config()
    app.config.update(config)

    # Configure Flask-Babel for internationalization
    app.config['BABEL_DEFAULT_LOCALE'] = 'eu'  # Basque as default
    app.config['BABEL_SUPPORTED_LOCALES'] = ['eu', 'es', 'en']  # Basque, Spanish, English
    app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'
    
    # Initialize Babel
    babel = Babel(app)
    
    @babel.localeselector
    def get_locale():
        """Get the locale from session or default to Basque."""
        from flask import session
        return session.get('language', 'eu')

    # Set up the global Web3 client and contract bindings once per process.
    init_web3(app)

    # Import routes lazily to avoid circular imports during app creation.
    from . import routes

    routes.init_app(app)

    return app

