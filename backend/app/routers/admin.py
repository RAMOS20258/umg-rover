from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.permission_service import ensure_module_permission

router = APIRouter(prefix="/admin", tags=["Admin"])


def _ensure_admin_or_supervisor(current_user):
    if current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")


@router.get("/conductores")
def get_conductores(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _ensure_admin_or_supervisor(current_user)
    ensure_module_permission(db, current_user, "usuarios", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT
            c.id,
            c.email,
            c.nickname,
            c.avatar_base64,
            r.nombre AS role,
            c.is_active,
            c.created_at
        FROM conductores c
        INNER JOIN roles r ON r.id = c.rol_id
        ORDER BY c.created_at DESC
        """
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "email": r[1],
            "nickname": r[2],
            "avatar": r[3],
            "role": r[4],
            "activo": bool(r[5]),
            "created_at": str(r[6]),
        }
        for r in rows
    ]


@router.get("/stats")
def get_stats(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _ensure_admin_or_supervisor(current_user)
    ensure_module_permission(db, current_user, "reportes", "ver")

    cursor = db.cursor()

    cursor.execute("SELECT COUNT(*) FROM conductores")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM programas")
    total_programs = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM simulaciones")
    total_simulations = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM errores_compilador")
    total_errors = cursor.fetchone()[0]

    return {
        "usuarios": total_users,
        "programas": total_programs,
        "simulaciones": total_simulations,
        "errores": total_errors,
    }


@router.get("/accesos")
def get_access_logs(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _ensure_admin_or_supervisor(current_user)
    ensure_module_permission(db, current_user, "auditoria", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT 
            b.id,
            c.nickname,
            b.accion,
            b.fecha_hora,
            b.fecha_salida,
            b.ip_address,
            c.avatar_base64
        FROM bitacora_accesos b
        INNER JOIN conductores c ON c.id = b.conductor_id
        ORDER BY b.fecha_hora DESC
        LIMIT 100
        """
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "usuario": r[1],
            "nickname": r[1],
            "accion": r[2],
            "entrada": str(r[3]),
            "ingreso": str(r[3]),
            "salida": str(r[4]) if r[4] else None,
            "ip": r[5],
            "avatar": r[6],
        }
        for r in rows
    ]


@router.get("/evidencias")
def get_all_evidences(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _ensure_admin_or_supervisor(current_user)
    ensure_module_permission(db, current_user, "evidencias", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT 
            e.id,
            c.nickname,
            e.tipo_evidencia,
            e.nombre_archivo,
            e.fecha_subida,
            e.es_principal,
            e.estado
        FROM evidencias_conductor e
        INNER JOIN conductores c ON c.id = e.conductor_id
        ORDER BY e.fecha_subida DESC
        LIMIT 100
        """
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "usuario": r[1],
            "tipo": r[2],
            "archivo": r[3],
            "fecha": str(r[4]),
            "principal": bool(r[5]),
            "estado": r[6],
        }
        for r in rows
    ]


@router.get("/errores")
def get_compiler_errors(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _ensure_admin_or_supervisor(current_user)
    ensure_module_permission(db, current_user, "reportes", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT 
            ec.id,
            c.nickname,
            ec.tipo_error,
            ec.mensaje_error,
            ec.severidad,
            ec.fecha_error
        FROM errores_compilador ec
        INNER JOIN conductores c ON c.id = ec.conductor_id
        ORDER BY ec.fecha_error DESC
        LIMIT 100
        """
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "usuario": r[1],
            "tipo": r[2],
            "mensaje": r[3],
            "severidad": r[4],
            "fecha": str(r[5]),
        }
        for r in rows
    ]


@router.get("/credenciales")
def get_credentials(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _ensure_admin_or_supervisor(current_user)
    ensure_module_permission(db, current_user, "credenciales", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT 
            cp.id,
            c.nickname,
            cp.codigo_credencial,
            cp.fecha_generacion,
            cp.estado,
            cp.enviado_email,
            cp.enviado_whatsapp
        FROM credenciales_pdf cp
        INNER JOIN conductores c ON c.id = cp.conductor_id
        ORDER BY cp.fecha_generacion DESC
        LIMIT 100
        """
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "usuario": r[1],
            "codigo": r[2],
            "fecha": str(r[3]),
            "estado": r[4],
            "email": bool(r[5]),
            "whatsapp": bool(r[6]),
        }
        for r in rows
    ]
