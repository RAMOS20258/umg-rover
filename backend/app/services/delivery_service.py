import os
import re
import smtplib
import threading
from email.message import EmailMessage
from pathlib import Path

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


# =========================
# MODELO DE RESPUESTA
# =========================
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


# =========================
# EMAIL
# =========================
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

    try:
        if MAIL_SSL_TLS:
            with smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT, timeout=30) as server:
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(MAIL_SERVER, MAIL_PORT, timeout=30) as server:
                if MAIL_STARTTLS:
                    server.starttls()
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.send_message(msg)

        return "enviado"
    except Exception as exc:
        raise RuntimeError(f"Error SMTP enviando correo: {exc}") from exc


# =========================
# WHATSAPP
# =========================
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


def _send_pywhatkit_message(phone: str, message: str) -> None:
    import pywhatkit as kit

    kit.sendwhatmsg_instantly(
        phone_no=phone,
        message=message,
        wait_time=20,
        tab_close=True,
        close_time=3,
    )


def send_whatsapp_with_link(phone: str, nickname: str, user_id: str) -> str:
    normalized_phone = normalize_phone(phone)
    message = build_whatsapp_message(nickname, user_id)

    # Si está en Railway, no usar PyWhatKit
    if os.getenv("RAILWAY_PROJECT_ID") or os.getenv("RAILWAY_ENVIRONMENT"):
        return "no disponible en Railway: PyWhatKit requiere entorno gráfico"

    try:
        thread = threading.Thread(
            target=_send_pywhatkit_message,
            args=(normalized_phone, message),
            daemon=True,
        )
        thread.start()
        return "en proceso por PyWhatKit"
    except Exception as exc:
        raise RuntimeError(f"Error enviando por PyWhatKit: {exc}") from exc