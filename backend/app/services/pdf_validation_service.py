from typing import Any, Dict, Optional
from datetime import datetime

from app.utils.hash_utils import sha256_file_bytes


def _row_to_dict(row: Any) -> Dict[str, Any]:
    if row is None:
        return {}

    if isinstance(row, dict):
        return row

    try:
        return dict(row)
    except Exception:
        pass

    try:
        return dict(row._mapping)
    except Exception:
        pass

    return {}


def _execute_fetchone(db, sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """
    Ejecuta un SELECT y devuelve un registro como dict.

    Compatible con:
    - cursor PyMySQL
    - conexión PyMySQL (crea cursor temporal)
    """
    cursor = None
    created_cursor = False

    try:
        # Si db ya es cursor
        if hasattr(db, "fetchone") and hasattr(db, "execute"):
            cursor = db

        # Si db es conexión
        elif hasattr(db, "cursor"):
            cursor = db.cursor()
            created_cursor = True

        else:
            raise ValueError("El objeto db no es una conexión ni cursor válido")

        cursor.execute(sql, params)
        row = cursor.fetchone()

        if not row:
            return None

        return _row_to_dict(row)

    finally:
        if created_cursor and cursor:
            try:
                cursor.close()
            except Exception:
                pass


# ===============================
# 🔎 BUSCAR POR CÓDIGO
# ===============================
def get_credential_by_code(db, codigo: str) -> Optional[Dict[str, Any]]:
    sql = """
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
        WHERE cp.codigo_credencial = %s
        LIMIT 1
    """

    return _execute_fetchone(db, sql, (codigo,))


# ===============================
# 🔎 BUSCAR POR ID
# ===============================
def get_credential_by_id(db, credencial_id: str) -> Optional[Dict[str, Any]]:
    sql = """
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
        WHERE cp.id = %s
        LIMIT 1
    """

    return _execute_fetchone(db, sql, (credencial_id,))


# ===============================
# 👤 NOMBRE COMPLETO
# ===============================
def build_full_name(data: Dict[str, Any]) -> str:
    nombres = str(data.get("nombres", "") or "").strip()
    apellidos = str(data.get("apellidos", "") or "").strip()
    return f"{nombres} {apellidos}".strip()


# ===============================
# 🕒 FORMATO FECHA
# ===============================
def format_date(value: Any) -> Optional[str]:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")

    return str(value)


# ===============================
# 📄 VALIDACIÓN SIN PDF
# ===============================
def validate_record_without_pdf(record: Dict[str, Any]) -> Dict[str, Any]:
    codigo = record.get("codigo_credencial")

    return {
        "valido": True,
        "mensaje": "Credencial válida encontrada",
        "credencial_id": record.get("id"),
        "conductor_id": record.get("conductor_id"),
        "codigo_validacion": codigo,
        "nombre_conductor": build_full_name(record),

        # Firma interna del sistema
        "firmante": "UMG Rover - Autoridad Emisora",
        "fecha_firma": format_date(record.get("fecha_generacion")),

        "estado": record.get("estado"),
        "verification_url": f"/validar-credencial?code={codigo}",

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
    codigo = record.get("codigo_credencial")

    return {
        "valido": coincide,
        "mensaje": "PDF válido" if coincide else "PDF NO válido",

        "credencial_id": record.get("id"),
        "conductor_id": record.get("conductor_id"),
        "codigo_validacion": codigo,
        "nombre_conductor": build_full_name(record),

        "firmante": "UMG Rover - Autoridad Emisora",
        "fecha_firma": format_date(record.get("fecha_generacion")),

        "estado": record.get("estado"),
        "verification_url": f"/validar-credencial?code={codigo}",

        "hash_registrado": hash_bd,
        "hash_pdf": hash_pdf,
        "coincide_hash": coincide,

        "archivo_pdf": record.get("nombre_archivo"),
        "observaciones": "Hash coincide" if coincide else "El documento fue alterado"
    }