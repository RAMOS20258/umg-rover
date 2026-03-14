
import smtplib
from email.message import EmailMessage
from pathlib import Path

from app.core.config import (
    MAIL_SERVER,
    MAIL_PORT,
    MAIL_USERNAME,
    MAIL_PASSWORD,
    MAIL_FROM,
    MAIL_FROM_NAME,
    MAIL_STARTTLS,
    MAIL_SSL_TLS,
)

def send_credential_email(to_email: str, subject: str, body: str, pdf_path: Path):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        raise ValueError("No están configuradas las credenciales SMTP en el archivo .env")

    if not pdf_path.exists():
        raise FileNotFoundError(f"No existe el archivo PDF: {pdf_path}")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
    msg["To"] = to_email
    msg.set_content(body)

    with open(pdf_path, "rb") as f:
        pdf_data = f.read()

    msg.add_attachment(
        pdf_data,
        maintype="application",
        subtype="pdf",
        filename=pdf_path.name
    )

    if MAIL_SSL_TLS:
        with smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT) as smtp:
            smtp.login(MAIL_USERNAME, MAIL_PASSWORD)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as smtp:
            smtp.ehlo()
            if MAIL_STARTTLS:
                smtp.starttls()
                smtp.ehlo()
            smtp.login(MAIL_USERNAME, MAIL_PASSWORD)
            smtp.send_message(msg)