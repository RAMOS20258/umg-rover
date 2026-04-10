from typing import Any, Dict, Optional
from datetime import datetime
from sqlalchemy import text

from app.utils.hash_utils import sha256_file_bytes


def _row_to_dict(row: Any) -> Dict[str, Any]:
    if row is None:
        return {}
    try:
        return dict(row._mapping)
    except Exception:
        return dict(row)


# ===============================
# 🔎 BUSCAR POR CÓDIGO
# ===============================
def get_credential_by_code(db, codigo: str) -> Optional[Dict[str, Any]]:
    sql = text("""
        SELECT
            cp.id,
            cp.conductor_id,
            cp.codigo_credencial,
            cp.hash_documento,
            cp.fecha_generacion,
            cp.estado,
            cp.nombre_archivo,
            c.nombres,
            c.apellidos
        FROM credenciales_pdf cp
        LEFT JOIN conductores c ON c.id = cp.conductor_id
        WHERE cp.codigo_credencial = :codigo
        LIMIT 1
    """)

    row = db.execute(sql, {"codigo": codigo}).fetchone()
    if not row:
        return None

    return _row_to_dict(row)


# ===============================
# 🔎 BUSCAR POR ID
# ===============================
def get_credential_by_id(db, credencial_id: int) -> Optional[Dict[str, Any]]:
    sql = text("""
        SELECT
            cp.id,
            cp.conductor_id,
            cp.codigo_credencial,
            cp.hash_documento,
            cp.fecha_generacion,
            cp.estado,
            cp.nombre_archivo,
            c.nombres,
            c.apellidos
        FROM credenciales_pdf cp
        LEFT JOIN conductores c ON c.id = cp.conductor_id
        WHERE cp.id = :id
        LIMIT 1
    """)

    row = db.execute(sql, {"id": credencial_id}).fetchone()
    if not row:
        return None

    return _row_to_dict(row)


# ===============================
# 👤 NOMBRE COMPLETO
# ===============================
def build_full_name(data: Dict[str, Any]) -> str:
    return f"{data.get('nombres','')} {data.get('apellidos','')}".strip()


# ===============================
# 🕒 FORMATO FECHA
# ===============================
def format_date(value):
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return str(value)


# ===============================
# 📄 VALIDACIÓN SIN PDF
# ===============================
def validate_record_without_pdf(record: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "valido": True,
        "mensaje": "Credencial válida encontrada",
        "credencial_id": record.get("id"),
        "conductor_id": record.get("conductor_id"),
        "codigo_validacion": record.get("codigo_credencial"),
        "nombre_conductor": build_full_name(record),

        # 🔥 SIMULACIÓN FIRMA
        "firmante": "UMG Rover - Autoridad Emisora",
        "fecha_firma": format_date(record.get("fecha_generacion")),

        "estado": record.get("estado"),
        "verification_url": f"/validar-credencial?code={record.get('codigo_credencial')}",

        "hash_registrado": record.get("hash_documento"),
        "hash_pdf": None,
        "coincide_hash": None,

        "archivo_pdf": record.get("nombre_archivo"),
        "observaciones": "Validación por código sin archivo"
    }


# ===============================
# 📂 VALIDAR PDF SUBIDO
# ===============================
def validate_uploaded_pdf_against_record(record: Dict[str, Any], pdf_bytes: bytes) -> Dict[str, Any]:
    hash_pdf = sha256_file_bytes(pdf_bytes)
    hash_bd = record.get("hash_documento")

    coincide = hash_pdf == hash_bd

    return {
        "valido": coincide,
        "mensaje": "PDF válido" if coincide else "PDF NO válido",

        "credencial_id": record.get("id"),
        "conductor_id": record.get("conductor_id"),
        "codigo_validacion": record.get("codigo_credencial"),
        "nombre_conductor": build_full_name(record),

        "firmante": "UMG Rover - Autoridad Emisora",
        "fecha_firma": format_date(record.get("fecha_generacion")),

        "estado": record.get("estado"),
        "verification_url": f"/validar-credencial?code={record.get('codigo_credencial')}",

        "hash_registrado": hash_bd,
        "hash_pdf": hash_pdf,
        "coincide_hash": coincide,

        "archivo_pdf": record.get("nombre_archivo"),
        "observaciones": "Hash coincide" if coincide else "El documento fue alterado"
    }