import hashlib
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from app.core.config import CREDENTIALS_DIR
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.audit_service import log_audit
from app.services.credential_service import generate_credential_pdf
from app.services.delivery_service import (
    build_delivery_status,
    send_email_with_pdf,
    send_whatsapp_with_link,
)
from app.services.permission_service import ensure_module_permission

router = APIRouter(prefix="/credenciales", tags=["Credenciales"])


def _get_client_meta(request: Request):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent


def _get_user_row(user_id: str, db):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT
            c.id,
            c.email,
            c.nickname,
            c.phone,
            c.avatar_base64,
            c.qr_login_token
        FROM conductores c
        WHERE c.id = %s
          AND c.is_active = 1
        LIMIT 1
        """,
        (user_id,),
    )
    return cursor.fetchone()


def _get_latest_credential(db, user_id: str):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT
            id,
            codigo_credencial,
            nombre_archivo,
            ruta_archivo,
            hash_documento,
            fecha_generacion,
            estado,
            enviado_email,
            enviado_whatsapp
        FROM credenciales_pdf
        WHERE conductor_id = %s
        ORDER BY fecha_generacion DESC
        LIMIT 1
        """,
        (user_id,),
    )
    return cursor.fetchone()


# 🔥 MODIFICADO
def _insert_credential_record(db, user_id: str, pdf_path):
    cursor = db.cursor()

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    # HASH
    hash_documento = hashlib.sha256(pdf_bytes).hexdigest()

    # CÓDIGO ÚNICO
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    codigo_credencial = f"UMG-{user_id.replace('-', '').upper()[:6]}-{timestamp}"

    cred_id = str(uuid.uuid4())

    cursor.execute(
        """
        INSERT INTO credenciales_pdf (
            id,
            conductor_id,
            codigo_credencial,
            nombre_archivo,
            ruta_archivo,
            hash_documento,
            fecha_generacion,
            estado,
            enviado_email,
            enviado_whatsapp
        )
        VALUES (%s, %s, %s, %s, %s, %s, NOW(), 'GENERADA', 0, 0)
        """,
        (
            cred_id,
            user_id,
            codigo_credencial,
            pdf_path.name,
            str(pdf_path),
            hash_documento,
        ),
    )

    return cred_id


def _update_credential_file_info(db, credential_id: str, pdf_path):
    cursor = db.cursor()

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    hash_documento = hashlib.sha256(pdf_bytes).hexdigest()

    cursor.execute(
        """
        UPDATE credenciales_pdf
        SET nombre_archivo = %s,
            ruta_archivo = %s,
            hash_documento = %s,
            estado = 'GENERADA'
        WHERE id = %s
        """,
        (
            pdf_path.name,
            str(pdf_path),
            hash_documento,
            credential_id,
        ),
    )


def _update_delivery_status(db, credential_id: str, email_sent: bool, whatsapp_sent: bool):
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE credenciales_pdf
        SET enviado_email = %s,
            enviado_whatsapp = %s,
            estado = %s
        WHERE id = %s
        """,
        (
            1 if email_sent else 0,
            1 if whatsapp_sent else 0,
            "ENVIADA" if (email_sent or whatsapp_sent) else "GENERADA",
            credential_id,
        ),
    )


def _ensure_access(current_user: dict | None, target_user_id: str):
    if current_user is None:
        return True
    if current_user.get("sub") == target_user_id:
        return True
    if current_user.get("role") in ["admin", "supervisor"]:
        return True

    raise HTTPException(403, "No tienes permiso para acceder a esta credencial")