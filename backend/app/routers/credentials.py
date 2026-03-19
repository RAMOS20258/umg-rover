import hashlib
import uuid

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


def _insert_credential_record(db, user_id: str, pdf_path):
    cursor = db.cursor()

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    hash_documento = hashlib.sha256(pdf_bytes).hexdigest()
    codigo_credencial = f"CRED-{user_id.replace('-', '').upper()[:16]}"
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

    raise HTTPException(
        status_code=403,
        detail="No tienes permiso para acceder a esta credencial",
    )


@router.get("/{user_id}/download")
def download_credential(
    user_id: str,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "credenciales", "ver")

    row = _get_user_row(user_id, db)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    _ensure_access(current_user, user_id)

    user_id_db, email, nickname, phone, avatar_base64, qr_login_token = row
    ip_address, user_agent = _get_client_meta(request)

    latest_credential = _get_latest_credential(db, user_id_db)

    if latest_credential and latest_credential[2]:
        pdf_path = CREDENTIALS_DIR / latest_credential[2]
    else:
        pdf_path = CREDENTIALS_DIR / f"credencial_{user_id_db}.pdf"

    if not pdf_path.exists():
        try:
            pdf_path = generate_credential_pdf(
                user_id=user_id_db,
                nickname=nickname,
                email=email,
                phone=phone,
                avatar_base64=avatar_base64,
                qr_login_token=qr_login_token,
            )

            if latest_credential:
                _update_credential_file_info(db, latest_credential[0], pdf_path)
                credential_id = latest_credential[0]
                action = "UPDATE"
            else:
                credential_id = _insert_credential_record(db, user_id_db, pdf_path)
                action = "INSERT"

            log_audit(
                db=db,
                conductor_id=current_user["sub"],
                tabla_afectada="credenciales_pdf",
                registro_id=credential_id,
                accion=action,
                datos_nuevos={
                    "conductor_id": user_id_db,
                    "archivo": pdf_path.name,
                },
                ip_address=ip_address,
                user_agent=user_agent,
                observaciones="Generación o regeneración de credencial PDF",
            )

            db.commit()

        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"No se pudo generar la credencial PDF: {exc}",
            )

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )


@router.post("/{user_id}/reenviar")
def reenviar_credencial(
    user_id: str,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "credenciales", "exportar")

    row = _get_user_row(user_id, db)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    _ensure_access(current_user, user_id)

    user_id_db, email, nickname, phone, avatar_base64, qr_login_token = row
    ip_address, user_agent = _get_client_meta(request)

    latest_credential = _get_latest_credential(db, user_id_db)

    if latest_credential and latest_credential[2]:
        pdf_path = CREDENTIALS_DIR / latest_credential[2]
        credential_id = latest_credential[0]
    else:
        pdf_path = CREDENTIALS_DIR / f"credencial_{user_id_db}.pdf"
        credential_id = None

    try:
        if not pdf_path.exists():
            pdf_path = generate_credential_pdf(
                user_id=user_id_db,
                nickname=nickname,
                email=email,
                phone=phone,
                avatar_base64=avatar_base64,
                qr_login_token=qr_login_token,
            )

            if latest_credential:
                _update_credential_file_info(db, latest_credential[0], pdf_path)
                credential_id = latest_credential[0]
            else:
                credential_id = _insert_credential_record(db, user_id_db, pdf_path)

            db.commit()

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo generar la credencial PDF: {exc}",
        )

    email_status = "pendiente"
    whatsapp_status = "pendiente"
    email_sent = False
    whatsapp_sent = False

    if not email or not email.strip():
        email_status = "no enviado: el usuario no tiene correo registrado"
    else:
        try:
            email_status = send_email_with_pdf(
                email=email,
                nickname=nickname,
                pdf_path=pdf_path,
                user_id=user_id_db,
            )
            email_sent = email_status == "enviado"
        except Exception as exc:
            email_status = f"no enviado: {exc}"

    if not phone or not str(phone).strip():
        whatsapp_status = "no enviado: el usuario no tiene teléfono registrado"
    else:
        try:
            whatsapp_status = send_whatsapp_with_link(
                phone=phone,
                nickname=nickname,
                user_id=user_id_db,
            )
            whatsapp_sent = not whatsapp_status.startswith("no ")
        except Exception as exc:
            whatsapp_status = f"no enviado: {exc}"

    try:
        if credential_id:
            _update_delivery_status(db, credential_id, email_sent, whatsapp_sent)

            log_audit(
                db=db,
                conductor_id=current_user["sub"],
                tabla_afectada="credenciales_pdf",
                registro_id=credential_id,
                accion="UPDATE",
                datos_nuevos={
                    "enviado_email": email_sent,
                    "enviado_whatsapp": whatsapp_sent,
                },
                ip_address=ip_address,
                user_agent=user_agent,
                observaciones="Reenvío de credencial PDF",
            )

            db.commit()
    except Exception:
        db.rollback()

    return {
        "ok": True,
        "message": "Proceso de reenvío completado",
        "delivery": build_delivery_status(
            email_status,
            whatsapp_status,
            user_id_db,
        ).model_dump(),
        "pdf": pdf_path.name,
    }


@router.get("/mis-credenciales")
def mis_credenciales(current_user=Depends(get_current_user), db=Depends(get_db)):
    ensure_module_permission(db, current_user, "credenciales", "ver")

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
        """,
        (current_user["sub"],),
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "codigo_credencial": r[1],
            "nombre_archivo": r[2],
            "ruta_archivo": r[3],
            "hash_documento": r[4],
            "fecha_generacion": str(r[5]),
            "estado": r[6],
            "enviado_email": bool(r[7]),
            "enviado_whatsapp": bool(r[8]),
        }
        for r in rows
    ]