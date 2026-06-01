"""Email delivery helpers for Bozketa invitations."""

from __future__ import annotations

import smtplib
import logging
from html import escape
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid

from flask import current_app


def send_vote_invitation(recipient_name: str, recipient_email: str, ballot_title: str, vote_url: str) -> None:
    """Send a participant their private vote link through the configured SMTP server."""
    sender = current_app.config["SMTP_SENDER"]
    message = MIMEMultipart("alternative")
    message["Subject"] = f"{ballot_title} - Bozketa gonbidapena"
    message["From"] = f"BozketaAPP <{sender}>"
    message["To"] = recipient_email
    message["Date"] = formatdate(localtime=True)

    text_body = (
        f"Kaixo {recipient_name},\n\n"
        f"Bozketa honetan parte hartzera gonbidatu zaituzte: {ballot_title}\n\n"
        f"Bozkatzeko esteka pribatua:\n{vote_url}\n\n"
        "Esteka hau pertsonala da. Ez partekatu beste inorekin.\n"
    )
    safe_name = escape(recipient_name)
    safe_title = escape(ballot_title)
    safe_url = escape(vote_url, quote=True)
    html_body = f"""
    <html>
      <body>
        <p>Kaixo {safe_name},</p>
        <p>Bozketa honetan parte hartzera gonbidatu zaituzte: <strong>{safe_title}</strong></p>
        <p><a href="{safe_url}">Bozkatu hemen</a></p>
        <p>Esteka hau pertsonala da. Ez partekatu beste inorekin.</p>
      </body>
    </html>
    """

    message.attach(MIMEText(text_body, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))

    _send_message(sender, recipient_email, message)


def _send_message(sender: str, recipient: str, message: MIMEMultipart) -> None:
    """Connect to the Docker mailserver or configured SMTP relay and send one message."""
    # Some SMTP relays reject messages without RFC 5322 metadata.
    if "Date" not in message:
        message["Date"] = formatdate(localtime=True)
    if "Message-ID" not in message:
        message["Message-ID"] = make_msgid(domain=sender.split("@")[-1])

    server_name = current_app.config["SMTP_SERVER"]
    port = current_app.config["SMTP_PORT"]
    username = current_app.config["SMTP_USERNAME"].strip()
    password = current_app.config["SMTP_PASSWORD"].strip()

    smtp_class = smtplib.SMTP_SSL if current_app.config["SMTP_USE_SSL"] else smtplib.SMTP
    with smtp_class(server_name, port, timeout=20) as server:
        server.ehlo()
        if current_app.config["SMTP_USE_STARTTLS"]:
            server.starttls()
            server.ehlo()
        if username and password and server.has_extn("auth"):
            server.login(username, password)
        elif username and password:
            logging.warning("SMTP credentials are configured, but %s:%s does not advertise AUTH.", server_name, port)
        server.sendmail(sender, recipient, message.as_string())
