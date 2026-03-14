from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.core.config import CREDENTIALS_DIR
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.credential_service import generate_credential_pdf
from app.services.delivery_service import (
    build_delivery_status,
    send_email_with_pdf,
    send_whatsapp_with_link,
)

router = APIRouter(prefix="/credenciales", tags=["Credenciales"])


def _get_user_row(user_id: str, db):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id, email, nickname, phone, avatar_base64
        FROM conductores
        WHERE id = %s
        """,
        (user_id,),
    )
    return cursor.fetchone()


@router.get("/{user_id}/download")
def download_credential(user_id: str, db=Depends(get_db)):
    row = _get_user_row(user_id, db)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user_id_db, email, nickname, phone, avatar_base64 = row

    pdf_path = CREDENTIALS_DIR / f"credencial_{user_id_db}.pdf"

    if not pdf_path.exists():
        try:
            pdf_path = generate_credential_pdf(
                user_id=user_id_db,
                nickname=nickname,
                email=email,
                phone=phone,
                avatar_base64=avatar_base64,
            )
        except Exception as exc:
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
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    row = _get_user_row(user_id, db)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user_id_db, email, nickname, phone, avatar_base64 = row

    if current_user["sub"] != user_id_db and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para reenviar esta credencial",
        )

    pdf_path = CREDENTIALS_DIR / f"credencial_{user_id_db}.pdf"

    try:
        if not pdf_path.exists():
            pdf_path = generate_credential_pdf(
                user_id=user_id_db,
                nickname=nickname,
                email=email,
                phone=phone,
                avatar_base64=avatar_base64,
            )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo generar la credencial PDF: {exc}",
        )

    email_status = "pendiente"
    whatsapp_status = "pendiente"

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
        except Exception as exc:
            whatsapp_status = f"no enviado: {exc}"

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