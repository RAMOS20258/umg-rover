import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import (
    create_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models import FaceLoginRequest, Token, UserLogin, UserRegister
from app.services.credential_service import generate_credential_pdf
from app.services.delivery_service import (
    build_delivery_status,
    normalize_phone,
    send_email_with_pdf,
    send_whatsapp_with_link,
)
from app.services.face_service import (
    FaceError,
    compare_faces,
    load_registered_face,
    save_registered_face,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_login_response(row, db):
    user_id, email, nickname, _, avatar, role = row

    log_id = str(uuid.uuid4())
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO bitacora_accesos (id, conductor_id, accion, fecha_hora)
        VALUES (%s, %s, 'LOGIN', NOW())
        """,
        (log_id, user_id),
    )
    db.commit()

    token = create_token({"sub": user_id, "nickname": nickname, "role": role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "nickname": nickname,
            "avatar": avatar,
            "role": role,
        },
    }


@router.post("/register")
async def register(user: UserRegister, db=Depends(get_db)):
    if user.email != user.email_confirm:
        raise HTTPException(status_code=400, detail="Los correos no coinciden")

    if user.phone != user.phone_confirm:
        raise HTTPException(status_code=400, detail="Los teléfonos no coinciden")

    if user.password != user.password_confirm:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")

    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    normalized_phone = normalize_phone(user.phone)
    cursor = db.cursor()

    cursor.execute(
        "SELECT id FROM conductores WHERE email = %s OR nickname = %s",
        (user.email, user.nickname),
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="El email o nickname ya está registrado")

    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user.password)
    qr_token = secrets.token_hex(32)

    try:
        cursor.execute(
            """
            INSERT INTO conductores (
                id,
                email,
                phone,
                password_hash,
                nickname,
                avatar_base64,
                qr_login_token,
                created_at,
                role
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), 'conductor')
            """,
            (
                user_id,
                user.email,
                normalized_phone,
                hashed_pw,
                user.nickname,
                user.avatar_base64,
                qr_token,
            ),
        )

        if user.face_base64:
            save_registered_face(user_id, user.face_base64)

        db.commit()

    except FaceError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error en reconocimiento facial: {exc}")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar usuario: {exc}")

    try:
        photo_for_credential = user.face_base64

        pdf_path = generate_credential_pdf(
            user_id,
            user.nickname,
            user.email,
            normalized_phone,
            photo_for_credential,
            qr_token,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo generar la credencial PDF: {exc}")

    email_status = "pendiente"
    whatsapp_status = "pendiente"

    try:
        email_status = send_email_with_pdf(user.email, user.nickname, pdf_path)
    except Exception as exc:
        email_status = f"no enviado: {exc}"

    try:
        whatsapp_status = send_whatsapp_with_link(
            normalized_phone,
            user.nickname,
            user_id,
        )
    except Exception as exc:
        whatsapp_status = f"no enviado: {exc}"

    return {
        "message": "Registro exitoso",
        "user_id": user_id,
        "qr_login_token": qr_token,
        "delivery": build_delivery_status(
            email_status,
            whatsapp_status,
            user_id,
        ).model_dump(),
        "face_registered": bool(user.face_base64),
    }


@router.post("/login")
async def login(data: UserLogin, db=Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, email, nickname, password_hash, avatar_base64, role
            FROM conductores
            WHERE nickname = %s
            """,
            (data.nickname,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")

        if not verify_password(data.password, row[3]):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

        return _build_login_response(row, db)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error interno login: {exc}")

@router.post("/login-face", response_model=Token)
async def login_face(data: FaceLoginRequest, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id, email, nickname, password_hash, avatar_base64, role
        FROM conductores
        WHERE nickname = %s
        """,
        (data.nickname,),
    )
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user_id = row[0]

    try:
        registered_path = load_registered_face(user_id)
        result = compare_faces(registered_path, data.face_base64)
    except FaceError as exc:
        raise HTTPException(status_code=400, detail=f"Reconocimiento facial no válido: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error interno en login facial: {exc}")

    if not result["accepted"]:
        raise HTTPException(status_code=401, detail=f"El rostro no coincide. Puntaje: {result['score']}")

    return _build_login_response(row, db)


@router.get("/login-qr/{token}")
async def login_qr(token: str, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id, email, nickname, password_hash, avatar_base64, role
        FROM conductores
        WHERE qr_login_token = %s
        """,
        (token,),
    )
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="QR inválido o expirado")

    return _build_login_response(row, db)


@router.post("/logout")
async def logout(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cursor()
    log_id = str(uuid.uuid4())

    try:
        cursor.execute(
            """
            INSERT INTO bitacora_accesos (id, conductor_id, accion, fecha_hora)
            VALUES (%s, %s, 'LOGOUT', NOW())
            """,
            (log_id, current_user["sub"]),
        )

        cursor.execute(
            """
            UPDATE bitacora_accesos
            SET fecha_salida = NOW()
            WHERE conductor_id = %s
              AND accion = 'LOGIN'
              AND fecha_salida IS NULL
            """,
            (current_user["sub"],),
        )

        db.commit()

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo cerrar sesión: {exc}")

    return {"message": "Sesión cerrada"}