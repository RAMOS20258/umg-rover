import json
import uuid
from datetime import datetime


def _safe_json(data):
    if data is None:
        return None

    if isinstance(data, str):
        return data

    try:
        return json.dumps(data, ensure_ascii=False, default=str)
    except Exception:
        return str(data)


def log_audit(
    db,
    conductor_id: str | None,
    tabla_afectada: str,
    registro_id: str,
    accion: str,
    datos_anteriores=None,
    datos_nuevos=None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    observaciones: str | None = None,
):
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO auditoria_general (
            id,
            conductor_id,
            tabla_afectada,
            registro_id,
            accion,
            datos_anteriores,
            datos_nuevos,
            fecha_evento,
            ip_address,
            user_agent,
            observaciones
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            str(uuid.uuid4()),
            conductor_id,
            tabla_afectada,
            registro_id,
            accion,
            _safe_json(datos_anteriores),
            _safe_json(datos_nuevos),
            datetime.now(),
            ip_address,
            user_agent,
            observaciones,
        ),
    )