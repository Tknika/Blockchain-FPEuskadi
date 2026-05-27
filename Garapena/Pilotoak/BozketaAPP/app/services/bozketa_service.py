"""Business logic for creating ballots, issuing tokens and reading results."""

from __future__ import annotations

import secrets
from typing import Any

from web3 import Web3

from .web3_service import get_contract, send_transaction


COMMITMENT_DOMAIN = "BOZKETA_COMMITMENT"
NULLIFIER_DOMAIN = "BOZKETA_NULLIFIER"


def create_ballot(
    title: str,
    proposal_names: list[str],
    participant_names: list[str],
    start_time: int = 0,
    end_time: int = 0,
) -> dict[str, Any]:
    """Create a ballot on-chain and return one-time invitation tokens."""
    invite_tokens = [_new_token_secret() for _ in participant_names]
    commitments = [_commitment_for_token(token) for token in invite_tokens]

    contract = get_contract()
    receipt = send_transaction(
        contract.functions.createBallot(
            title,
            proposal_names,
            participant_names,
            commitments,
            start_time,
            end_time,
        )
    )

    ballot_id = _extract_ballot_id(receipt)
    invitations = [
        {
            "participantName": name,
            "token": token,
            "commitment": commitment.hex(),
        }
        for name, token, commitment in zip(participant_names, invite_tokens, commitments)
    ]

    return {
        "ballotId": ballot_id,
        "transactionHash": receipt.transactionHash.hex(),
        "invitations": invitations,
    }


def list_ballots() -> list[dict[str, Any]]:
    """Return summaries for all ballots currently stored in the contract."""
    contract = get_contract()
    ballot_count = contract.functions.ballotCount().call()
    return [get_ballot(ballot_id, include_participants=False) for ballot_id in range(ballot_count)]


def get_ballot(ballot_id: int, include_participants: bool = True) -> dict[str, Any]:
    """Return ballot metadata, proposals, results and optional public participants."""
    contract = get_contract()
    summary = contract.functions.getBallotSummary(ballot_id).call()
    proposal_count = int(summary[4])
    participant_count = int(summary[5])

    proposals = []
    for proposal_index in range(proposal_count):
        proposal = contract.functions.getProposal(ballot_id, proposal_index).call()
        proposals.append(
            {
                "index": proposal_index,
                "name": proposal[0],
                "voteCount": int(proposal[1]),
            }
        )

    participants = []
    if include_participants:
        for participant_index in range(participant_count):
            participant = contract.functions.getParticipant(ballot_id, participant_index).call()
            participants.append(
                {
                    "index": participant_index,
                    "name": participant[0],
                    "commitment": participant[1].hex(),
                }
            )

    return {
        "id": ballot_id,
        "title": summary[0],
        "creator": summary[1],
        "startTime": int(summary[2]),
        "endTime": int(summary[3]),
        "proposalCount": proposal_count,
        "participantCount": participant_count,
        "voteCount": int(summary[6]),
        "proposals": proposals,
        "participants": participants,
    }


def submit_vote(ballot_id: int, proposal_index: int, token: str) -> dict[str, Any]:
    """Cast one anonymous vote with an invitation token."""
    contract = get_contract()
    commitment = _commitment_for_token(token)
    if not contract.functions.verifyCommitment(ballot_id, commitment).call():
        raise ValueError("Gonbidapen-tokena ez da baliozkoa bozketa honetarako.")

    nullifier_hash = _nullifier_for_token(ballot_id, token)
    receipt = send_transaction(contract.functions.vote(ballot_id, proposal_index, nullifier_hash))

    return {
        "transactionHash": receipt.transactionHash.hex(),
        "nullifierHash": nullifier_hash.hex(),
    }


def is_valid_token(ballot_id: int, token: str) -> bool:
    """Return whether the token matches one of the ballot participant commitments."""
    contract = get_contract()
    return bool(contract.functions.verifyCommitment(ballot_id, _commitment_for_token(token)).call())


def has_token_voted(ballot_id: int, token: str) -> bool:
    """Return whether the token's anonymous nullifier has already voted."""
    contract = get_contract()
    return bool(contract.functions.hasVoted(ballot_id, _nullifier_for_token(ballot_id, token)).call())


def get_ballot_for_voting(ballot_id: int, token: str) -> dict[str, Any]:
    """Load a ballot and include the current token voting status."""
    if not is_valid_token(ballot_id, token):
        raise ValueError("Gonbidapen-tokena ez da baliozkoa bozketa honetarako.")

    ballot = get_ballot(ballot_id, include_participants=False)
    ballot["hasVoted"] = has_token_voted(ballot_id, token)
    return ballot


def _new_token_secret() -> str:
    """Generate a 32-byte participant secret encoded as hex for invitation links."""
    return secrets.token_hex(32)


def _token_to_bytes(token: str) -> bytes:
    """Validate and decode a token into the bytes32 value expected by the contract."""
    cleaned = token.removeprefix("0x").strip()
    if len(cleaned) != 64:
        raise ValueError("Gonbidapen-tokenak 32 byte izan behar ditu, 64 karaktere hamaseitarretan kodetuta.")
    try:
        return bytes.fromhex(cleaned)
    except ValueError as error:
        raise ValueError("Gonbidapen-tokenak balio hamaseitarra izan behar du.") from error


def _commitment_for_token(token: str) -> bytes:
    """Hash the invite token so the contract can verify eligibility without storing the token."""
    return Web3.solidity_keccak(["bytes32", "string"], [_token_to_bytes(token), COMMITMENT_DOMAIN])


def _nullifier_for_token(ballot_id: int, token: str) -> bytes:
    """Hash the ballot and invite token to prevent double voting without storing the token."""
    return Web3.solidity_keccak(["uint256", "bytes32", "string"], [ballot_id, _token_to_bytes(token), NULLIFIER_DOMAIN])


def _extract_ballot_id(receipt) -> int:
    """Read the BallotCreated event from a transaction receipt."""
    contract = get_contract()
    events = contract.events.BallotCreated().process_receipt(receipt)
    if not events:
        raise RuntimeError("BallotCreated gertaera ez da aurkitu transakzioaren egiaztagirian.")
    return int(events[0]["args"]["ballotId"])
