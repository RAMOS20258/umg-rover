from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import require_role
from app.services.permission_service import ensure_module_permission

router = APIRouter(prefix="/admin", tags=["Admin"])


# =========================================
# 👤 LISTAR CONDUCTORES
# =========================================
@router.get("/conductores")
def get_conductores(
    current_user=Depends(require_role("admin", "supervisor")),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "usuarios", "ver")

    cursor = db.cursor()
    cursor.execute("""
        SELECT id, email, nickname, role, is_active, created_at
        FROM conductores
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "email": r[1],
            "nickname": r[2],
            "role": r[3],
            "activo": bool(r[4]),
            "created_at": str(r[5]),
        }
        for r in rows
    ]


# =========================================
# 📊 ESTADÍSTICAS GENERALES
# =========================================
@router.get("/stats")
def get_stats(
    current_user=Depends(require_role("admin", "supervisor")),
    db=Depends(get_db),
):
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


# =========================================
# 📋 BITÁCORA DE ACCESOS
# =========================================
@router.get("/accesos")
def get_access_logs(
    current_user=Depends(require_role("admin", "supervisor")),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "auditoria", "ver")

    cursor = db.cursor()
    cursor.execute("""
        SELECT 
            b.id,
            c.nickname,
            b.accion,
            b.fecha_hora,
            b.fecha_salida,
            b.ip_address
        FROM bitacora_accesos b
        JOIN conductores c ON c.id = b.conductor_id
        ORDER BY b.fecha_hora DESC
        LIMIT 100
    """)
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "usuario": r[1],
            "accion": r[2],
            "entrada": str(r[3]),
            "salida": str(r[4]) if r[4] else None,
            "ip": r[5],
        }
        for r in rows
    ]


# =========================================
# 📂 AUDITORÍA GENERAL
# =========================================
@router.get("/auditoria")
def get_auditoria(
    current_user=Depends(require_role("admin", "supervisor")),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "auditoria", "ver")

    cursor = db.cursor()
    cursor.execute("""
        SELECT 
            a.id,
            c.nickname,
            a.tabla_afectada,
            a.accion,
            a.fecha_accion,
            a.ip_address
        FROM auditoria_general a
        LEFT JOIN conductores c ON c.id = a.conductor_id
        ORDER BY a.fecha_accion DESC
        LIMIT 100
    """)
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "usuario": r[1],
            "tabla": r[2],
            "accion": r[3],
            "fecha": str(r[4]),
            "ip": r[5],
        }
        for r in rows
    ]


# =========================================
# 📸 EVIDENCIAS (ADMIN)
# =========================================
@router.get("/evidencias")
def get_all_evidences(
    current_user=Depends(require_role("admin", "supervisor")),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "evidencias", "ver")

    cursor = db.cursor()
    cursor.execute("""
        SELECT 
            e.id,
            c.nickname,
            e.tipo_evidencia,
            e.nombre_archivo,
            e.fecha_subida,
            e.es_principal,
            e.estado
        FROM evidencias_conductor e
        JOIN conductores c ON c.id = e.conductor_id
        ORDER BY e.fecha_subida DESC
        LIMIT 100
    """)
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


# =========================================
# ⚠️ ERRORES DEL COMPILADOR
# =========================================
@router.get("/errores")
def get_compiler_errors(
    current_user=Depends(require_role("admin", "supervisor")),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "reportes", "ver")

    cursor = db.cursor()
    cursor.execute("""
        SELECT 
            ec.id,
            c.nickname,
            ec.tipo_error,
            ec.mensaje_error,
            ec.severidad,
            ec.fecha_error
        FROM errores_compilador ec
        JOIN conductores c ON c.id = ec.conductor_id
        ORDER BY ec.fecha_error DESC
        LIMIT 100
    """)
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


# =========================================
# 🪪 CREDENCIALES GENERADAS
# =========================================
@router.get("/credenciales")
def get_credentials(
    current_user=Depends(require_role("admin", "supervisor")),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "credenciales", "ver")

    cursor = db.cursor()
    cursor.execute("""
        SELECT 
            cp.id,
            c.nickname,
            cp.codigo_credencial,
            cp.fecha_generacion,
            cp.estado,
            cp.enviado_email,
            cp.enviado_whatsapp
        FROM credenciales_pdf cp
        JOIN conductores c ON c.id = cp.conductor_id
        ORDER BY cp.fecha_generacion DESC
        LIMIT 100
    """)
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