import hashlib
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

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
            conductor_id,
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


def _build_validation_code(user_id: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"UMG-{user_id.replace('-', '').upper()[:6]}-{timestamp}"


def _calculate_pdf_hash(pdf_path: Path) -> str:
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    return hashlib.sha256(pdf_bytes).hexdigest()


def _insert_credential_record(
    db,
    user_id: str,
    pdf_path: Path,
    codigo_credencial: str,
    estado: str = "GENERADA",
):
    cursor = db.cursor()
    hash_documento = _calculate_pdf_hash(pdf_path)
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
        VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, 0, 0)
        """,
        (
            cred_id,
            user_id,
            codigo_credencial,
            pdf_path.name,
            str(pdf_path),
            hash_documento,
            estado,
        ),
    )

    return {
        "credential_id": cred_id,
        "codigo_credencial": codigo_credencial,
        "hash_documento": hash_documento,
    }


def _update_credential_file_info(
    db,
    credential_id: str,
    pdf_path: Path,
    estado: str = "GENERADA",
):
    cursor = db.cursor()
    hash_documento = _calculate_pdf_hash(pdf_path)

    cursor.execute(
        """
        UPDATE credenciales_pdf
        SET nombre_archivo = %s,
            ruta_archivo = %s,
            hash_documento = %s,
            estado = %s
        WHERE id = %s
        """,
        (
            pdf_path.name,
            str(pdf_path),
            hash_documento,
            estado,
            credential_id,
        ),
    )

    return hash_documento


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


def _safe_get(row, key, default=None):
    if not row:
        return default
    if isinstance(row, dict):
        return row.get(key, default)
    return row[key] if key in row else default


def _generate_and_store_credential(db, user_row):
    user_id = _safe_get(user_row, "id")
    nickname = _safe_get(user_row, "nickname", "")
    email = _safe_get(user_row, "email", "")
    phone = _safe_get(user_row, "phone", "")
    avatar_base64 = _safe_get(user_row, "avatar_base64")
    qr_login_token = _safe_get(user_row, "qr_login_token")

    codigo_credencial = _build_validation_code(user_id)

    pdf_path = generate_credential_pdf(
        user_id=user_id,
        nickname=nickname,
        email=email,
        phone=phone,
        avatar_base64=avatar_base64,
        qr_login_token=qr_login_token,
        validation_code=codigo_credencial,
        signer_name="UMG Rover",
        signer_role="Autoridad Emisora",
        status="VÁLIDO",
    )

    insert_result = _insert_credential_record(
        db=db,
        user_id=user_id,
        pdf_path=pdf_path,
        codigo_credencial=codigo_credencial,
    )

    return pdf_path, insert_result


@router.get("/{user_id}/download")
def download_credential(
    user_id: str,
    request: Request,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_module_permission(db, current_user, "credenciales", "exportar")
    _ensure_access(current_user, user_id)

    user_row = _get_user_row(user_id, db)
    if not user_row:
        raise HTTPException(404, "Usuario no encontrado o inactivo")

    latest = _get_latest_credential(db, user_id)
    pdf_path = None
    credential_id = None

    if latest:
        credential_id = _safe_get(latest, "id")
        stored_path = _safe_get(latest, "ruta_archivo")

        if stored_path:
            existing_path = Path(stored_path)
            if existing_path.exists():
                pdf_path = existing_path

    if pdf_path is None:
        pdf_path, insert_result = _generate_and_store_credential(db, user_row)
        credential_id = insert_result["credential_id"]
        db.commit()

    ip_address, user_agent = _get_client_meta(request)
    try:
        log_audit(
            db=db,
            current_user=current_user,
            tabla_afectada="credenciales_pdf",
            registro_id=credential_id,
            accion="DESCARGAR_CREDENCIAL",
            datos_anteriores=None,
            datos_nuevos={
                "user_id": user_id,
                "archivo": pdf_path.name,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.commit()
    except Exception:
        db.rollback()

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )


@router.post("/{user_id}/reenviar")
def resend_credential(
    user_id: str,
    request: Request,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ensure_module_permission(db, current_user, "credenciales", "exportar")
    _ensure_access(current_user, user_id)

    user_row = _get_user_row(user_id, db)
    if not user_row:
        raise HTTPException(404, "Usuario no encontrado o inactivo")

    email = _safe_get(user_row, "email")
    phone = _safe_get(user_row, "phone")

    latest = _get_latest_credential(db, user_id)
    pdf_path = None
    credential_id = None

    if latest:
        credential_id = _safe_get(latest, "id")
        stored_path = _safe_get(latest, "ruta_archivo")

        if stored_path:
            existing_path = Path(stored_path)
            if existing_path.exists():
                pdf_path = existing_path

    if pdf_path is None:
        pdf_path, insert_result = _generate_and_store_credential(db, user_row)
        credential_id = insert_result["credential_id"]
        db.commit()

    email_sent = False
    whatsapp_sent = False

    try:
        if email:
            email_sent = send_email_with_pdf(
                to_email=email,
                pdf_path=pdf_path,
                subject="Credencial UMG Rover",
                body="Adjuntamos tu credencial generada por el sistema UMG Rover.",
            )
    except Exception:
        email_sent = False

    try:
        if phone:
            whatsapp_sent = send_whatsapp_with_link(
                phone=phone,
                user_id=user_id,
            )
    except Exception:
        whatsapp_sent = False

    _update_delivery_status(
        db=db,
        credential_id=credential_id,
        email_sent=email_sent,
        whatsapp_sent=whatsapp_sent,
    )
    db.commit()

    ip_address, user_agent = _get_client_meta(request)
    try:
        log_audit(
            db=db,
            current_user=current_user,
            tabla_afectada="credenciales_pdf",
            registro_id=credential_id,
            accion="REENVIAR_CREDENCIAL",
            datos_anteriores=None,
            datos_nuevos={
                "user_id": user_id,
                "archivo": pdf_path.name,
                "email_sent": email_sent,
                "whatsapp_sent": whatsapp_sent,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.commit()
    except Exception:
        db.rollback()

    return build_delivery_status(
        email_status=email_sent,
        whatsapp_status=whatsapp_sent,
        user_id=user_id,
    )