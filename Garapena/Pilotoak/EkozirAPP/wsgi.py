"""WSGI entrypoint for running the Ekozir Flask application."""

from __future__ import annotations

from app import create_app

# The WSGI server imports ``application`` by convention.
application = create_app()


if __name__ == "__main__":
    # Enable Flask's development server when executed directly.
    application.run(host="0.0.0.0", port=5000, debug=True)

