"""Session timeout middleware to handle inactivity-based session expiration."""

from __future__ import annotations

from datetime import datetime, timedelta

from flask import session


def check_session_timeout() -> None:
    """
    Check if the session has expired due to inactivity and update last activity time.
    
    This function is called before each request. It:
    1. Checks if the user is authenticated (has a public_key in session)
    2. If authenticated, checks if the last activity time has exceeded 10 minutes
    3. If expired, clears the session
    4. If not expired, updates the last activity time to the current time
    """
    # Only check timeout for authenticated sessions
    if 'public_key' not in session:
        return
    
    # Get the last activity time from session
    last_activity_str = session.get('last_activity')
    
    if last_activity_str:
        # Parse the last activity time
        try:
            last_activity = datetime.fromisoformat(last_activity_str)
        except (ValueError, TypeError):
            # If parsing fails, treat as expired and clear session
            session.clear()
            return
        
        # Check if 10 minutes have passed since last activity
        time_since_activity = datetime.now() - last_activity
        if time_since_activity > timedelta(minutes=10):
            # Session expired due to inactivity - clear it
            session.clear()
            return
    
    # Update last activity time to current time
    # This happens on every request for authenticated users
    session['last_activity'] = datetime.now().isoformat()

