from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def _ensure_admin(current_user):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Acceso denegado")

@router.get("/accesos")
async def get_accesos(current_user=Depends(get_current_user), db=Depends(get_db)):
    _ensure_admin(current_user)
    cursor = db.cursor()
    cursor.execute("""
        SELECT b.id, c.nickname, c.avatar_base64, b.fecha_hora, b.fecha_salida, b.accion
        FROM bitacora_accesos b
        JOIN conductores c ON c.id = b.conductor_id
        WHERE b.accion = 'LOGIN'
        ORDER BY b.fecha_hora DESC
    """)
    rows = cursor.fetchall()
    return [{"id": r[0], "nickname": r[1], "avatar": r[2], "ingreso": str(r[3]), "salida": str(r[4]) if r[4] else None} for r in rows]

@router.get("/conductores")
async def get_conductores(current_user=Depends(get_current_user), db=Depends(get_db)):
    _ensure_admin(current_user)
    cursor = db.cursor()
    cursor.execute("SELECT id, nickname, avatar_base64, email, created_at FROM conductores ORDER BY created_at DESC")
    rows = cursor.fetchall()
    return [{"id": r[0], "nickname": r[1], "avatar": r[2], "email": r[3], "created_at": str(r[4])} for r in rows]

@router.get("/stats")
async def get_stats(current_user=Depends(get_current_user), db=Depends(get_db)):
    _ensure_admin(current_user)
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM conductores")
    total_users = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM bitacora_accesos WHERE accion='LOGIN' AND CAST(fecha_hora AS DATE)=CAST(GETDATE() AS DATE)")
    logins_today = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM programas")
    total_programs = cursor.fetchone()[0]
    return {"total_users": total_users, "logins_today": logins_today, "total_programs": total_programs}
