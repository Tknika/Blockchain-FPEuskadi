"""Authentication middleware for session-based user authentication."""

from __future__ import annotations

from functools import wraps
from typing import Callable

from flask import session, jsonify


def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication for a route.
    
    Checks if the user's public key is stored in the session.
    If not authenticated, returns a 401 Unauthorized response.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'public_key' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function


def get_current_user_public_key() -> str:
    """
    Get the current user's public key from the session.
    
    Returns:
        Public key (JSON string) of the current user
    
    Raises:
        ValueError: If user is not authenticated
    """
    public_key = session.get('public_key')
    if not public_key:
        raise ValueError("User is not authenticated")
    return public_key


def get_current_username() -> str:
    """
    Get the current user's username from the session.
    
    Returns:
        Username of the current user
    
    Raises:
        ValueError: If user is not authenticated
    """
    username = session.get('username')
    if not username:
        raise ValueError("User is not authenticated")
    return username

