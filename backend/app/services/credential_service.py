import base64
import io
from datetime import datetime
from pathlib import Path
from typing import Optional

import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.core.config import CREDENTIALS_DIR, PUBLIC_API_BASE

ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"
TEMPLATE_PATH = ASSETS_DIR / "credencial_template_holo.png"


def decode_base64_image(b64: Optional[str]) -> Optional[bytes]:
    if not b64:
        return None
    try:
        clean = b64.split(",")[-1].strip()
        return base64.b64decode(clean)
    except Exception:
        return None


def create_qr_image(data: str) -> bytes:
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def draw_fit_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    font: str = "Helvetica",
    max_size: int = 14,
    min_size: int = 7,
):
    text = (text or "").strip()
    size = max_size

    while size >= min_size:
        c.setFont(font, size)
        if c.stringWidth(text, font, size) <= max_width:
            break
        size -= 1

    if size < min_size:
        size = min_size
        while text and c.stringWidth(text + "...", font, size) > max_width:
            text = text[:-1]
        if text:
            text += "..."

    c.setFont(font, size)
    c.drawString(x, y, text)


def draw_center_fit_text(
    c: canvas.Canvas,
    text: str,
    center_x: float,
    y: float,
    max_width: float,
    font: str = "Helvetica-Bold",
    max_size: int = 12,
    min_size: int = 7,
):
    text = (text or "").strip()
    size = max_size

    while size >= min_size:
        c.setFont(font, size)
        if c.stringWidth(text, font, size) <= max_width:
            break
        size -= 1

    if size < min_size:
        size = min_size
        while text and c.stringWidth(text + "...", font, size) > max_width:
            text = text[:-1]
        if text:
            text += "..."

    text_width = c.stringWidth(text, font, size)
    c.setFont(font, size)
    c.drawString(center_x - text_width / 2, y, text)


def draw_signature_block(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    signer_name: str,
    signer_role: str,
    signed_at: str,
    signature_reference: str,
    signature_image_bytes: Optional[bytes] = None,
):
    # Fondo del bloque
    c.setFillColorRGB(0.01, 0.12, 0.28)
    c.roundRect(x, y, w, h, 2.3 * mm, fill=1, stroke=0)

    # Borde
    c.setStrokeColorRGB(0.15, 0.76, 1.0)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 2.3 * mm, fill=0, stroke=1)

    # Línea decorativa
    c.setStrokeColorRGB(0.30, 0.85, 1.0)
    c.setLineWidth(0.4)
    c.line(x + 2 * mm, y + h - 5 * mm, x + w - 2 * mm, y + h - 5 * mm)

    # Título
    c.setFillColorRGB(1, 1, 1)
    draw_center_fit_text(
        c,
        "FIRMA ELECTRÓNICA AVANZADA",
        x + w / 2,
        y + h - 4.2 * mm,
        w - 4 * mm,
        "Helvetica-Bold",
        5,
        4,
    )

    # Imagen de firma visible
    if signature_image_bytes:
        try:
            img_x = x + 2.5 * mm
            img_y = y + 7.5 * mm
            img_w = w - 5 * mm
            img_h = 5.5 * mm

            c.drawImage(
                ImageReader(io.BytesIO(signature_image_bytes)),
                img_x,
                img_y,
                width=img_w,
                height=img_h,
                mask="auto",
                preserveAspectRatio=True,
                anchor='c',
            )
        except Exception:
            pass

    # Datos del firmante
    c.setFillColorRGB(0.88, 0.96, 1.0)

    draw_center_fit_text(
        c,
        signer_name,
        x + w / 2,
        y + 5.0 * mm,
        w - 4 * mm,
        "Helvetica-Bold",
        4,
        3,
    )

    draw_center_fit_text(
        c,
        signer_role,
        x + w / 2,
        y + 3.0 * mm,
        w - 4 * mm,
        "Helvetica",
        3,
        3,
    )

    # Pie técnico muy pequeño
    technical = f"{signed_at} | Ref: {signature_reference}"
    draw_center_fit_text(
        c,
        technical,
        x + w / 2,
        y + 1.0 * mm,
        w - 4 * mm,
        "Helvetica",
        2,
        2,
    )


def generate_credential_pdf(
    user_id: str,
    nickname: str,
    email: str,
    phone: str,
    avatar_base64: Optional[str],
    qr_login_token: Optional[str] = None,
    signature_image_base64: Optional[str] = None,
    signer_name: str = "AUTORIDAD EMISORA",
    signer_role: str = "UNIVERSIDAD MARIANO GÁLVEZ",
    signature_reference: Optional[str] = None,
    signed_at: Optional[str] = None,
) -> Path:
    pdf_path = CREDENTIALS_DIR / f"credencial_{user_id}.pdf"
    avatar_bytes = decode_base64_image(avatar_base64)
    signature_image_bytes = decode_base64_image(signature_image_base64)

    qr_target = (
        f"{PUBLIC_API_BASE}/auth/login-qr/{qr_login_token}"
        if qr_login_token
        else f"{PUBLIC_API_BASE}/credenciales/{user_id}/download"
    )
    qr_bytes = create_qr_image(qr_target)

    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    page_w, page_h = A4

    c.setTitle(f"Credencial {nickname}")
    c.setAuthor("UMG Rover")
    c.setSubject("Credencial institucional")
    c.setCreator("UMG Rover Credential Service")

    c.setFillColorRGB(1, 1, 1)
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    card_w = 190 * mm
    card_h = 118 * mm
    card_x = (page_w - card_w) / 2
    card_y = page_h - 150 * mm

    if TEMPLATE_PATH.exists():
        c.drawImage(
            str(TEMPLATE_PATH),
            card_x,
            card_y,
            width=card_w,
            height=card_h,
            mask="auto",
        )
    else:
        c.setFillColorRGB(0.05, 0.10, 0.22)
        c.roundRect(card_x, card_y, card_w, card_h, 6 * mm, fill=1, stroke=0)

    # FOTO
    photo_x = card_x + 16.4 * mm
    photo_y = card_y + 37.2 * mm
    photo_w = 33.5 * mm
    photo_h = 41.5 * mm

    c.setFillColorRGB(0.83, 0.85, 0.89)
    c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)

    if avatar_bytes:
        c.drawImage(
            ImageReader(io.BytesIO(avatar_bytes)),
            photo_x,
            photo_y,
            width=photo_w,
            height=photo_h,
            mask="auto",
        )
    else:
        c.setFillColorRGB(0.25, 0.28, 0.36)
        c.setFont("Helvetica-Bold", 21)
        c.drawCentredString(
            photo_x + photo_w / 2,
            photo_y + photo_h / 2 - 4,
            (nickname[:1] or "U").upper(),
        )

    # DATOS
    c.setFillColorRGB(1, 1, 1)

    data_x = card_x + 83.9 * mm
    data_width = 53 * mm

    draw_fit_text(c, nickname.upper(), data_x, card_y + 81 * mm, data_width, "Helvetica-Bold", 10, 8)
    draw_fit_text(c, email, data_x, card_y + 72.7 * mm, data_width, "Helvetica-Bold", 10, 8)
    draw_fit_text(c, phone, data_x, card_y + 62.3 * mm, data_width, "Helvetica-Bold", 10, 8)

    code = user_id.replace("-", "").upper()[:16]
    draw_fit_text(c, code, data_x, card_y + 53 * mm, data_width, "Helvetica-Bold", 10, 8)

    # FECHAS
    issue_date = datetime.now().strftime("%d/%m/%Y")
    valid_date = issue_date

    draw_center_fit_text(c, issue_date, card_x + 75.0 * mm, card_y + 26.5 * mm, 24 * mm, "Helvetica-Bold", 10, 8)
    draw_center_fit_text(c, valid_date, card_x + 110.0 * mm, card_y + 26.5 * mm, 24 * mm, "Helvetica-Bold", 10, 8)

    # Datos de firma visibles
    if not signed_at:
        signed_at = datetime.now().strftime("%d/%m/%Y %H:%M")

    if not signature_reference:
        signature_reference = user_id.replace("-", "").upper()[:12]

    # FIRMA VISIBLE
    sig_x = card_x + 138.5 * mm
    sig_y = card_y + 10.5 * mm
    sig_w = 37.0 * mm
    sig_h = 19.5 * mm

    draw_signature_block(
        c=c,
        x=sig_x,
        y=sig_y,
        w=sig_w,
        h=sig_h,
        signer_name=signer_name,
        signer_role=signer_role,
        signed_at=signed_at,
        signature_reference=signature_reference,
        signature_image_bytes=signature_image_bytes,
    )

    # QR LOGIN / DESCARGA
    qr_x = card_x + 13.0 * mm
    qr_y = card_y + 8.5 * mm
    qr_size = 20 * mm

    c.setFillColorRGB(1, 1, 1)
    c.roundRect(qr_x - 1 * mm, qr_y - 1 * mm, qr_size + 2 * mm, qr_size + 2 * mm, 2 * mm, fill=1, stroke=0)

    c.drawImage(
        ImageReader(io.BytesIO(qr_bytes)),
        qr_x,
        qr_y,
        width=qr_size,
        height=qr_size,
        mask="auto",
    )

    c.showPage()
    c.save()
    return pdf_path