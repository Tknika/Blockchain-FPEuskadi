"""HTTP routes for the Flask Ekozir dApp."""

from __future__ import annotations

import json
from typing import Any, Dict

from flask import Blueprint, Flask, Response, current_app, jsonify, render_template, request, session

from .middleware.auth import get_current_user_public_key, require_auth
from .services import ekozir_service
from .services.ecdh_service import derive_public_key_from_password


bp = Blueprint("ekozir", __name__)


def _json_response(data: Any, status: int = 200) -> Response:
    """Return a JSON response with a consistent structure."""
    payload: Dict[str, Any] = {"data": data}
    return jsonify(payload), status


@bp.route("/", methods=["GET"])
def index() -> Response:
    """
    Render the dashboard shell.
    
    The template bootstraps the JavaScript application with contract metadata
    and the configured Besu chain identifier.
    """
    return render_template(
        "index.html",
        contract_address=current_app.config.get("EKOZIR_CONTRACT_ADDRESS", ""),
        chain_id=current_app.config.get("BESU_CHAIN_ID"),
        besu_rpc=current_app.config.get("BESU_RPC_URL"),
    )


@bp.route("/api/status", methods=["GET"])
def api_status() -> Response:
    """Provide a lightweight health check endpoint."""
    info = {
        "connected": current_app.config.get("WEB3_IS_CONNECTED", False),
        "contractConfigured": bool(current_app.config.get("EKOZIR_CONTRACT_ADDRESS")),
        "chainId": current_app.config.get("BESU_CHAIN_ID"),
    }
    return _json_response(info)


@bp.route("/api/contract/metadata", methods=["GET"])
def contract_metadata() -> Response:
    """Expose the ABI and address for the front-end JavaScript client."""
    metadata = {
        "address": current_app.config.get("EKOZIR_CONTRACT_ADDRESS", ""),
        "abi": current_app.config.get("EKOZIR_CONTRACT_ABI", []),
        "chainId": current_app.config.get("BESU_CHAIN_ID"),
    }
    return _json_response(metadata)


# Authentication routes

@bp.route("/api/auth/login", methods=["POST"])
def auth_login() -> Response:
    """
    Login with username and password.
    
    Derives public key from password and checks if user is registered.
    Stores public key and username in session if authenticated.
    """
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return _json_response({"error": "Username and password are required"}, status=400)
    
    try:
        # Derive public key from password
        public_key_dict = derive_public_key_from_password(password, username)
        public_key_json = json.dumps(public_key_dict)
        
        # Check if public key is registered
        is_registered = ekozir_service.is_public_key_registered(public_key_json)
        
        if not is_registered:
            return _json_response({
                "error": "User not registered",
                "publicKey": public_key_json,
                "needsSignup": True
            }, status=401)
        
        # Store in session
        session['public_key'] = public_key_json
        session['username'] = username
        
        return _json_response({
            "publicKey": public_key_json,
            "username": username,
            "authenticated": True
        })
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/auth/logout", methods=["POST"])
def auth_logout() -> Response:
    """Logout and clear session."""
    session.clear()
    return _json_response({"message": "Logged out successfully"})


@bp.route("/api/auth/status", methods=["GET"])
def auth_status() -> Response:
    """Get current authentication status."""
    public_key = session.get('public_key')
    username = session.get('username')
    
    if not public_key:
        return _json_response({
            "authenticated": False
        })
    
    return _json_response({
        "authenticated": True,
        "publicKey": public_key,
        "username": username
    })


@bp.route("/api/auth/signup", methods=["POST"])
def auth_signup() -> Response:
    """
    Sign up a new user.
    
    Derives public key from password and executes signUp transaction on blockchain.
    """
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return _json_response({"error": "Username and password are required"}, status=400)
    
    try:
        # Derive public key from password
        public_key_dict = derive_public_key_from_password(password, username)
        public_key_json = json.dumps(public_key_dict)
        
        # Check if already registered
        if ekozir_service.is_public_key_registered(public_key_json):
            return _json_response({"error": "User already registered"}, status=400)
        
        # Execute signUp transaction
        receipt = ekozir_service.sign_up_transaction(public_key_json, username)
        
        # Store in session
        session['public_key'] = public_key_json
        session['username'] = username
        
        return _json_response({
            "publicKey": public_key_json,
            "username": username,
            "txHash": receipt['transactionHash'].hex(),
            "blockNumber": receipt['blockNumber']
        })
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


# Transaction execution routes

@bp.route("/api/transactions/createGroup", methods=["POST"])
@require_auth
def transaction_create_group() -> Response:
    """Execute createGroup transaction on the blockchain."""
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    name = data.get("name", "").strip()
    initial_member_public_keys = data.get("initialMemberPublicKeys", [])
    
    if not name:
        return _json_response({"error": "Group name is required"}, status=400)
    
    try:
        creator_public_key = get_current_user_public_key()
        receipt = ekozir_service.create_group_transaction(
            name,
            creator_public_key,
            initial_member_public_keys
        )
        
        # Extract group ID from events (if available)
        # For now, return transaction info
        return _json_response({
            "txHash": receipt['transactionHash'].hex(),
            "blockNumber": receipt['blockNumber']
        })
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/transactions/sendMessage", methods=["POST"])
@require_auth
def transaction_send_message() -> Response:
    """Execute sendMessage transaction on the blockchain."""
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    group_id = data.get("groupId")
    recipient_public_key = data.get("recipientPublicKey")
    encrypted_content = data.get("encryptedContent")
    encrypted_key = data.get("encryptedKey")
    message_hash_hex = data.get("messageHash")
    
    if not all([group_id, recipient_public_key, encrypted_content, encrypted_key, message_hash_hex]):
        return _json_response({"error": "All fields are required"}, status=400)
    
    try:
        sender_public_key = get_current_user_public_key()
        
        # Convert hex string to bytes32
        from web3 import Web3
        message_hash = Web3.to_bytes(hexstr=message_hash_hex)
        
        receipt = ekozir_service.send_message_transaction(
            group_id,
            sender_public_key,
            recipient_public_key,
            encrypted_content,
            encrypted_key,
            message_hash
        )
        
        return _json_response({
            "txHash": receipt['transactionHash'].hex(),
            "blockNumber": receipt['blockNumber']
        })
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/transactions/addMember", methods=["POST"])
@require_auth
def transaction_add_member() -> Response:
    """Execute addMember transaction on the blockchain."""
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    group_id = data.get("groupId")
    member_public_key = data.get("memberPublicKey")
    
    if not group_id or not member_public_key:
        return _json_response({"error": "groupId and memberPublicKey are required"}, status=400)
    
    try:
        creator_public_key = get_current_user_public_key()
        receipt = ekozir_service.add_member_transaction(
            group_id,
            creator_public_key,
            member_public_key
        )
        
        return _json_response({
            "txHash": receipt['transactionHash'].hex(),
            "blockNumber": receipt['blockNumber']
        })
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/transactions/removeMember", methods=["POST"])
@require_auth
def transaction_remove_member() -> Response:
    """Execute removeMember transaction on the blockchain."""
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    group_id = data.get("groupId")
    member_public_key = data.get("memberPublicKey")
    
    if not group_id or not member_public_key:
        return _json_response({"error": "groupId and memberPublicKey are required"}, status=400)
    
    try:
        creator_public_key = get_current_user_public_key()
        receipt = ekozir_service.remove_member_transaction(
            group_id,
            creator_public_key,
            member_public_key
        )
        
        return _json_response({
            "txHash": receipt['transactionHash'].hex(),
            "blockNumber": receipt['blockNumber']
        })
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/transactions/confirmMessage", methods=["POST"])
@require_auth
def transaction_confirm_message() -> Response:
    """Execute confirmMessageReception transaction on the blockchain."""
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    message_id = data.get("messageId")
    
    if not message_id:
        return _json_response({"error": "messageId is required"}, status=400)
    
    try:
        recipient_public_key = get_current_user_public_key()
        receipt = ekozir_service.confirm_message_transaction(
            message_id,
            recipient_public_key
        )
        
        return _json_response({
            "txHash": receipt['transactionHash'].hex(),
            "blockNumber": receipt['blockNumber']
        })
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


# Updated existing routes with session-based authentication

@bp.route("/api/users/groups", methods=["GET"])
@require_auth
def user_groups() -> Response:
    """Return group identifiers for the current user."""
    try:
        public_key = get_current_user_public_key()
        groups = ekozir_service.get_user_groups(public_key)
        return _json_response({"groups": groups})
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/groups/<int:group_id>", methods=["GET"])
@require_auth
def group_detail(group_id: int) -> Response:
    """Return group metadata and member encryption keys."""
    try:
        caller_public_key = get_current_user_public_key()
        group = ekozir_service.get_group(group_id)
        members = ekozir_service.get_group_member_public_keys(group_id, caller_public_key)
        
        return _json_response({"group": group, "members": members})
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/groups/<int:group_id>/messages", methods=["GET"])
@require_auth
def group_messages(group_id: int) -> Response:
    """Return message identifiers for the group that are relevant to the caller."""
    try:
        caller_public_key = get_current_user_public_key()
        message_ids = ekozir_service.get_user_messages_in_group(group_id, caller_public_key)
        return _json_response({"messageIds": message_ids})
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


@bp.route("/api/messages/<int:message_id>", methods=["GET"])
@require_auth
def message_detail(message_id: int) -> Response:
    """Return data for a specific message from the caller's perspective."""
    try:
        caller_public_key = get_current_user_public_key()
        message = ekozir_service.get_message(message_id, caller_public_key)
        confirmations = ekozir_service.get_message_confirmations(message_id, caller_public_key)
        
        stats = {}
        try:
            stats = ekozir_service.get_message_stats(message_id, caller_public_key)
        except Exception:  # noqa: BLE001 - propagate empty stats on revert
            stats = {}
        
        return _json_response(
            {"message": message, "confirmations": confirmations, "stats": stats}
        )
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)


def init_app(app: Flask) -> None:
    """Register the blueprint with the provided Flask application instance."""
    app.register_blueprint(bp)
