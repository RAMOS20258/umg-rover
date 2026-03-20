import os
import re
import smtplib
from email.message import EmailMessage
from pathlib import Path

import requests
from pydantic import BaseModel

from app.core.config import (
    PUBLIC_API_BASE,
    MAIL_SERVER,
    MAIL_PORT,
    MAIL_USERNAME,
    MAIL_PASSWORD,
    MAIL_FROM,
    MAIL_FROM_NAME,
    MAIL_STARTTLS,
    MAIL_SSL_TLS,
)


WHATSAPP_NODE_SERVICE_URL = os.getenv("WHATSAPP_NODE_SERVICE_URL", "").rstrip("/")


class DeliveryStatus(BaseModel):
    email: str
    whatsapp: str
    credential_url: str | None = None


def build_delivery_status(email_status: str, whatsapp_status: str, user_id: str) -> DeliveryStatus:
    credential_url = f"{PUBLIC_API_BASE}/credenciales/{user_id}/download"
    return DeliveryStatus(
        email=email_status,
        whatsapp=whatsapp_status,
        credential_url=credential_url,
    )


def send_email_with_pdf(email: str, nickname: str, pdf_path: Path, user_id: str) -> str:
    if not email or not email.strip():
        raise ValueError("El correo del destinatario está vacío")

    if not pdf_path or not pdf_path.exists():
        raise FileNotFoundError(f"No existe el PDF para enviar: {pdf_path}")

    if not MAIL_SERVER or not MAIL_USERNAME or not MAIL_PASSWORD:
        raise RuntimeError(
            "Faltan variables de correo. Configura MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD y MAIL_FROM"
        )

    download_url = f"{PUBLIC_API_BASE}/credenciales/{user_id}/download"

    msg = EmailMessage()
    msg["Subject"] = "Tu credencial UMG Rover está lista"
    msg["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
    msg["To"] = email

    msg.set_content(
        f"""Hola {nickname},

Tu credencial de UMG Rover ya está disponible.

Se adjunta el archivo PDF en este correo.

También puedes descargarla aquí:
{download_url}

Saludos,
UMG Rover 2.0
"""
    )

    with open(pdf_path, "rb") as f:
        pdf_data = f.read()

    msg.add_attachment(
        pdf_data,
        maintype="application",
        subtype="pdf",
        filename=pdf_path.name,
    )

    print("=== SMTP DEBUG ===")
    print("MAIL_SERVER:", MAIL_SERVER)
    print("MAIL_PORT:", MAIL_PORT)
    print("MAIL_USERNAME:", MAIL_USERNAME)
    print("MAIL_FROM:", MAIL_FROM)
    print("MAIL_STARTTLS:", MAIL_STARTTLS)
    print("MAIL_SSL_TLS:", MAIL_SSL_TLS)
    print("MAIL_PASSWORD_SET:", bool(MAIL_PASSWORD))
    print("DESTINATARIO:", email)
    print("==================")

    try:
        if MAIL_SSL_TLS:
            with smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT, timeout=30) as server:
                server.ehlo()
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(MAIL_SERVER, MAIL_PORT, timeout=30) as server:
                server.ehlo()
                if MAIL_STARTTLS:
                    server.starttls()
                    server.ehlo()
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.send_message(msg)

        return "enviado"

    except Exception as exc:
        print("SMTP ERROR REAL:", repr(exc))
        raise RuntimeError(f"Error SMTP enviando correo: {exc}") from exc


def normalize_phone(phone: str) -> str:
    if not phone:
        raise ValueError("El número de teléfono es obligatorio")

    cleaned = re.sub(r"[^\d+]", "", phone.strip())

    if not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"

    if not re.fullmatch(r"\+\d{8,15}", cleaned):
        raise ValueError("Número inválido. Usa formato internacional, por ejemplo +50212345678")

    return cleaned


def build_whatsapp_message(nickname: str, user_id: str) -> str:
    link = f"{PUBLIC_API_BASE}/credenciales/{user_id}/download"
    return (
        f"Hola {nickname}, tu credencial de UMG Rover ya está lista.\n"
        f"Puedes descargarla aquí:\n{link}"
    )


def _send_whatsapp_via_node_service(phone: str, message: str) -> str:
    if not WHATSAPP_NODE_SERVICE_URL:
        raise RuntimeError(
            "Falta la variable WHATSAPP_NODE_SERVICE_URL en Railway o en tu entorno local"
        )

    payload = {
        "phone": phone,
        "message": message,
    }

    try:
        response = requests.post(
            f"{WHATSAPP_NODE_SERVICE_URL}/send-text",
            json=payload,
            timeout=60,
        )
    except Exception as exc:
        raise RuntimeError(f"No se pudo conectar con el servicio Node de WhatsApp: {exc}") from exc

    try:
        data = response.json()
    except Exception:
        data = {"message": response.text}

    if response.status_code >= 300:
        raise RuntimeError(
            f"Servicio Node WhatsApp respondió con error {response.status_code}: {data.get('message', response.text)}"
        )

    if not data.get("ok", False):
        raise RuntimeError(data.get("message", "Error desconocido enviando WhatsApp"))

    return "enviado"


def send_whatsapp_with_link(phone: str, nickname: str, user_id: str) -> str:
    normalized_phone = normalize_phone(phone)
    message = build_whatsapp_message(nickname, user_id)

    return _send_whatsapp_via_node_service(
        phone=normalized_phone,
        message=message,
    )