"""HTTP routes for the Bozketa dApp."""

from __future__ import annotations

from typing import Any

from flask import Blueprint, Flask, Response, current_app, jsonify, render_template, request

from .services import bozketa_service


bp = Blueprint("bozketa", __name__)


def init_app(app: Flask) -> None:
    """Register the Bozketa routes on the Flask app."""
    app.register_blueprint(bp)


def _json_response(data: Any, status: int = 200) -> tuple[Response, int]:
    """Return JSON in a consistent envelope."""
    return jsonify({"data": data}), status


def _error_response(message: str, status: int = 400) -> tuple[Response, int]:
    """Return an API error with a consistent structure."""
    return jsonify({"error": message}), status


@bp.route("/", methods=["GET"])
def index() -> str:
    """Render the single-page Bozketa interface."""
    return render_template(
        "index.html",
        contract_address=current_app.config.get("BOZKETA_CONTRACT_ADDRESS", ""),
        chain_id=current_app.config.get("BESU_CHAIN_ID"),
        besu_rpc=current_app.config.get("BESU_RPC_URL"),
    )


@bp.route("/api/status", methods=["GET"])
def api_status() -> tuple[Response, int]:
    """Provide a lightweight health check for Docker/nginx."""
    return _json_response(
        {
            "connected": current_app.config.get("WEB3_IS_CONNECTED", False),
            "contractConfigured": bool(current_app.config.get("BOZKETA_CONTRACT_ADDRESS")),
            "chainId": current_app.config.get("BESU_CHAIN_ID"),
        }
    )


@bp.route("/api/ballots", methods=["GET"])
def ballots() -> tuple[Response, int]:
    """List all ballots stored by the contract."""
    try:
        return _json_response(bozketa_service.list_ballots())
    except Exception as error:
        return _error_response(str(error), 500)


@bp.route("/api/ballots", methods=["POST"])
def create_ballot() -> tuple[Response, int]:
    """Create a new ballot and return the generated participant invitations."""
    payload = request.get_json(silent=True) or {}

    title = str(payload.get("title", "")).strip()
    proposal_names = _clean_string_list(payload.get("proposals", []))
    participant_names = _clean_string_list(payload.get("participants", []))
    start_time = _optional_int(payload.get("startTime", 0))
    end_time = _optional_int(payload.get("endTime", 0))

    if not title:
        return _error_response("Title is required.")
    if len(proposal_names) < 2:
        return _error_response("At least two proposals are required.")
    if not participant_names:
        return _error_response("At least one participant is required.")
    if end_time and end_time <= start_time:
        return _error_response("End time must be greater than start time.")

    try:
        result = bozketa_service.create_ballot(title, proposal_names, participant_names, start_time, end_time)
        return _json_response(result, 201)
    except Exception as error:
        return _error_response(str(error), 500)


@bp.route("/api/ballots/<int:ballot_id>", methods=["GET"])
def ballot_detail(ballot_id: int) -> tuple[Response, int]:
    """Return one ballot with proposal totals and public participants."""
    try:
        return _json_response(bozketa_service.get_ballot(ballot_id))
    except Exception as error:
        return _error_response(str(error), 404)


@bp.route("/api/ballots/<int:ballot_id>/vote", methods=["POST"])
def vote(ballot_id: int) -> tuple[Response, int]:
    """Submit one anonymous vote with a participant invitation token."""
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()

    try:
        proposal_index = int(payload.get("proposalIndex"))
    except (TypeError, ValueError):
        return _error_response("proposalIndex must be a number.")

    if not token:
        return _error_response("Invitation token is required.")

    try:
        result = bozketa_service.submit_vote(ballot_id, proposal_index, token)
        return _json_response(result)
    except Exception as error:
        return _error_response(str(error), 400)


def _clean_string_list(value: Any) -> list[str]:
    """Accept JSON arrays or newline-delimited strings and return non-empty values."""
    if isinstance(value, str):
        items = value.splitlines()
    elif isinstance(value, list):
        items = value
    else:
        items = []
    return [str(item).strip() for item in items if str(item).strip()]


def _optional_int(value: Any) -> int:
    """Parse optional integer form values, treating blanks as zero."""
    if value in ("", None):
        return 0
    return int(value)
