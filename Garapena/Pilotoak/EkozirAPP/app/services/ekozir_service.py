"""Ekozir smart contract helper functions."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from eth_typing import ChecksumAddress
from web3 import Web3

from .web3_service import build_default_call_args, get_contract, get_web3


def _checksum(address: str) -> ChecksumAddress:
    """Convert the supplied address to EIP-55 checksum format."""
    return get_web3().to_checksum_address(address)


def get_user_groups(user_address: str) -> List[int]:
    """
    Fetch the identifiers of the groups the user belongs to.

    The contract returns a list of ``uint256`` values which Web3.py converts to
    Python integers automatically.
    """
    contract = get_contract()
    checksum = _checksum(user_address)
    return list(contract.functions.getUserGroups(checksum).call())


def get_group(group_id: int) -> Dict[str, Any]:
    """
    Retrieve basic group information.

    The view exposes the group's name, creator, members and metadata. Values are
    converted to plain Python types to simplify JSON serialisation.
    """
    contract = get_contract()
    group_tuple = contract.functions.getGroup(group_id).call()

    return {
        "id": group_tuple[0],
        "name": group_tuple[1],
        "creator": group_tuple[2],
        "members": group_tuple[3],
        "messageCount": group_tuple[4],
        "createdAt": group_tuple[5],
    }


def get_group_member_public_keys(group_id: int, caller: str) -> List[Dict[str, str]]:
    """
    Obtain each group member's published encryption key and name.

    The contract returns three parallel arrays (addresses, names, and keys). They are
    zipped into a list of dictionaries for ease of use on the client side.
    """
    contract = get_contract()
    result = contract.functions.getGroupMemberInfo(group_id).call(
        build_default_call_args(caller)
    )

    members: List[str] = result[0]
    names: List[str] = result[1]
    keys: List[str] = result[2]
    return [
        {"address": members[i], "name": names[i], "publicKey": keys[i]}
        for i in range(len(members))
    ]


def get_group_message_ids(group_id: int, caller: str) -> List[int]:
    """
    Return message identifiers for a group.

    The call requires the caller to be a registered group member.
    """
    contract = get_contract()
    return list(
        contract.functions.getGroupMessageIds(group_id).call(
            build_default_call_args(caller)
        )
    )


def get_message(message_id: int, caller: str) -> Dict[str, Any]:
    """
    Fetch a single message scoped to the caller (sender or recipient).

    The encrypted symmetric key is returned for the recipient, mirroring the
    smart contract implementation.
    """
    contract = get_contract()
    message = contract.functions.getMessage(message_id).call(
        build_default_call_args(caller)
    )

    return {
        "id": message[0],
        "groupId": message[1],
        "sender": message[2],
        "recipient": message[3],
        "encryptedContent": message[4],
        "encryptedKey": message[5],
        "timestamp": message[6],
        "messageHash": message[7].hex(),
    }


def get_message_confirmations(message_id: int, caller: str) -> List[Dict[str, Any]]:
    """
    Return confirmation status for the message.

    Only the sender or recipient can check the confirmation status.
    """
    contract = get_contract()
    confirmed, timestamp = contract.functions.getMessageConfirmation(
        message_id
    ).call(build_default_call_args(caller))

    # Get message details to know who the recipient is
    message = get_message(message_id, caller)
    
    return [
        {
            "recipient": message["recipient"],
            "confirmed": confirmed,
            "timestamp": timestamp,
        }
    ]


def get_message_stats(message_id: int, caller: str) -> Dict[str, int]:
    """
    Return confirmation statistics for the message.

    Since messages are now individual (one recipient per message), we return
    simple stats. Only the sender can see these stats.
    """
    try:
        contract = get_contract()
        confirmed, timestamp = contract.functions.getMessageConfirmation(
            message_id
        ).call(build_default_call_args(caller))
        
        message = get_message(message_id, caller)
        
        # Only sender can see stats
        if message["sender"].lower() != caller.lower():
            return {}
        
        return {
            "totalRecipients": 1,
            "confirmedCount": 1 if confirmed else 0,
            "pendingCount": 0 if confirmed else 1,
        }
    except Exception:
        # If caller is not sender or recipient, return empty stats
        return {}



