import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.database import get_db
from app.core.security import (
    create_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.schemas.auth import FaceLoginRequest, Token, UserLogin, UserRegister
from app.services.audit_service import log_audit
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


def _get_client_meta(request: Request):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent


def _get_role_id(db, role_name: str) -> int:
    cursor = db.cursor()
    cursor.execute("SELECT id FROM roles WHERE nombre = %s LIMIT 1", (role_name,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail=f"No existe el rol '{role_name}' en la base de datos")
    return row[0]


def _get_user_by_nickname(db, nickname: str):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT
            c.id,
            c.email,
            c.nickname,
            c.password_hash,
            c.avatar_base64,
            r.nombre AS role
        FROM conductores c
        INNER JOIN roles r ON r.id = c.rol_id
        WHERE c.nickname = %s
          AND c.is_active = 1
        LIMIT 1
        """,
        (nickname,),
    )
    return cursor.fetchone()


def _get_user_by_qr_token(db, token: str):
    cursor = db.cursor()

    # 1) Intentar por tabla tokens_qr
    cursor.execute(
        """
        SELECT
            c.id,
            c.email,
            c.nickname,
            c.password_hash,
            c.avatar_base64,
            r.nombre AS role,
            tq.id AS token_qr_id
        FROM tokens_qr tq
        INNER JOIN conductores c ON c.id = tq.conductor_id
        INNER JOIN roles r ON r.id = c.rol_id
        WHERE tq.token = %s
          AND tq.usado = 0
          AND tq.expires_at >= NOW()
          AND c.is_active = 1
        LIMIT 1
        """,
        (token,),
    )
    row = cursor.fetchone()
    if row:
        return ("tokens_qr", row)

    # 2) Compatibilidad con el campo viejo en conductores
    cursor.execute(
        """
        SELECT
            c.id,
            c.email,
            c.nickname,
            c.password_hash,
            c.avatar_base64,
            r.nombre AS role,
            NULL AS token_qr_id
        FROM conductores c
        INNER JOIN roles r ON r.id = c.rol_id
        WHERE c.qr_login_token = %s
          AND c.is_active = 1
        LIMIT 1
        """,
        (token,),
    )
    row = cursor.fetchone()
    if row:
        return ("conductores", row)

    return None


def _insert_login_log(db, user_id: str, metodo: str, ip_address: str | None, user_agent: str | None):
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO bitacora_accesos (
            id,
            conductor_id,
            accion,
            metodo,
            fecha_hora,
            exito,
            ip_address,
            user_agent
        )
        VALUES (%s, %s, 'LOGIN', %s, NOW(), 1, %s, %s)
        """,
        (str(uuid.uuid4()), user_id, metodo, ip_address, user_agent),
    )


def _build_login_response(row, db, metodo: str, request: Request):
    user_id, email, nickname, _, avatar, role = row[:6]
    ip_address, user_agent = _get_client_meta(request)

    cursor = db.cursor()

    _insert_login_log(db, user_id, metodo, ip_address, user_agent)

    cursor.execute(
        """
        UPDATE conductores
        SET ultimo_login = NOW(),
            updated_at = NOW()
        WHERE id = %s
        """,
        (user_id,),
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


def _save_biometry_and_evidence(db, user_id: str, face_base64: str | None):
    if not face_base64:
        return

    cursor = db.cursor()

    # Guardar archivo físico
    save_registered_face(user_id, face_base64)

    # Guardar biometría
    cursor.execute(
        """
        INSERT INTO biometrias (
            id,
            conductor_id,
            tipo,
            imagen_base64,
            confianza_minima,
            activa,
            created_at
        )
        VALUES (%s, %s, 'facial', %s, %s, 1, NOW())
        """,
        (
            str(uuid.uuid4()),
            user_id,
            face_base64,
            80.00,
        ),
    )

    # Guardar evidencia
    cursor.execute(
        """
        INSERT INTO evidencias_conductor (
            id,
            conductor_id,
            tipo_evidencia,
            nombre_archivo,
            archivo_base64,
            descripcion,
            fecha_subida,
            es_principal,
            estado
        )
        VALUES (%s, %s, 'FOTO', %s, %s, %s, NOW(), 1, 'ACTIVA')
        """,
        (
            str(uuid.uuid4()),
            user_id,
            f"rostro_{user_id}.jpg",
            face_base64,
            "Rostro registrado para autenticación facial",
        ),
    )


def _save_qr_token(db, user_id: str, token: str):
    cursor = db.cursor()

    # Compatibilidad con login QR viejo
    cursor.execute(
        """
        UPDATE conductores
        SET qr_login_token = %s,
            updated_at = NOW()
        WHERE id = %s
        """,
        (token, user_id),
    )

    # Nuevo registro en tokens_qr
    cursor.execute(
        """
        INSERT INTO tokens_qr (
            id,
            conductor_id,
            token,
            usado,
            expires_at,
            created_at
        )
        VALUES (%s, %s, %s, 0, %s, NOW())
        """,
        (
            str(uuid.uuid4()),
            user_id,
            token,
            datetime.now() + timedelta(days=365),
        ),
    )


def _save_credential_record(db, user_id: str, pdf_path):
    cursor = db.cursor()

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    hash_documento = hashlib.sha256(pdf_bytes).hexdigest()
    codigo_credencial = f"CRED-{user_id.replace('-', '').upper()[:16]}"

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
            str(uuid.uuid4()),
            user_id,
            codigo_credencial,
            pdf_path.name,
            str(pdf_path),
            hash_documento,
        ),
    )


def _mark_credential_delivery(db, user_id: str, email_sent: bool, whatsapp_sent: bool):
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE credenciales_pdf
        SET enviado_email = %s,
            enviado_whatsapp = %s,
            estado = %s
        WHERE conductor_id = %s
        ORDER BY fecha_generacion DESC
        LIMIT 1
        """,
        (
            1 if email_sent else 0,
            1 if whatsapp_sent else 0,
            "ENVIADA" if (email_sent or whatsapp_sent) else "GENERADA",
            user_id,
        ),
    )


def _restore_face_from_db_if_needed(db, user_id: str):
    try:
        return load_registered_face(user_id)
    except FaceError:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT imagen_base64
            FROM biometrias
            WHERE conductor_id = %s
              AND tipo = 'facial'
              AND activa = 1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        if not row or not row[0]:
            raise FaceError("El usuario no tiene rostro registrado")
        save_registered_face(user_id, row[0])
        return load_registered_face(user_id)


@router.post("/register")
async def register(user: UserRegister, request: Request, db=Depends(get_db)):
    if user.email != user.email_confirm:
        raise HTTPException(status_code=400, detail="Los correos no coinciden")

    if user.phone != user.phone_confirm:
        raise HTTPException(status_code=400, detail="Los teléfonos no coinciden")

    if user.password != user.password_confirm:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")

    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    normalized_phone = normalize_phone(user.phone)
    conductor_role_id = _get_role_id(db, "conductor")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id
        FROM conductores
        WHERE email = %s OR nickname = %s
        LIMIT 1
        """,
        (user.email, user.nickname),
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="El email o nickname ya está registrado")

    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user.password)
    qr_token = secrets.token_hex(32)
    ip_address, user_agent = _get_client_meta(request)

    try:
        cursor.execute(
            """
            INSERT INTO conductores (
                id,
                rol_id,
                nombres,
                apellidos,
                email,
                phone,
                password_hash,
                nickname,
                avatar_base64,
                is_active,
                email_verificado,
                telefono_verificado,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1, 0, 0, NOW())
            """,
            (
                user_id,
                conductor_role_id,
                user.nombres.strip(),
                user.apellidos.strip(),
                user.email,
                normalized_phone,
                hashed_pw,
                user.nickname.strip(),
                user.avatar_base64,
            ),
        )

        _save_qr_token(db, user_id, qr_token)

        if user.face_base64:
            _save_biometry_and_evidence(db, user_id, user.face_base64)

        log_audit(
            db=db,
            conductor_id=user_id,
            tabla_afectada="conductores",
            registro_id=user_id,
            accion="INSERT",
            datos_nuevos={
                "id": user_id,
                "rol_id": conductor_role_id,
                "nombres": user.nombres,
                "apellidos": user.apellidos,
                "email": user.email,
                "phone": normalized_phone,
                "nickname": user.nickname,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            observaciones="Registro de nuevo conductor",
        )

        db.commit()

    except FaceError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error en reconocimiento facial: {exc}")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar usuario: {exc}")

    # Generar PDF y registrar credencial
    try:
        pdf_path = generate_credential_pdf(
            user_id=user_id,
            nickname=user.nickname,
            email=user.email,
            phone=normalized_phone,
            avatar_base64=user.face_base64 or user.avatar_base64,
            qr_login_token=qr_token,
        )

        cursor = db.cursor()
        _save_credential_record(db, user_id, pdf_path)
        db.commit()

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo generar la credencial PDF: {exc}")

    email_status = "pendiente"
    whatsapp_status = "pendiente"
    email_sent = False
    whatsapp_sent = False

    try:
        email_status = send_email_with_pdf(
            user.email,
            user.nickname,
            pdf_path,
            user_id,
        )
        email_sent = email_status == "enviado"
    except Exception as exc:
        email_status = f"no enviado: {exc}"

    try:
        whatsapp_status = send_whatsapp_with_link(
            normalized_phone,
            user.nickname,
            user_id,
        )
        whatsapp_sent = not whatsapp_status.startswith("no ")
    except Exception as exc:
        whatsapp_status = f"no enviado: {exc}"

    try:
        _mark_credential_delivery(db, user_id, email_sent, whatsapp_sent)

        log_audit(
            db=db,
            conductor_id=user_id,
            tabla_afectada="credenciales_pdf",
            registro_id=user_id,
            accion="UPDATE",
            datos_nuevos={
                "enviado_email": email_sent,
                "enviado_whatsapp": whatsapp_sent,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            observaciones="Actualización de envío de credencial",
        )

        db.commit()
    except Exception:
        db.rollback()

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


@router.post("/login", response_model=Token)
async def login(data: UserLogin, request: Request, db=Depends(get_db)):
    try:
        row = _get_user_by_nickname(db, data.nickname)

        if not row:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")

        if not verify_password(data.password, row[3]):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

        return _build_login_response(row, db, "PASSWORD", request)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error interno login: {exc}")


@router.post("/login-face", response_model=Token)
async def login_face(data: FaceLoginRequest, request: Request, db=Depends(get_db)):
    row = _get_user_by_nickname(db, data.nickname)

    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user_id = row[0]

    try:
        registered_path = _restore_face_from_db_if_needed(db, user_id)
        result = compare_faces(registered_path, data.face_base64)
    except FaceError as exc:
        raise HTTPException(status_code=400, detail=f"Reconocimiento facial no válido: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error interno en login facial: {exc}")

    if not result["accepted"]:
        raise HTTPException(status_code=401, detail=f"El rostro no coincide. Puntaje: {result['score']}")

    return _build_login_response(row, db, "FACE", request)


@router.get("/login-qr/{token}", response_model=Token)
async def login_qr(token: str, request: Request, db=Depends(get_db)):
    result = _get_user_by_qr_token(db, token)

    if not result:
        raise HTTPException(status_code=404, detail="QR inválido o expirado")

    source, row = result
    token_qr_id = row[6]

    try:
        if source == "tokens_qr" and token_qr_id:
            cursor = db.cursor()
            cursor.execute(
                """
                UPDATE tokens_qr
                SET usado = 1,
                    usado_at = NOW()
                WHERE id = %s
                """,
                (token_qr_id,),
            )
            db.commit()
    except Exception:
        db.rollback()

    return _build_login_response(row, db, "QR", request)


@router.post("/logout")
async def logout(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cursor()
    log_id = str(uuid.uuid4())
    ip_address, user_agent = _get_client_meta(request)

    try:
        cursor.execute(
            """
            INSERT INTO bitacora_accesos (
                id,
                conductor_id,
                accion,
                metodo,
                fecha_hora,
                exito,
                ip_address,
                user_agent
            )
            VALUES (%s, %s, 'LOGOUT', 'TOKEN', NOW(), 1, %s, %s)
            """,
            (log_id, current_user["sub"], ip_address, user_agent),
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

        log_audit(
            db=db,
            conductor_id=current_user["sub"],
            tabla_afectada="bitacora_accesos",
            registro_id=log_id,
            accion="INSERT",
            datos_nuevos={
                "conductor_id": current_user["sub"],
                "accion": "LOGOUT",
                "metodo": "TOKEN",
            },
            ip_address=ip_address,
            user_agent=user_agent,
            observaciones="Cierre de sesión",
        )

        db.commit()

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo cerrar sesión: {exc}")

    return {"message": "Sesión cerrada"}