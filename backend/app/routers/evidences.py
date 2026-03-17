import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.evidence import EvidenceCreate
from app.services.audit_service import log_audit
from app.services.evidence_service import save_file_from_base64
from app.services.permission_service import ensure_module_permission

router = APIRouter(prefix="/evidencias", tags=["Evidencias"])


def _get_client_meta(request: Request):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent


@router.post("/")
def create_evidence(
    data: EvidenceCreate,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "evidencias", "crear")

    cursor = db.cursor()
    evidence_id = str(uuid.uuid4())
    ip_address, user_agent = _get_client_meta(request)

    try:
        file_path = None

        if data.archivo_base64:
            file_path = save_file_from_base64(
                data.archivo_base64,
                data.nombre_archivo,
            )

        if data.es_principal:
            cursor.execute(
                """
                UPDATE evidencias_conductor
                SET es_principal = 0
                WHERE conductor_id = %s
                """,
                (current_user["sub"],),
            )

        cursor.execute(
            """
            INSERT INTO evidencias_conductor (
                id,
                conductor_id,
                tipo_evidencia,
                nombre_archivo,
                ruta_archivo,
                archivo_base64,
                descripcion,
                fecha_captura,
                fecha_subida,
                es_principal,
                estado
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, 'ACTIVA')
            """,
            (
                evidence_id,
                current_user["sub"],
                data.tipo_evidencia,
                data.nombre_archivo,
                file_path,
                data.archivo_base64,
                data.descripcion,
                data.fecha_captura,
                1 if data.es_principal else 0,
            ),
        )

        log_audit(
            db=db,
            conductor_id=current_user["sub"],
            tabla_afectada="evidencias_conductor",
            registro_id=evidence_id,
            accion="INSERT",
            datos_nuevos={
                "tipo": data.tipo_evidencia,
                "nombre": data.nombre_archivo,
                "principal": data.es_principal,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            observaciones="Nueva evidencia subida",
        )

        db.commit()
        return {"message": "Evidencia guardada", "id": evidence_id}

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar evidencia: {exc}")


@router.get("/mis-evidencias")
def get_my_evidences(current_user=Depends(get_current_user), db=Depends(get_db)):
    ensure_module_permission(db, current_user, "evidencias", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT
            id,
            tipo_evidencia,
            nombre_archivo,
            descripcion,
            fecha_subida,
            es_principal,
            estado
        FROM evidencias_conductor
        WHERE conductor_id = %s
          AND estado = 'ACTIVA'
        ORDER BY fecha_subida DESC
        """,
        (current_user["sub"],),
    )

    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "tipo_evidencia": r[1],
            "nombre_archivo": r[2],
            "descripcion": r[3],
            "fecha_subida": str(r[4]),
            "es_principal": bool(r[5]),
            "estado": r[6],
        }
        for r in rows
    ]


@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: str,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "evidencias", "eliminar")

    cursor = db.cursor()
    ip_address, user_agent = _get_client_meta(request)

    cursor.execute(
        """
        SELECT id
        FROM evidencias_conductor
        WHERE id = %s AND conductor_id = %s
        """,
        (evidence_id, current_user["sub"]),
    )

    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")

    try:
        cursor.execute(
            """
            UPDATE evidencias_conductor
            SET estado = 'INACTIVA'
            WHERE id = %s
            """,
            (evidence_id,),
        )

        log_audit(
            db=db,
            conductor_id=current_user["sub"],
            tabla_afectada="evidencias_conductor",
            registro_id=evidence_id,
            accion="DELETE",
            ip_address=ip_address,
            user_agent=user_agent,
            observaciones="Evidencia desactivada",
        )

        db.commit()
        return {"message": "Evidencia eliminada"}

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar evidencia: {exc}")


@router.put("/{evidence_id}/principal")
def set_main_evidence(
    evidence_id: str,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "evidencias", "editar")

    cursor = db.cursor()
    ip_address, user_agent = _get_client_meta(request)

    try:
        cursor.execute(
            """
            SELECT id
            FROM evidencias_conductor
            WHERE id = %s
              AND conductor_id = %s
              AND estado = 'ACTIVA'
            LIMIT 1
            """,
            (evidence_id, current_user["sub"]),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Evidencia no encontrada")

        cursor.execute(
            """
            UPDATE evidencias_conductor
            SET es_principal = 0
            WHERE conductor_id = %s
            """,
            (current_user["sub"],),
        )

        cursor.execute(
            """
            UPDATE evidencias_conductor
            SET es_principal = 1
            WHERE id = %s AND conductor_id = %s
            """,
            (evidence_id, current_user["sub"]),
        )

        log_audit(
            db=db,
            conductor_id=current_user["sub"],
            tabla_afectada="evidencias_conductor",
            registro_id=evidence_id,
            accion="UPDATE",
            datos_nuevos={"es_principal": True},
            ip_address=ip_address,
            user_agent=user_agent,
            observaciones="Cambio de evidencia principal",
        )

        db.commit()
        return {"message": "Evidencia principal actualizada"}

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar evidencia principal: {exc}")