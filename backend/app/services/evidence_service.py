import base64
from pathlib import Path
import uuid

from app.core.config import EVIDENCES_DIR


def save_file_from_base64(base64_data: str, filename: str) -> str:
    if not base64_data:
        return None

    clean = base64_data.split(",")[-1]

    file_bytes = base64.b64decode(clean)

    ext = filename.split(".")[-1] if "." in filename else "bin"
    unique_name = f"{uuid.uuid4()}.{ext}"

    file_path = EVIDENCES_DIR / unique_name
    file_path.write_bytes(file_bytes)

    return str(file_path)