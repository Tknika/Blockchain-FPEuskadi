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
    Obtain each group member's published encryption key.

    The contract returns two parallel arrays (addresses and keys). They are
    zipped into a list of dictionaries for ease of use on the client side.
    """
    contract = get_contract()
    result = contract.functions.getGroupMemberPublicKeys(group_id).call(
        build_default_call_args(caller)
    )

    members: List[str] = result[0]
    keys: List[str] = result[1]
    return [{"address": members[i], "publicKey": keys[i]} for i in range(len(members))]


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
    Fetch a single message scoped to the caller.

    Only the encrypted symmetric key for the caller is returned, mirroring the
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
        "encryptedContent": message[3],
        "encryptedKey": message[4],
        "timestamp": message[5],
        "messageHash": message[6].hex(),
    }


def get_message_confirmations(message_id: int, caller: str) -> List[Dict[str, Any]]:
    """
    Return confirmation status for every participant that received the message.

    The sender can use the endpoint to track delivery acknowledgements.
    """
    contract = get_contract()
    recipients, confirmations, timestamps = contract.functions.getAllMessageConfirmations(
        message_id
    ).call(build_default_call_args(caller))

    result: List[Dict[str, Any]] = []
    for index, recipient in enumerate(recipients):
        result.append(
            {
                "recipient": recipient,
                "confirmed": confirmations[index],
                "timestamp": timestamps[index],
            }
        )
    return result


def get_message_stats(message_id: int, caller: str) -> Dict[str, int]:
    """
    Return aggregate confirmation statistics for the message sender.
    """
    contract = get_contract()
    totals = contract.functions.getMessageConfirmationStats(message_id).call(
        build_default_call_args(caller)
    )
    return {
        "totalRecipients": totals[0],
        "confirmedCount": totals[1],
        "pendingCount": totals[2],
    }



