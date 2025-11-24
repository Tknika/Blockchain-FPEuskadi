"""Ekozir smart contract helper functions."""

from __future__ import annotations

import json
from typing import Any, Dict, List

from web3.types import TxReceipt

from .web3_service import (
    build_default_call_args,
    get_contract,
    get_web3,
    send_transaction,
)


def normalize_public_key_json(public_key_json: str) -> str:
    """
    Normalize a public key JSON string to ensure consistent formatting.
    
    This parses and re-stringifies the JSON to ensure:
    - Consistent key ordering
    - No extra whitespace
    - Consistent formatting
    
    Args:
        public_key_json: Public key as JSON string
    
    Returns:
        Normalized JSON string
    """
    try:
        # Parse the JSON to normalize it
        public_key_obj = json.loads(public_key_json)
        # Re-stringify with consistent formatting (sorted keys, no extra spaces)
        return json.dumps(public_key_obj, sort_keys=True, separators=(',', ':'))
    except (json.JSONDecodeError, TypeError):
        # If parsing fails, return as-is (might not be JSON)
        return public_key_json.strip()


def is_public_key_registered(public_key: str) -> bool:
    """
    Check if a public key is registered in the contract.
    
    Normalizes the public key JSON before checking to ensure consistent comparison.
    
    Args:
        public_key: Public key as JSON string
    
    Returns:
        True if the public key is registered
    """
    # Normalize the public key JSON before checking
    normalized_key = normalize_public_key_json(public_key)
    
    contract = get_contract()
    return contract.functions.isPublicKeyRegistered(normalized_key).call(
        build_default_call_args()
    )


def get_username_from_public_key(public_key: str) -> str:
    """
    Get the username associated with a public key.
    
    Args:
        public_key: Public key as JSON string
    
    Returns:
        Username string, or empty string if not found
    """
    contract = get_contract()
    return contract.functions.getUserName(public_key).call(
        build_default_call_args()
    )


def get_user_groups(public_key: str) -> List[int]:
    """
    Fetch the identifiers of the groups the user belongs to.
    
    Args:
        public_key: User's public key as JSON string
    
    Returns:
        List of group IDs
    """
    contract = get_contract()
    return list(contract.functions.getUserGroups(public_key).call(
        build_default_call_args()
    ))


def get_group(group_id: int) -> Dict[str, Any]:
    """
    Retrieve basic group information.
    
    The view exposes the group's name, creator, members and metadata. Values are
    converted to plain Python types to simplify JSON serialisation.
    
    Args:
        group_id: The ID of the group
    
    Returns:
        Dictionary containing group information
    """
    contract = get_contract()
    group_tuple = contract.functions.getGroup(group_id).call(
        build_default_call_args()
    )

    return {
        "id": group_tuple[0],
        "name": group_tuple[1],
        "creator": group_tuple[2],  # Public key (JSON string)
        "members": group_tuple[3],  # List of public keys (JSON strings)
        "messageCount": group_tuple[4],
        "createdAt": group_tuple[5],
    }


def get_group_member_public_keys(group_id: int, caller_public_key: str) -> List[Dict[str, str]]:
    """
    Obtain each group member's public key and name.
    
    The contract returns three parallel arrays (public keys, names, and public keys again).
    They are zipped into a list of dictionaries for ease of use on the client side.
    
    Args:
        group_id: The ID of the group
        caller_public_key: Public key (JSON string) of the caller (for authorization)
    
    Returns:
        List of dictionaries with publicKey and name
    """
    contract = get_contract()
    result = contract.functions.getGroupMemberInfo(group_id, caller_public_key).call(
        build_default_call_args()
    )

    members: List[str] = result[0]  # Public keys (JSON strings)
    names: List[str] = result[1]
    keys: List[str] = result[2]  # Same as members, for compatibility
    
    return [
        {"publicKey": members[i], "name": names[i]}
        for i in range(len(members))
    ]


def get_group_message_ids(group_id: int, caller_public_key: str) -> List[int]:
    """
    Return message identifiers for a group.
    
    The call requires the caller to be a registered group member.
    
    Args:
        group_id: The ID of the group
        caller_public_key: Public key (JSON string) of the caller (for authorization)
    
    Returns:
        List of message IDs
    """
    contract = get_contract()
    return list(
        contract.functions.getGroupMessageIds(group_id, caller_public_key).call(
            build_default_call_args()
        )
    )


def get_user_messages_in_group(group_id: int, caller_public_key: str) -> List[int]:
    """
    Return all message IDs for a user in a group (both sent and received).
    
    This combines sent and received messages to show all messages relevant to the user.
    
    Args:
        group_id: The ID of the group
        caller_public_key: Public key (JSON string) of the caller
    
    Returns:
        List of message IDs
    """
    contract = get_contract()
    
    sent_messages = list(
        contract.functions.getGroupMessagesSentBy(
            group_id, caller_public_key, caller_public_key
        ).call(build_default_call_args())
    )
    
    received_messages = list(
        contract.functions.getGroupMessagesReceivedBy(
            group_id, caller_public_key, caller_public_key
        ).call(build_default_call_args())
    )
    
    # Combine and deduplicate (in case there are duplicates, though there shouldn't be)
    all_messages = list(set(sent_messages + received_messages))
    # Sort by message ID (assuming higher IDs are newer)
    all_messages.sort()
    
    return all_messages


def get_message(message_id: int, caller_public_key: str) -> Dict[str, Any]:
    """
    Fetch a single message scoped to the caller (sender or recipient).
    
    The encrypted symmetric key is returned for the recipient, mirroring the
    smart contract implementation.
    
    Args:
        message_id: The ID of the message
        caller_public_key: Public key (JSON string) of the caller (for authorization)
    
    Returns:
        Dictionary containing message information
    """
    contract = get_contract()
    message = contract.functions.getMessage(message_id, caller_public_key).call(
        build_default_call_args()
    )

    return {
        "id": message[0],
        "groupId": message[1],
        "sender": message[2],  # Public key (JSON string)
        "recipient": message[3],  # Public key (JSON string)
        "encryptedContent": message[4],
        "encryptedKey": message[5],
        "timestamp": message[6],
        "messageHash": message[7].hex() if hasattr(message[7], 'hex') else message[7],
    }


def get_message_confirmations(message_id: int, caller_public_key: str) -> List[Dict[str, Any]]:
    """
    Return confirmation status for the message.
    
    Only the sender or recipient can check the confirmation status.
    
    Args:
        message_id: The ID of the message
        caller_public_key: Public key (JSON string) of the caller (for authorization)
    
    Returns:
        List containing confirmation information
    """
    contract = get_contract()
    confirmed, timestamp = contract.functions.getMessageConfirmation(
        message_id, caller_public_key
    ).call(build_default_call_args())

    # Get message details to know who the recipient is
    message = get_message(message_id, caller_public_key)
    
    return [
        {
            "recipient": message["recipient"],
            "confirmed": confirmed,
            "timestamp": timestamp,
        }
    ]


def get_message_stats(message_id: int, caller_public_key: str) -> Dict[str, int]:
    """
    Return confirmation statistics for the message.
    
    Since messages are now individual (one recipient per message), we return
    simple stats. Only the sender can see these stats.
    
    Args:
        message_id: The ID of the message
        caller_public_key: Public key (JSON string) of the caller (for authorization)
    
    Returns:
        Dictionary containing statistics
    """
    try:
        contract = get_contract()
        confirmed, timestamp = contract.functions.getMessageConfirmation(
            message_id, caller_public_key
        ).call(build_default_call_args())
        
        message = get_message(message_id, caller_public_key)
        
        # Only sender can see stats
        if message["sender"] != caller_public_key:
            return {}
        
        return {
            "totalRecipients": 1,
            "confirmedCount": 1 if confirmed else 0,
            "pendingCount": 0 if confirmed else 1,
        }
    except Exception:
        # If caller is not sender or recipient, return empty stats
        return {}


# Transaction execution functions

def sign_up_transaction(public_key: str, name: str) -> TxReceipt:
    """
    Execute signUp transaction on the blockchain.
    
    Normalizes the public key JSON before storing to ensure consistent formatting.
    
    Args:
        public_key: Public key as JSON string
        name: User's name
    
    Returns:
        Transaction receipt
    """
    # Normalize the public key JSON before storing
    normalized_key = normalize_public_key_json(public_key)
    
    contract = get_contract()
    function_call = contract.functions.signUp(normalized_key, name)
    return send_transaction(function_call)


def create_group_transaction(
    name: str,
    creator_public_key: str,
    initial_member_public_keys: List[str]
) -> TxReceipt:
    """
    Execute createGroup transaction on the blockchain.
    
    Args:
        name: Name of the group
        creator_public_key: Public key (JSON string) of the creator
        initial_member_public_keys: List of public keys (JSON strings) for initial members
    
    Returns:
        Transaction receipt
    """
    contract = get_contract()
    function_call = contract.functions.createGroup(
        name,
        creator_public_key,
        initial_member_public_keys
    )
    return send_transaction(function_call)


def add_member_transaction(
    group_id: int,
    creator_public_key: str,
    member_public_key: str
) -> TxReceipt:
    """
    Execute addMember transaction on the blockchain.
    
    Normalizes public keys before sending to ensure consistent comparison.
    
    Args:
        group_id: The ID of the group
        creator_public_key: Public key (JSON string) of the creator (for authorization)
        member_public_key: Public key (JSON string) of the member to add
    
    Returns:
        Transaction receipt
    """
    # Normalize public keys before sending
    normalized_creator_key = normalize_public_key_json(creator_public_key)
    normalized_member_key = normalize_public_key_json(member_public_key)
    
    contract = get_contract()
    function_call = contract.functions.addMember(
        group_id,
        normalized_creator_key,
        normalized_member_key
    )
    return send_transaction(function_call)


def remove_member_transaction(
    group_id: int,
    creator_public_key: str,
    member_public_key: str
) -> TxReceipt:
    """
    Execute removeMember transaction on the blockchain.
    
    Args:
        group_id: The ID of the group
        creator_public_key: Public key (JSON string) of the creator (for authorization)
        member_public_key: Public key (JSON string) of the member to remove
    
    Returns:
        Transaction receipt
    """
    contract = get_contract()
    function_call = contract.functions.removeMember(
        group_id,
        creator_public_key,
        member_public_key
    )
    return send_transaction(function_call)


def send_message_transaction(
    group_id: int,
    sender_public_key: str,
    recipient_public_key: str,
    encrypted_content: str,
    encrypted_key: str,
    encrypted_key_for_sender: str,
    message_hash: bytes
) -> TxReceipt:
    """
    Execute sendMessage transaction on the blockchain.
    
    Args:
        group_id: The ID of the group
        sender_public_key: Public key (JSON string) of the sender
        recipient_public_key: Public key (JSON string) of the recipient
        encrypted_content: Encrypted message content
        encrypted_key: Encrypted symmetric key for the recipient
        encrypted_key_for_sender: Encrypted symmetric key for the sender (so sender can read their own messages)
        message_hash: Hash of the original message (bytes32)
    
    Returns:
        Transaction receipt
    """
    contract = get_contract()
    function_call = contract.functions.sendMessage(
        group_id,
        sender_public_key,
        recipient_public_key,
        encrypted_content,
        encrypted_key,
        encrypted_key_for_sender,
        message_hash
    )
    return send_transaction(function_call)


def confirm_message_transaction(
    message_id: int,
    recipient_public_key: str
) -> TxReceipt:
    """
    Execute confirmMessageReception transaction on the blockchain.
    
    Args:
        message_id: The ID of the message
        recipient_public_key: Public key (JSON string) of the recipient (for authorization)
    
    Returns:
        Transaction receipt
    """
    contract = get_contract()
    function_call = contract.functions.confirmMessageReception(
        message_id,
        recipient_public_key
    )
    return send_transaction(function_call)
