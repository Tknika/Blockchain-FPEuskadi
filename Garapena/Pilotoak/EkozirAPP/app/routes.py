"""HTTP routes for the Flask Ekozir dApp."""

from __future__ import annotations

import json
from typing import Any, Dict

from flask import Blueprint, Flask, Response, current_app, jsonify, redirect, render_template, request, session, url_for
from flask_babel import gettext as _, get_locale

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
    Login with password only.
    
    Derives public key from password and checks if user is registered.
    Retrieves username from blockchain using the public key.
    Stores public key and username in session if authenticated.
    """
    data = request.get_json()
    if not data:
        return _json_response({"error": "JSON body required"}, status=400)
    
    password = data.get("password", "")
    
    if not password:
        return _json_response({"error": "Password is required"}, status=400)
    
    try:
        # Derive public key from password (username not used in key derivation)
        public_key_dict = derive_public_key_from_password(password, "")
        # Normalize JSON by using sort_keys and consistent separators
        public_key_json = json.dumps(public_key_dict, sort_keys=True, separators=(',', ':'))
        
        # Check if public key is registered (normalization happens inside the function too)
        is_registered = ekozir_service.is_public_key_registered(public_key_json)
        
        if not is_registered:
            return _json_response({
                "error": "User not registered",
                "publicKey": public_key_json,
                "needsSignup": True
            }, status=401)
        
        # Get username from blockchain using public key
        username = ekozir_service.get_username_from_public_key(public_key_json)
        
        if not username:
            return _json_response({
                "error": "Username not found for this public key"
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
        # Derive public key from password (username not used in key derivation)
        public_key_dict = derive_public_key_from_password(password, "")
        # Normalize JSON by using sort_keys and consistent separators
        public_key_json = json.dumps(public_key_dict, sort_keys=True, separators=(',', ':'))
        
        # Check if public key already exists (prevent duplicate public keys)
        if ekozir_service.is_public_key_registered(public_key_json):
            return _json_response({
                "error": "A user with this password already exists. Please use a different password.",
                "publicKeyExists": True
            }, status=400)
        
        # Execute signUp transaction (normalization happens inside the function too)
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
    encrypted_key_for_sender = data.get("encryptedKeyForSender")
    message_hash_hex = data.get("messageHash")
    
    if not all([group_id, recipient_public_key, encrypted_content, encrypted_key, encrypted_key_for_sender, message_hash_hex]):
        return _json_response({"error": "All fields are required"}, status=400)
    
    try:
        sender_public_key = get_current_user_public_key()
        
        # Normalize public keys for consistent comparison
        from .services.ekozir_service import normalize_public_key_json
        normalized_sender_key = normalize_public_key_json(sender_public_key)
        normalized_recipient_key = normalize_public_key_json(recipient_public_key)
        
        # Convert hex string to bytes32
        from web3 import Web3
        message_hash = Web3.to_bytes(hexstr=message_hash_hex)
        
        receipt = ekozir_service.send_message_transaction(
            group_id,
            normalized_sender_key,
            normalized_recipient_key,
            encrypted_content,
            encrypted_key,
            encrypted_key_for_sender,
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
        
        # Normalize public keys for consistent comparison
        from .services.ekozir_service import normalize_public_key_json
        normalized_creator_key = normalize_public_key_json(creator_public_key)
        normalized_member_key = normalize_public_key_json(member_public_key)
        
        # Validate that the member is registered before attempting to add
        if not ekozir_service.is_public_key_registered(normalized_member_key):
            return _json_response({
                "error": "Member must be registered before they can be added to a group. Please ensure the user has signed up first.",
                "memberNotRegistered": True
            }, status=400)
        
        # Validate that the creator matches the group creator
        group = ekozir_service.get_group(group_id)
        # Normalize the group creator's key for comparison
        normalized_group_creator = normalize_public_key_json(group.get("creator", ""))
        if normalized_group_creator != normalized_creator_key:
            return _json_response({
                "error": "Only the group creator can add members to this group.",
                "notCreator": True
            }, status=403)
        
        # Check if member is already in the group (normalize all member keys for comparison)
        group_members = group.get("members", [])
        normalized_group_members = [normalize_public_key_json(m) for m in group_members]
        if normalized_member_key in normalized_group_members:
            return _json_response({
                "error": "This member is already in the group.",
                "alreadyMember": True
            }, status=400)
        
        receipt = ekozir_service.add_member_transaction(
            group_id,
            normalized_creator_key,
            normalized_member_key
        )
        
        return _json_response({
            "txHash": receipt['transactionHash'].hex(),
            "blockNumber": receipt['blockNumber']
        })
    except Exception as e:
        error_msg = str(e)
        # Provide more user-friendly error messages
        if "reverted" in error_msg.lower():
            if "Member must be registered" in error_msg:
                return _json_response({
                    "error": "Member must be registered before they can be added to a group. Please ensure the user has signed up first.",
                    "memberNotRegistered": True
                }, status=400)
            elif "already a member" in error_msg:
                return _json_response({
                    "error": "This member is already in the group.",
                    "alreadyMember": True
                }, status=400)
            elif "Only group creator" in error_msg:
                return _json_response({
                    "error": "Only the group creator can add members to this group.",
                    "notCreator": True
                }, status=403)
        return _json_response({"error": error_msg}, status=500)


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


@bp.route("/getgroup/<int:group_id>", methods=["GET"])
def get_group_debug(group_id: int) -> Response:
    """
    Debug endpoint to display all information from the smart contract's getGroup function.
    This page shows raw data from the blockchain to help debug member addition issues.
    """
    try:
        # Get raw group data directly from smart contract
        group = ekozir_service.get_group(group_id)
        
        # Also get member info with names if possible (try without auth for debugging)
        member_info = []
        try:
            # Try to get member info - might fail if not authenticated, but that's ok for debugging
            caller_public_key = session.get('public_key', '')
            if caller_public_key:
                member_info = ekozir_service.get_group_member_public_keys(group_id, caller_public_key)
        except Exception:
            # If we can't get member info, just show public keys
            pass
        
        # Convert group to JSON string for display
        group_json = json.dumps(group, indent=2)
        
        return render_template(
            "group_debug.html",
            group_id=group_id,
            group=group,
            members=group.get("members", []),
            member_info=member_info,
            creator=group.get("creator", ""),
            name=group.get("name", ""),
            message_count=group.get("messageCount", 0),
            created_at=group.get("createdAt", 0),
            group_json=group_json
        )
    except Exception as e:
        return render_template(
            "group_debug.html",
            group_id=group_id,
            error=str(e),
            group=None,
            group_json=""
        )


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


@bp.route("/set_language/<language>", methods=["GET"])
def set_language(language: str) -> Response:
    """Set the language preference in session and redirect back."""
    if language in ['eu', 'es', 'en']:
        session['language'] = language
    return redirect(request.referrer or url_for('ekozir.index'))


@bp.route("/api/translations", methods=["GET"])
def get_translations() -> Response:
    """Get all translations for the current locale as JSON for JavaScript."""
    from flask_babel import gettext as _
    
    translations = {
        # Authentication
        "notLoggedIn": _("Not logged in"),
        "loggedInAs": _("Logged in as:"),
        "loggedInAsUser": _("Logged in as %(username)s"),
        "copyPublicKey": _("Copy Public Key"),
        "copied": _("Copied!"),
        "noPublicKeyAvailable": _("No public key available to copy."),
        "publicKeyCopied": _("Public key copied to clipboard!"),
        "failedToCopyPublicKey": _("Failed to copy public key to clipboard."),
        "logout": _("Logout"),
        "login": _("Login"),
        "signUp": _("Sign Up"),
        "cancel": _("Cancel"),
        "password": _("Password"),
        "username": _("Your username"),
        "yourUsername": _("Your username"),
        "yourPassword": _("Your password"),
        "loginSuccessful": _("Login successful!"),
        "loginFailed": _("Login failed."),
        "userNotSignedUp": _("This user is not signed up. Please use the Sign Up button to create an account."),
        "loginError": _("Login error: %(error)s"),
        "signUpSuccessful": _("Sign up successful!"),
        "signUpFailed": _("Sign up failed"),
        "logoutError": _("Logout error"),
        "enterUsernamePassword": _("Enter username and password to sign up."),
        "pleaseEnterUsernamePassword": _("Please enter username and password."),
        "passwordComplexityError": _("Password does not meet complexity requirements. Please check the requirements above."),
        "creatingAccount": _("Creating account and registering on blockchain..."),
        "processingTransaction": _("Processing blockchain transaction..."),
        
        # Groups
        "selectOneOfYourGroups": _("Select one of your groups"),
        "noGroupsFound": _("No groups found."),
        "loginToViewGroups": _("Login to view your groups."),
        "loginToViewMessages": _("Login to view group messages."),
        "selectGroupToViewMessages": _("Select a group to view its messages."),
        "refreshGroups": _("Refresh Groups"),
        "createGroup": _("Create Group"),
        "groupName": _("Group name"),
        "groupCreated": _("Group created successfully!"),
        "groupCreationFailed": _("Failed to create group."),
        "failedToCreateGroup": _("Failed to create group."),
        "groupNameEmpty": _("Group name cannot be empty."),
        "failedToLoadGroups": _("Failed to load groups."),
        
        # Members
        "manageMembership": _("Manage Membership"),
        "addMember": _("Add Member"),
        "removeMember": _("Remove Member"),
        "pastePublicKey": _("Paste public key (JSON format) here..."),
        "memberAdded": _("Member added successfully!"),
        "memberRemoved": _("Member removed successfully!"),
        "memberAddFailed": _("Failed to add member."),
        "failedToAddMember": _("Failed to add member."),
        "memberRemoveFailed": _("Failed to remove member."),
        "failedToRemoveMember": _("Failed to remove member."),
        "noOtherMembers": _("No other members in this group."),
        "pleaseSelectGroup": _("Please select a group."),
        "pleasePastePublicKey": _("Please paste the public key (JSON format) of the member you want to add."),
        "pleasePastePublicKeyRemove": _("Please paste the public key (JSON format) of the member you want to remove."),
        "invalidPublicKeyFormat": _("Invalid public key format. Please paste a valid JSON public key (e.g., copied from another user's 'Copy Public Key' button)."),
        "invalidPublicKeyFormatSimple": _("Invalid public key format. Please paste a valid JSON public key."),
        "errorMakeSureSignedUp": _("Error: %(error)s Make sure the user has signed up first."),
        "errorPrefix": _("Error: %(error)s"),
        "failedToLoadGroupMembers": _("Failed to load group members."),
        
        # Messages
        "sendMessage": _("Send Message"),
        "typeYourMessage": _("Type your message here (it will be encrypted automatically before sending)"),
        "selectRecipients": _("Select recipients:"),
        "messageSent": _("Message sent successfully!"),
        "messageSendFailed": _("Failed to send message."),
        "messageSentCount": _("Message %(current)s/%(total)s sent!"),
        "failedToSendMessageCount": _("Failed to send message %(current)s/%(total)s: %(error)s"),
        "successfullySentMessages": _("Successfully sent %(count)s out of %(total)s message(s)."),
        "pleaseProvideMessageContent": _("Please provide message content."),
        "pleaseSelectRecipient": _("Please select at least one recipient."),
        "failedToLoadMessages": _("Failed to load messages."),
        "noMessagesStored": _("No messages stored for this group yet."),
        "noMessagesAvailable": _("No messages available for you in this group."),
        "sentMessages": _("Sent Messages"),
        "receivedMessages": _("Received Messages"),
        "noSentMessages": _("No sent messages"),
        "noReceivedMessages": _("No received messages"),
        "to": _("To:"),
        "from": _("From:"),
        "confirmed": _("Confirmed"),
        "pendingConfirmation": _("Pending confirmation"),
        "confirmMessage": _("Confirm Message"),
        "messageConfirmed": _("Message confirmed successfully!"),
        "messageConfirmFailed": _("Failed to confirm message."),
        "failedToConfirmMessage": _("Failed to confirm message."),
        "failedToDecrypt": _("Failed to decrypt message"),
        "unknown": _("Unknown"),
        
        # Navigation
        "yourGroupsAndMessages": _("Your Groups and Messages"),
        "yourGroups": _("Your Groups"),
        "groupMessages": _("Group Messages"),
        "selectGroupToInspect": _("Select a group to inspect members and messages."),
        "viewEncryptedContent": _("View encrypted content, keys, and confirmation status."),
        
        # Common
        "error": _("Error"),
        "success": _("Success"),
        "loading": _("Loading..."),
        "welcomeBack": _("Welcome back, %(username)s!"),
        "failedToBootstrap": _("Failed to bootstrap application."),
    }
    
    return _json_response(translations)


def init_app(app: Flask) -> None:
    """Register the blueprint with the provided Flask application instance."""
    app.register_blueprint(bp)
