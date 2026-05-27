"""HTTP routes for the Bozketa dApp."""

from __future__ import annotations

import csv
import io
from email.utils import parseaddr
from typing import Any

from flask import Blueprint, Flask, Response, current_app, jsonify, render_template, request

from .services import bozketa_service, email_service


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
    """Render the ballot creation page."""
    return render_template(
        "index.html",
        contract_address=current_app.config.get("BOZKETA_CONTRACT_ADDRESS", ""),
        chain_id=current_app.config.get("BESU_CHAIN_ID"),
        besu_rpc=current_app.config.get("BESU_RPC_URL"),
        creation_summary=None,
        error=None,
    )


@bp.route("/", methods=["POST"])
def create_ballot_page() -> str:
    """Create a ballot from the page form and send email invitations."""
    try:
        title = request.form.get("title", "").strip()
        proposal_names = _clean_string_list(request.form.get("proposals", ""))
        participants = _parse_participants_csv(request.files.get("participants_csv"))

        _validate_ballot_input(title, proposal_names, [participant["name"] for participant in participants])

        result = bozketa_service.create_ballot(
            title=title,
            proposal_names=proposal_names,
            participant_names=[participant["name"] for participant in participants],
        )
        email_summary = _send_invitations(title, participants, result["invitations"], result["ballotId"])
        creation_summary = {
            "ballotId": result["ballotId"],
            "transactionHash": result["transactionHash"],
            "sent": email_summary["sent"],
            "failed": email_summary["failed"],
        }
        error = None
    except Exception as exc:
        creation_summary = None
        error = str(exc)

    return render_template(
        "index.html",
        contract_address=current_app.config.get("BOZKETA_CONTRACT_ADDRESS", ""),
        chain_id=current_app.config.get("BESU_CHAIN_ID"),
        besu_rpc=current_app.config.get("BESU_RPC_URL"),
        creation_summary=creation_summary,
        error=error,
    )


@bp.route("/participants-template.csv", methods=["GET"])
def participants_template() -> Response:
    """Download a CSV template for ballot participants."""
    body = "name,email\nAne Adibidea,ane@example.com\nJon Adibidea,jon@example.com\n"
    return Response(
        body,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=bozketa-participants-template.csv"},
    )


@bp.route("/vote/<int:ballot_id>/<token>", methods=["GET", "POST"])
def vote_page(ballot_id: int, token: str) -> str:
    """Render the participant-only voting page and results after voting."""
    error = None
    success = None

    try:
        ballot = bozketa_service.get_ballot_for_voting(ballot_id, token)
        if request.method == "POST" and not ballot["hasVoted"]:
            try:
                proposal_index = int(request.form.get("proposalIndex", ""))
                bozketa_service.submit_vote(ballot_id, proposal_index, token)
                success = "Zure botoa erregistratu da."
                ballot = bozketa_service.get_ballot_for_voting(ballot_id, token)
            except Exception as exc:
                error = str(exc)
    except Exception as exc:
        ballot = None
        error = str(exc)

    return render_template(
        "vote.html",
        ballot=ballot,
        token=token,
        error=error,
        success=success,
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

    if end_time and end_time <= start_time:
        return _error_response("Amaiera-orduak hasiera-ordua baino handiagoa izan behar du.")

    try:
        _validate_ballot_input(title, proposal_names, participant_names)
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
        return _error_response("Aukeraren identifikatzaileak zenbaki bat izan behar du.")

    if not token:
        return _error_response("Gonbidapen-tokena beharrezkoa da.")

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


def _validate_ballot_input(title: str, proposal_names: list[str], participant_names: list[str]) -> None:
    """Validate shared ballot creation inputs for page and API routes."""
    if not title:
        raise ValueError("Izenburua beharrezkoa da.")
    if len(proposal_names) < 2:
        raise ValueError("Gutxienez bi aukera behar dira.")
    if not participant_names:
        raise ValueError("Gutxienez partaide bat behar da.")


def _parse_participants_csv(upload) -> list[dict[str, str]]:
    """Parse a CSV file with name,email columns into participant dictionaries."""
    if upload is None or not upload.filename:
        raise ValueError("Partaideen CSV fitxategia beharrezkoa da.")

    content = upload.read().decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(content)))
    rows = [row for row in rows if any(cell.strip() for cell in row)]
    if not rows:
        raise ValueError("Partaideen CSV fitxategia hutsik dago.")

    first_row = [cell.strip().lower() for cell in rows[0]]
    has_header = len(first_row) >= 2 and first_row[0] == "name" and first_row[1] == "email"
    data_rows = rows[1:] if has_header else rows

    participants: list[dict[str, str]] = []
    for row_number, row in enumerate(data_rows, start=2 if has_header else 1):
        if len(row) < 2:
            raise ValueError(f"CSV fitxategiko {row_number}. lerroak izena eta emaila eduki behar ditu.")

        name = row[0].strip()
        email = row[1].strip()
        parsed_email = parseaddr(email)[1]
        if not name:
            raise ValueError(f"CSV fitxategiko {row_number}. lerroan partaidearen izena falta da.")
        if not parsed_email or "@" not in parsed_email:
            raise ValueError(f"CSV fitxategiko {row_number}. lerroko email helbidea ez da baliozkoa.")

        participants.append({"name": name, "email": parsed_email})

    return participants


def _send_invitations(
    title: str,
    participants: list[dict[str, str]],
    invitations: list[dict[str, str]],
    ballot_id: int,
) -> dict[str, Any]:
    """Send private vote URLs to participants and collect delivery results."""
    sent: list[str] = []
    failed: list[dict[str, str]] = []
    base_url = current_app.config.get("BOZKETA_PUBLIC_URL") or request.url_root
    base_url = base_url.rstrip("/")

    for participant, invitation in zip(participants, invitations):
        vote_url = f"{base_url}/vote/{ballot_id}/{invitation['token']}"
        try:
            email_service.send_vote_invitation(participant["name"], participant["email"], title, vote_url)
            sent.append(participant["email"])
        except Exception as exc:
            failed.append({"email": participant["email"], "error": str(exc)})

    return {"sent": sent, "failed": failed}


def _optional_int(value: Any) -> int:
    """Parse optional integer form values, treating blanks as zero."""
    if value in ("", None):
        return 0
    return int(value)
