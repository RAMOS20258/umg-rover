import hashlib
from typing import BinaryIO


def sha256_bytes(data: bytes) -> str:
    """
    Genera hash SHA-256 a partir de bytes.
    """
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    """
    Genera hash SHA-256 a partir de texto.
    """
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_file_object(file_obj: BinaryIO) -> str:
    """
    Genera hash SHA-256 leyendo un archivo abierto en binario.
    """
    file_obj.seek(0)
    hasher = hashlib.sha256()

    for chunk in iter(lambda: file_obj.read(8192), b""):
        hasher.update(chunk)

    file_obj.seek(0)
    return hasher.hexdigest()


def sha256_file_bytes(file_bytes: bytes) -> str:
    """
    Genera hash SHA-256 a partir de bytes de archivo.
    """
    return hashlib.sha256(file_bytes).hexdigest()


def shorten_hash(hash_value: str, start: int = 12, end: int = 12) -> str:
    """
    Acorta un hash para mostrarlo visualmente en el PDF o frontend.
    """
    if not hash_value:
        return ""
    if len(hash_value) <= (start + end):
        return hash_value
    return f"{hash_value[:start]}...{hash_value[-end:]}"