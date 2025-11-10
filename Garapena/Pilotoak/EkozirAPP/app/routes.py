"""HTTP routes for the Flask Ekozir dApp."""

from __future__ import annotations

from typing import Any, Dict

from flask import Blueprint, Flask, Response, current_app, jsonify, render_template, request

from .services import ekozir_service


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


@bp.route("/api/users/<address>/groups", methods=["GET"])
def user_groups(address: str) -> Response:
    """Return group identifiers for the supplied user address."""
    groups = ekozir_service.get_user_groups(address)
    return _json_response({"groups": groups})


@bp.route("/api/groups/<int:group_id>", methods=["GET"])
def group_detail(group_id: int) -> Response:
    """Return group metadata and member encryption keys."""
    caller = request.args.get("caller")
    group = ekozir_service.get_group(group_id)

    members = []
    if caller:
        members = ekozir_service.get_group_member_public_keys(group_id, caller)

    return _json_response({"group": group, "members": members})


@bp.route("/api/groups/<int:group_id>/messages", methods=["GET"])
def group_messages(group_id: int) -> Response:
    """Return message identifiers for the group."""
    caller = request.args.get("caller")
    if not caller:
        return _json_response({"error": "caller parameter is required"}, status=400)

    message_ids = ekozir_service.get_group_message_ids(group_id, caller)
    return _json_response({"messageIds": message_ids})


@bp.route("/api/messages/<int:message_id>", methods=["GET"])
def message_detail(message_id: int) -> Response:
    """Return data for a specific message from the caller's perspective."""
    caller = request.args.get("caller")
    if not caller:
        return _json_response({"error": "caller parameter is required"}, status=400)

    message = ekozir_service.get_message(message_id, caller)
    confirmations = ekozir_service.get_message_confirmations(message_id, caller)

    stats = {}
    # Only the sender can access the aggregate stats; the helper handles reverts.
    try:
        stats = ekozir_service.get_message_stats(message_id, caller)
    except Exception:  # noqa: BLE001 - propagate empty stats on revert
        stats = {}

    return _json_response(
        {"message": message, "confirmations": confirmations, "stats": stats}
    )


def init_app(app: Flask) -> None:
    """Register the blueprint with the provided Flask application instance."""
    app.register_blueprint(bp)

